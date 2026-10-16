"""Check encoder-only firmware math on a computer without connecting hardware."""

from pathlib import Path
import re
import subprocess
import tempfile

source = (Path(__file__).resolve().parents[1] / 'wemos_lilon32/wemos_lilon32.ino').read_text()


def function(name: str) -> str:
    """Extract a firmware function so checks use the implementation itself."""
    match = re.search(r'^(?:float|bool|int) ' + name + r'\([^)]*\) \{', source, re.M)
    assert match, name
    depth = 1
    end = match.end()
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[match.start():end]


assert 'updateAzimuthReference(' not in source
assert 'azEncoderOffset' not in source
assert 'ref ENC %s' in source

constants = []
for name in ('AZ_ENCODER_MIN', 'AZ_ENCODER_MAX', 'AZ_ENCODER_OFFSET', 'AZ_TOLERANCE', 'AZ_ENCODER_SAMPLES', 'AZ_ENCODER_SMOOTHING', 'AZ_ENCODER_PIN'):
    constants.append(re.search(r'^const (?:float|int) ' + name + r' = [^;]+;', source, re.M)[0])

program = '''
#include <cmath>
#include <cassert>
#include <iostream>
#include <limits>
using std::isfinite;
const int HIGH = 1;
const int LOW = 0;
float azEncoderAngle = 0.0;
bool azEncoderReady = false;
unsigned long testHigh = 0;
unsigned long testLow = 0;
unsigned long pulseIn(int, int state, unsigned long) {
  return state == HIGH ? testHigh : testLow;
}
'''
program += '\n'.join(constants) + '\n'
for name in ('norm360', 'cwDistance', 'signedAngleDifference', 'encoderToTrueAzimuth', 'trueAzimuthToEncoder', 'inAzimuthNoGoZone', 'chooseDirection', 'readAzEncoderAngle'):
    program += function(name) + '\n'

program += '''
float sample(float degrees) {
  testHigh = (unsigned long)std::lround(degrees * 10);
  testLow = 3600 - testHigh;
  return readAzEncoderAngle();
}

int main() {
  assert(AZ_ENCODER_OFFSET == 0);
  assert(std::fabs(AZ_ENCODER_MIN - 137.8f) < 0.001);
  assert(std::fabs(AZ_ENCODER_MAX - 37.8f) < 0.001);
  for (float target : {150.0f, 170.0f, 190.0f, 250.0f, 350.0f, 20.0f, 0.0f, 360.0f}) {
    assert(!inAzimuthNoGoZone(trueAzimuthToEncoder(target)));
    assert(chooseDirection(AZ_ENCODER_MIN, target) == 1);
    assert(chooseDirection(AZ_ENCODER_MAX, target) == -1);
  }
  for (float target : {50.0f, 100.0f, 132.3794f, 40.0f, 137.7f}) {
    assert(inAzimuthNoGoZone(trueAzimuthToEncoder(target)));
    assert(chooseDirection(170, target) == 0);
  }
  assert(chooseDirection(137.8f, 130.3f) == 0);
  assert(chooseDirection(209.7f, 253.7f) == 1);
  assert(chooseDirection(250, 20) == 1);
  assert(chooseDirection(20, 250) == -1);
  assert(chooseDirection(350, 20) == 1);
  assert(chooseDirection(20, 350) == -1);
  assert(chooseDirection(140, 30) == 1);
  assert(chooseDirection(30, 140) == -1);
  assert(chooseDirection(AZ_ENCODER_MIN - 0.05f, 150) == 1);
  assert(chooseDirection(AZ_ENCODER_MAX + 0.05f, 190) == -1);
  assert(chooseDirection(AZ_ENCODER_MIN - AZ_TOLERANCE - 0.1f, 150) == 0);
  assert(chooseDirection(AZ_ENCODER_MAX + AZ_TOLERANCE + 0.1f, 190) == 0);
  assert(!inAzimuthNoGoZone(AZ_ENCODER_MIN));
  assert(!inAzimuthNoGoZone(AZ_ENCODER_MAX));
  assert(chooseDirection(std::numeric_limits<float>::quiet_NaN(), 170) == 0);
  assert(chooseDirection(170, std::numeric_limits<float>::infinity()) == 0);

  int cases = 0;
  for (int current = 0; current < 360; current++) {
    for (int target = 0; target < 360; target++) {
      assert(encoderToTrueAzimuth(current) == current);
      assert(trueAzimuthToEncoder(target) == target);
      int direction = chooseDirection(current, target);
      bool validTarget = target >= AZ_ENCODER_MIN || target <= AZ_ENCODER_MAX;
      bool validCurrent = current >= AZ_ENCODER_MIN || current <= AZ_ENCODER_MAX;
      if (!validTarget) assert(direction == 0);
      else if (!validCurrent) {
        if (AZ_ENCODER_MIN - current <= AZ_TOLERANCE) assert(direction == 1);
        else if (current - AZ_ENCODER_MAX <= AZ_TOLERANCE) assert(direction == -1);
        else assert(direction == 0);
      } else {
        assert(direction != 0);
        float distance = direction > 0 ? cwDistance(current, target) : cwDistance(target, current);
        for (float step = 0; step < distance; step += 0.5f) {
          float position = norm360(current + direction * step);
          assert(position >= AZ_ENCODER_MIN || position <= AZ_ENCODER_MAX);
        }
      }
      cases++;
    }
  }

  assert(std::fabs(sample(137.8f) - 137.8f) < 0.01);
  azEncoderAngle = 359;
  assert(std::fabs(sample(1)) < 0.01);
  azEncoderAngle = 1;
  assert(std::fabs(sample(359)) < 0.01);
  azEncoderAngle = 170;
  assert(std::fabs(sample(174) - 172) < 0.01);
  std::cout << "PASS: wrapped encoder-only range, 8 interior/end targets, blocked gap, inward boundary-noise recovery, "
            << cases << " direction pairs and circular smoothing" << std::endl;
}
'''

with tempfile.TemporaryDirectory(prefix='astt-encoder-test-') as directory:
    executable = str(Path(directory) / 'encoder-test')
    subprocess.run(['g++', '-std=c++17', '-Wall', '-Wextra', '-Werror', '-x', 'c++', '-o', executable, '-'], input=program, text=True, check=True)
    subprocess.run([executable], check=True)
