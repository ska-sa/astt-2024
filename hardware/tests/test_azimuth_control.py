"""Check manual/compass AZ reference, sensor retries, and motion guards without hardware."""

from pathlib import Path
import os
import re
import subprocess
import tempfile

source = (Path(__file__).resolve().parents[1] / 'wemos_lilon32/wemos_lilon32.ino').read_text()
json_include = Path(os.environ.get('ARDUINO_JSON_INCLUDE', Path.home() / 'Arduino/libraries/ArduinoJson/src'))
assert (json_include / 'ArduinoJson.h').is_file(), 'Set ARDUINO_JSON_INCLUDE to the ArduinoJson src directory'


def function(name: str) -> str:
    """Extract the actual firmware function for the host checks."""
    match = re.search(r'^(?:float|bool|int|void|String) ' + name + r'\([^)]*\) \{', source, re.M)
    assert match, name
    depth = 1
    end = match.end()
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[match.start():end]


for obsolete in ('MagCalibration', 'Preferences', 'AZ_COMPASS_TEST_MODE', 'MAG_MOUNTING_VERIFIED'):
    assert obsolete not in source
assert 'publishAzimuthReference' not in function('startPoint')
assert 'doc["serial_log"] = serialLog;' in function('postReadings')
assert 'Serial.println(serialLog);' in function('updateDiagnostics')
assert function('readSensors').count('readAzEncoderAngle()') == 1
assert 'encoderToTrueAzimuth(azEncoderAngle)' in function('readSensors')
setup = function('setup')
assert setup.index('azEncoderOffset = norm360(-encoderAtNorth)') < setup.index('readAzEncoderAngle()')
assert source.count('void setup()') == source.count('void loop()') == 1
assert source.count('Wire.begin(I2C_SDA, I2C_SCL)') == 1
assert source.count('SFE_MMC5983MA myMag;') == 1
loop = function('loop')
estop_branch = loop[loop.index('  if (estopActive) {'):loop.index('\n  if (estopWasActive) {')]
assert 'receiveNetworkReply(true);' in estop_branch
assert 'serviceNetwork(millis(), true);' in estop_branch
assert 'updateDiagnostics(now, azEncoderAngle, -1.0f, 0, 0, 0);' in estop_branch
for stop in ('stopAzimuthMotor();', 'stopElevationMotor();'):
    assert stop in function('latchEmergencyStop')
    assert stop not in function('serviceNetwork')
assert estop_branch.index('latchEmergencyStop();') < estop_branch.index('readSensors();')
assert loop.index('expireCommand(millis());') < loop.index('receiveNetworkReply(false);')
assert loop.index('commandMessage = "FEEDBACK_LOST_SEND_NEW_COMMAND";') < loop.index('receiveNetworkReply(false);')
assert loop.index('receiveNetworkReply(false);') < loop.index('now = millis();', loop.index('receiveNetworkReply(false);'))
assert 'networkGeneration++;' in function('latchEmergencyStop')
release = loop[loop.index('\n  if (estopWasActive) {'):loop.index('  estopWasActive = false;')]
assert 'networkGeneration++;' in release
for blocking in ('HTTPClient', 'WiFiClient', 'postReadings()', 'publishAzimuthReference()', '.GET(', '.POST(', '.PUT('):
    assert blocking not in loop
worker = function('networkWorker')
for owned_by_loop in ('stopAzimuthMotor', 'stopElevationMotor', 'readSensors', 'Wire.', 'Serial.',
                      'apiAzTarget', 'azPointActive', 'serialLog', 'azEncoderOffset', 'commandMessage'):
    assert owned_by_loop not in worker
assert 'readNetworkBody(http, reply.body, sizeof(reply.body))' in worker
assert 'measureJson(telescope) >= sizeof(reply.body)' in worker
assert 'response.length() >= capacity' in function('readNetworkBody')
assert 'measureJson(doc) >= sizeof(request.body)' in function('queueNetworkRequest')
assert 'xQueueSend(networkRequests, &request, 0)' in function('queueNetworkRequest')

program = r'''
#include <cmath>
#include <cassert>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <ctime>
#include <deque>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
#include <ArduinoJson.h>
using std::isfinite;
using String = std::string;
const int HIGH = 1;
const int LOW = 0;
const double PI = 3.14159265358979323846;
unsigned long testMilliseconds = 0;
unsigned long millis() { return testMilliseconds; }
time_t testNow = 0;
time_t testTime(time_t* destination) {
  if (destination) *destination = testNow;
  return testNow;
}
#define time testTime
int driveCalls = 0;
int testEstopPin = HIGH;
bool estopDuringPulse = false;
int digitalRead(int) { return testEstopPin; }
void digitalWrite(int, int) {}
void analogWrite(int, int pwm) { if (pwm > 0) driveCalls++; }
struct FakeQueue {
  size_t itemSize;
  std::deque<std::vector<uint8_t>> items;
};
using QueueHandle_t = FakeQueue*;
const int pdTRUE = 1;
const int pdPASS = 1;
const unsigned long portMAX_DELAY = 0xffffffffUL;
int queueCreationCalls = 0;
int failQueueCreationAt = 0;
bool taskCreationOk = true;
QueueHandle_t xQueueCreate(int, size_t itemSize) {
  queueCreationCalls++;
  if (queueCreationCalls == failQueueCreationAt) return nullptr;
  return new FakeQueue{itemSize, {}};
}
void vQueueDelete(QueueHandle_t queue) { delete queue; }
int xQueueSend(QueueHandle_t queue, const void* item, unsigned long wait) {
  assert(wait == 0 || wait == portMAX_DELAY);
  if (!queue || !queue->items.empty()) return 0;
  const auto* bytes = static_cast<const uint8_t*>(item);
  queue->items.emplace_back(bytes, bytes + queue->itemSize);
  return pdTRUE;
}
int xQueueReceive(QueueHandle_t queue, void* item, unsigned long wait) {
  assert(wait == 0);
  if (!queue || queue->items.empty()) return 0;
  std::memcpy(item, queue->items.front().data(), queue->itemSize);
  queue->items.pop_front();
  return pdTRUE;
}
void networkWorker(void*) {} // Real worker ownership and bounded I/O checked above.
int xTaskCreatePinnedToCore(void (*)(void*), const char*, int, void*, int, void*, int) {
  return taskCreationOk ? pdPASS : 0;
}
int sensorReadCalls = 0;
bool testMpuOk = false;
bool testElMpuOk = false;
void readGPS() { sensorReadCalls++; }
bool readMpu() { return testMpuOk; }
bool readElevationMpu() { return testElMpuOk; }
void updateLevelAngles() {}
void delay(int) {}
unsigned long testHigh = 0;
unsigned long testLow = 0;
unsigned long pulseIn(int, int state, unsigned long) {
  if (estopDuringPulse) testEstopPin = LOW;
  return state == HIGH ? testHigh : testLow;
}
float trackEl = 0;
float computeAzFromSource() { return 220; }
struct SerialStub {
  std::vector<String> lines;
  void println(const String& value) { lines.push_back(value); }
} Serial;
struct { bool fix = false; } GPS;
struct FakeWire {} Wire;
struct FakeMag {
  bool beginOk = true;
  bool resetOk = true;
  bool measurementOk = true;
  bool automaticOk = true;
  bool filterOk = true;
  bool frequencyOk = true;
  bool continuousOk = true;
  bool connected = true;
  int beginCalls = 0;
  int automaticCalls = 0;
  int readCalls = 0;
  uint32_t x = 141072, y = 131072, z = 131072;
  bool begin(FakeWire&) { beginCalls++; return beginOk; }
  bool softReset() { return resetOk; }
  bool enableAutomaticSetReset() { automaticCalls++; return automaticOk; }
  bool setFilterBandwidth(int bandwidth) { assert(bandwidth == 100); return filterOk; }
  bool setContinuousModeFrequency(int frequency) { assert(frequency == 20); return frequencyOk; }
  bool enableContinuousMode() { return continuousOk; }
  bool isConnected() { return connected; }
  bool readFieldsXYZ(uint32_t* rawX, uint32_t* rawY, uint32_t* rawZ) {
    readCalls++;
    if (!measurementOk) return false;
    *rawX = x; *rawY = y; *rawZ = z;
    return true;
  }
} myMag;
'''
for name in ('AZ_MIN', 'AZ_MAX', 'EL_MIN', 'EL_MAX', 'AZ_ENCODER_MIN', 'AZ_ENCODER_MAX', 'AZ_ENCODER_OFFSET', 'AZ_TOLERANCE', 'AZ_RAMP_RANGE', 'AZ_MIN_PWM', 'AZ_MAX_PWM', 'EL_TOLERANCE', 'EL_RAMP_RANGE', 'EL_MIN_PWM', 'EL_MAX_PWM', 'AZ_ENCODER_SAMPLES', 'AZ_ENCODER_SMOOTHING', 'AZ_ENCODER_PIN', 'ESTOP_PIN', 'SOURCE_TIMEOUT', 'POST_INTERVAL', 'POLL_INTERVAL', 'MAG_MOUNTING_OFFSET_DEG', 'AZ_IN1', 'AZ_IN2', 'AZ_ENA', 'EL_IN1', 'EL_IN2', 'EL_ENA'):
    program += re.search(r'^const (?:float|int|unsigned long) ' + name + r' = [^;]+;', source, re.M)[0] + '\n'
# Only the copied mode flag is mutable, so both supported configurations use the same real functions.
program += re.search(r'^const bool USE_MANUAL_AZ_REFERENCE = [^;]+;', source, re.M)[0].replace('const ', '', 1) + '\n'
program += re.search(r'^const float encoderAtNorth = [^;]+;', source, re.M)[0] + '\n'
for name in ('magLastAttempt', 'magInitializedAt'):
    program += re.search(r'^unsigned long ' + name + r' = [^;]+;', source, re.M)[0] + '\n'
program += source[source.index('enum class NetworkOperation'):source.index('// ---------- readings sent to backend ----------')]
for name in ('azEncoderAngle', 'azEncoderReady', 'azEncoderValid', 'azEncoderOffset', 'azNorthReferenceReady', 'azHeadingValid', 'azMotorStopped', 'elMotorStopped', 'movementStatus', 'healthStatus', 'serialLog', 'commandMessage', 'apiAzTarget', 'apiElTarget', 'lastApiTime', 'startupCommandId', 'lastCommandId', 'commandBaselineReady', 'azPointActive', 'azPointComplete', 'isTracking', 'estopWasActive', 'magOk', 'magneticSampleValid', 'mpuOk', 'elMpuOk', 'magneticFieldX', 'magneticFieldY', 'magneticFieldZ', 'magneticHeading', 'declination', 'trueHeading', 'mpuAccelX', 'mpuAccelY', 'mpuAccelZ', 'mpuGyroX', 'mpuGyroY', 'mpuGyroZ', 'levelRoll', 'levelPitch', 'latitude', 'longitude', 'altitude', 'azimuthAngle', 'elevationAngle', 'lastCommandHttp', 'lastReadingHttp', 'lastMetadataHttp', 'lastDiagnosticTime', 'lastPostTime', 'lastPollTime', 'telescopeId', 'track_m1', 'track_c1', 'track_T_ra', 'track_A'):
    program += re.search(r'^(?:float|bool|String|int|unsigned long) ' + name + r' = [^;]+;', source, re.M)[0] + '\n'
for name in ('magneticDeclination', 'currentDecimalYear', 'norm360', 'cwDistance', 'signedAngleDifference', 'encoderToTrueAzimuth', 'trueAzimuthToEncoder', 'inAzimuthNoGoZone', 'chooseDirection', 'readAzEncoderAngle', 'setAzimuthReference', 'checkAzimuthFeedback', 'initializeMagnetometer', 'ensureMagnetometerReady', 'readMagneticField', 'computeTrueHeading', 'stopAzimuthMotor', 'stopElevationMotor', 'driveAzimuthMotor', 'driveElevationMotor', 'computeAzimuthPwm', 'computeElevationPwm', 'acceptCommandId', 'clearCommandTargets', 'latchEmergencyStop', 'expireCommand', 'finishAzPoint', 'startPoint', 'startNetworkWorker', 'queueNetworkRequest', 'publishAzimuthReference', 'updateHealthStatus', 'readSensors', 'buildDiagnosticLine', 'updateDiagnostics', 'postReadings', 'applyCommandReply', 'receiveNetworkReply', 'serviceNetwork'):
    program += function(name) + '\n'
control = source[source.index('  bool azTargetFresh ='):source.index('  bool elTargetFresh =')]
feedback = loop[loop.index('  if ((!networkReady || !azNorthReferenceReady || !azEncoderValid)'):loop.index('  receiveNetworkReply(false);')]
program += '\nvoid runAzimuthControl(float azCurrent, unsigned long now) {\n' + feedback + control + '\n}\n'
program += '\nvoid runEstopControl() {\n  unsigned long now = millis();\n  bool estopActive = true;\n' + estop_branch + '\n}\n'
program += loop + '\n'
program += r'''
#undef time
time_t utcTimestamp(int year, int month, int day, int hour = 0) {
  std::tm utc{};
  utc.tm_year = year - 1900; utc.tm_mon = month - 1; utc.tm_mday = day; utc.tm_hour = hour;
  return timegm(&utc);
}
void reset() {
  clearCommandTargets();
  USE_MANUAL_AZ_REFERENCE = false;
  if (networkRequests) vQueueDelete(networkRequests);
  if (networkReplies) vQueueDelete(networkReplies);
  failQueueCreationAt = 0; taskCreationOk = true;
  networkRequests = xQueueCreate(1, sizeof(NetworkRequest));
  networkReplies = xQueueCreate(1, sizeof(NetworkReply));
  networkReady = true; networkInFlight = metadataPending = false; networkGeneration = 0;
  lastPollTime = lastPostTime = 10000;
  azEncoderOffset = AZ_ENCODER_OFFSET;
  azEncoderReady = azEncoderValid = azHeadingValid = true;
  azNorthReferenceReady = false;
  commandBaselineReady = true;
  startupCommandId = lastCommandId = 0;
  lastApiTime = 1234;
  testMilliseconds = 10000;
  testEstopPin = HIGH; estopDuringPulse = false;
  testHigh = 1700; testLow = 1900;
  testNow = utcTimestamp(2026, 7, 2, 12);
  declination = magneticDeclination(currentDecimalYear());
  magOk = true; mpuOk = elMpuOk = false; GPS.fix = false;
  magLastAttempt = magInitializedAt = 0;
  magneticSampleValid = false;
  estopWasActive = false;
  levelRoll = levelPitch = NAN;
  movementStatus = "IDLE";
  trueHeading = 57.25f;
  myMag = FakeMag{};
}
NetworkRequest takeRequest() {
  NetworkRequest request{};
  assert(xQueueReceive(networkRequests, &request, 0) == pdTRUE);
  return request;
}
void completeRequest(const NetworkRequest& request, int status, const char* body = "") {
  NetworkReply reply{};
  reply.operation = request.operation; reply.createdAt = request.createdAt;
  reply.generation = request.generation; reply.status = status;
  assert(std::strlen(body) < sizeof(reply.body));
  std::strcpy(reply.body, body);
  assert(xQueueSend(networkReplies, &reply, 0) == pdTRUE);
}
void capture(float encoder, float heading) {
  azEncoderAngle = encoder; trueHeading = heading;
  assert(setAzimuthReference(encoder, heading));
}
void rejectedReference(float encoder, float heading) {
  float previous = azEncoderOffset;
  unsigned long previousApiTime = lastApiTime;
  assert(!setAzimuthReference(encoder, heading));
  assert(azEncoderOffset == previous && lastApiTime == previousApiTime);
}
void rejectedHeading() {
  assert(computeTrueHeading() == trueHeading);
  assert(!azHeadingValid);
  rejectedReference(170, trueHeading);
}
void testDateAndCompass() {
  for (float year : {2026.0f, 2026.5f, 2027.9f}) {
    double t = static_cast<double>(year) - 2026;
    assert(std::fabs(magneticDeclination(year)
      - ((7.015377035040e-4 * t - 0.233941835534) * t - 26.67043477086)) < 0.0001);
  }
  for (time_t unsupported : {time_t(0), utcTimestamp(2025, 12, 31), utcTimestamp(2028, 2, 29), utcTimestamp(2029, 1, 1)}) {
    testNow = unsupported;
    assert(std::isnan(currentDecimalYear()) && std::isnan(magneticDeclination(currentDecimalYear())));
  }
  assert(std::isnan(magneticDeclination(2028)) && std::isnan(magneticDeclination(NAN)));
  testNow = utcTimestamp(2026, 1, 1);
  assert(currentDecimalYear() == 2026);
  testNow = utcTimestamp(2026, 7, 2, 12);
  assert(std::fabs(currentDecimalYear() - 2026.5f) < 0.0001);
  testNow = utcTimestamp(2027, 11, 25, 12);
  assert(std::fabs(currentDecimalYear() - 2027.9f) < 0.0001);
  for (int cardinal = 0; cardinal < 4; cardinal++) {
    reset();
    myMag.x = myMag.y = myMag.z = 131072;
    if (cardinal == 0) myMag.x += 10000;
    if (cardinal == 1) myMag.y += 10000;
    if (cardinal == 2) myMag.x -= 10000;
    if (cardinal == 3) myMag.y -= 10000;
    float heading = computeTrueHeading();
    assert(azHeadingValid && magneticSampleValid && std::fabs(signedAngleDifference(norm360(cardinal * 90 + declination), heading)) < 0.001);
    assert(!mpuOk && !elMpuOk && std::isnan(levelRoll)); // deliberately no MPU dependency
  }
  reset(); myMag.measurementOk = false; rejectedHeading(); assert(!magneticSampleValid);
  reset(); magOk = false; myMag.beginOk = false; rejectedHeading(); assert(!magneticSampleValid);
  reset(); magOk = false; myMag.automaticOk = false; rejectedHeading(); assert(!magneticSampleValid);
  reset(); myMag.x = 0; rejectedHeading(); assert(!magneticSampleValid);
  reset(); myMag.y = 262143; rejectedHeading(); assert(!magneticSampleValid);
  reset(); myMag.x = myMag.y = 131072; rejectedHeading(); assert(magneticSampleValid);
  reset(); testNow = utcTimestamp(2028, 1, 1); rejectedHeading(); assert(magneticSampleValid);
  reset(); magOk = false;
  computeTrueHeading();
  assert(!azHeadingValid && magOk && myMag.automaticCalls == 1);
  testMilliseconds += 100;
  computeTrueHeading();
  assert(azHeadingValid && myMag.automaticCalls == 1);
  assert(std::fabs(magneticFieldX - 10000 * (1.0e-4f / 16384.0f)) < 1e-10);
}
void testMagnetometerStartupAndRecovery() {
  reset(); myMag.resetOk = false; assert(!initializeMagnetometer());
  reset(); myMag.filterOk = false; assert(!initializeMagnetometer());
  reset(); myMag.frequencyOk = false; assert(!initializeMagnetometer());
  reset(); myMag.continuousOk = false; assert(!initializeMagnetometer());
  reset(); myMag.measurementOk = false;
  computeTrueHeading();
  assert(!azHeadingValid && magOk && myMag.beginCalls == 0); // an available chip keeps its configuration

  reset(); magOk = false; myMag.beginOk = false;
  testMilliseconds = 999;
  assert(!ensureMagnetometerReady() && myMag.beginCalls == 0);
  testMilliseconds = 1000;
  assert(!ensureMagnetometerReady() && myMag.beginCalls == 1);
  myMag.beginOk = true;
  testMilliseconds = 1999;
  assert(!ensureMagnetometerReady() && myMag.beginCalls == 1);
  testMilliseconds = 2000;
  assert(!ensureMagnetometerReady() && magOk && myMag.beginCalls == 2);
  testMilliseconds = 2099;
  assert(!ensureMagnetometerReady());
  testMilliseconds = 2100;
  assert(ensureMagnetometerReady());
  computeTrueHeading(); assert(azHeadingValid && myMag.readCalls == 1);

  myMag.measurementOk = false; myMag.connected = false;
  float previous = trueHeading;
  assert(computeTrueHeading() == previous && !magOk && !azHeadingValid);
  myMag.measurementOk = myMag.connected = true;
  testMilliseconds = 2999;
  computeTrueHeading(); assert(myMag.beginCalls == 2 && !azHeadingValid);
  testMilliseconds = 3000;
  computeTrueHeading(); assert(myMag.beginCalls == 3 && !azHeadingValid);
  testMilliseconds = 3100;
  computeTrueHeading(); assert(azHeadingValid);
  myMag.x = 262143;
  computeTrueHeading(); assert(!azHeadingValid && magOk); // saturated counts do not require reinitialization
}
void testImmediateReference() {
  reset(); azEncoderReady = false; rejectedReference(170, 210);
  azEncoderReady = true; azEncoderValid = false; rejectedReference(170, 210);
  azEncoderValid = true; azHeadingValid = false; rejectedReference(170, 210);
  azHeadingValid = true; azMotorStopped = false; rejectedReference(170, 210);
  azMotorStopped = true; elMotorStopped = false; rejectedReference(170, 210);
  elMotorStopped = true; azPointActive = true; rejectedReference(170, 210);
  azPointActive = false; isTracking = true; rejectedReference(170, 210);
  isTracking = false; rejectedReference(NAN, 210); rejectedReference(170, NAN);
  unsigned long before = millis();
  assert(setAzimuthReference(170, 210));
  assert(millis() == before && azEncoderOffset == 40 && azNorthReferenceReady);
  assert(setAzimuthReference(170.1f, 210.2f));
  assert(std::fabs(azEncoderOffset - 40.1f) < 0.001 && azNorthReferenceReady);
  azPointActive = true; rejectedReference(180, 240);
  azPointActive = false; isTracking = true; rejectedReference(180, 240);
  isTracking = false; azMotorStopped = false; rejectedReference(180, 240);
  reset(); assert(setAzimuthReference(359.9f, 359.8f));
  assert(setAzimuthReference(0, 0.1f));
  assert(std::fabs(azEncoderOffset - 0.1f) < 0.001);
  reset(); capture(170, 0); assert(azEncoderOffset == 190);
  reset(); azEncoderReady = false; assert(!checkAzimuthFeedback() && commandMessage == "AZ_ENCODER_INVALID");
  reset(); azEncoderValid = false; assert(!checkAzimuthFeedback() && commandMessage == "AZ_ENCODER_INVALID");
  reset(); declination = NAN; assert(!checkAzimuthFeedback() && commandMessage == "DECLINATION_DATE_UNSUPPORTED_OR_UNSYNCED");
  reset(); azHeadingValid = false; assert(!checkAzimuthFeedback() && commandMessage == "MAGNETOMETER_INVALID");
  reset(); azMotorStopped = false; assert(!checkAzimuthFeedback() && commandMessage == "AZ_REFERENCE_UNAVAILABLE");
  reset(); assert(checkAzimuthFeedback() && azNorthReferenceReady);
}
void testCommands() {
  reset(); capture(170, 210);
  commandBaselineReady = false;
  assert(!acceptCommandId(0) && !commandBaselineReady);
  assert(!acceptCommandId(10));
  assert(commandBaselineReady && startupCommandId == 10 && lastCommandId == 10);
  assert(!acceptCommandId(10) && acceptCommandId(11));
  assert(startPoint(220, 45)); // no MPU or metadata PUT prerequisites
  int before = driveCalls;
  runAzimuthControl(170, millis());
  assert(driveCalls == before + 1);
  runAzimuthControl(180, millis());
  assert(azPointComplete && !azPointActive && azMotorStopped);
  before = driveCalls;
  assert(!acceptCommandId(11));
  capture(180, 230);
  azimuthAngle = encoderToTrueAzimuth(180);
  runAzimuthControl(180, millis());
  assert(driveCalls == before && azPointComplete && !azPointActive);
  assert(acceptCommandId(12)); clearCommandTargets(); assert(startPoint(220, 45));
  testMilliseconds += SOURCE_TIMEOUT - 1; expireCommand(millis()); assert(azPointActive);
  testMilliseconds++; expireCommand(millis());
  assert(!azPointActive && !azPointComplete && apiAzTarget < 0 && apiElTarget < 0);
  assert(!acceptCommandId(12));
  runAzimuthControl(160, millis());
  assert(driveCalls == before);
  unsigned long heartbeat = lastApiTime;
  assert(!acceptCommandId(11) && lastApiTime == heartbeat);
  assert(acceptCommandId(13) && startPoint(230, 45));
  azEncoderValid = false; runAzimuthControl(170, millis());
  assert(!azPointActive && apiAzTarget < 0);
  azEncoderValid = true; assert(!acceptCommandId(13));
  runAzimuthControl(170, millis()); assert(driveCalls == before);
  assert(acceptCommandId(14) && startPoint(230, 45));
  azNorthReferenceReady = false; runAzimuthControl(170, millis());
  assert(!azPointActive && apiAzTarget < 0);
  azNorthReferenceReady = true; assert(!acceptCommandId(14));
  runAzimuthControl(170, millis()); assert(driveCalls == before);
  isTracking = true; apiAzTarget = 230; apiElTarget = 45; lastApiTime = millis();
  testMilliseconds += SOURCE_TIMEOUT; expireCommand(millis());
  assert(!isTracking && apiAzTarget < 0 && apiElTarget < 0);
  clearCommandTargets(); startupCommandId = lastCommandId; commandBaselineReady = false;
  azNorthReferenceReady = false;
  assert(!acceptCommandId(15)); capture(170, 220);
  assert(!acceptCommandId(15) && acceptCommandId(16) && startPoint(230, 45));
  clearCommandTargets();
  assert(!startPoint(100, 45)); // requested AZ minus offset maps inside the raw gap
  assert(!startPoint(NAN, 45) && !startPoint(230, 91));
  declination = NAN; assert(!startPoint(230, 45));
}
void testHealthAndDiagnostics() {
  reset();
  mpuOk = elMpuOk = true; GPS.fix = true;
  updateHealthStatus(); assert(healthStatus == "OK");
  networkReady = false; updateHealthStatus(); assert(healthStatus == "FAULT"); networkReady = true;
  mpuOk = false; updateHealthStatus(); assert(healthStatus == "DEGRADED"); mpuOk = true;
  elMpuOk = false; updateHealthStatus(); assert(healthStatus == "DEGRADED"); elMpuOk = true;
  GPS.fix = false; updateHealthStatus(); assert(healthStatus == "DEGRADED");
  azEncoderValid = false; updateHealthStatus(); assert(healthStatus == "FAULT"); azEncoderValid = true;
  azHeadingValid = false; updateHealthStatus(); assert(healthStatus == "FAULT"); azHeadingValid = true;
  declination = NAN; updateHealthStatus(); assert(healthStatus == "FAULT");
  declination = magneticDeclination(2026.5f);
  estopWasActive = true; updateHealthStatus(); assert(healthStatus == "FAULT");
  estopWasActive = false;
  commandMessage = "POINT_ACCEPTED"; movementStatus = "MOVING"; lastCommandId = 42;
  apiAzTarget = 220; apiElTarget = 45; azimuthAngle = 210; elevationAngle = 40;
  lastCommandHttp = 200; lastReadingHttp = 200; lastMetadataHttp = -1;
  magneticSampleValid = true;
  magneticFieldX = 1.0e-6f; magneticFieldY = -2.0e-6f; magneticFieldZ = 3.0e-6f;
  mpuAccelX = 1; mpuAccelY = mpuAccelZ = 0;
  mpuGyroX = 2; mpuGyroY = 3; mpuGyroZ = 4;
  latitude = -33.9f; longitude = 18.5f; altitude = 50;
  Serial.lines.clear(); lastDiagnosticTime = 0;
  int before = driveCalls;
  updateDiagnostics(millis(), 170, 180, 1, 159, 140);
  assert(driveCalls == before && Serial.lines.size() == 1 && Serial.lines.back() == serialLog);
  for (const char* field : {"health=DEGRADED", "last_event=POINT_ACCEPTED", "cmd=42", "enc=170.00",
                           "target=220.00/45.00", "rawTarget=180.00", "reqPWM=159/140",
                           "MAG=OK", "mag_uT=1.00/-2.00/3.00", "accel_ms2=9.81/0.00/0.00",
                           "gyro_dps=2.00/3.00/4.00", "GPS=NO_FIX", "site=DEFAULT",
                           "http_prev(command/reading/metadata)=200/200/-1"}) {
    assert(serialLog.find(field) != String::npos);
  }
  assert(serialLog.find('\n') == String::npos && serialLog.size() < 1024);
  testMilliseconds += 500; updateDiagnostics(millis(), 170, 180, 1, 159, 140);
  assert(Serial.lines.size() == 1);
  commandMessage = String(4000, 'X');
  assert(buildDiagnosticLine(170, 180, 1, 159, 140).size() < 1024);
}
void testEstopTelemetry() {
  reset(); capture(170, 210); assert(startPoint(220, 45));
  azMotorStopped = elMotorStopped = false;
  lastPostTime = millis() - POST_INTERVAL;
  int beforeDrive = driveCalls;
  int beforeSensor = sensorReadCalls;
  runEstopControl();
  assert(estopWasActive && movementStatus == "ESTOP" && healthStatus == "FAULT");
  assert(azMotorStopped && elMotorStopped && driveCalls == beforeDrive);
  assert(!azPointActive && !isTracking && apiAzTarget < 0 && apiElTarget < 0);
  assert(!azNorthReferenceReady && !commandBaselineReady);
  assert(sensorReadCalls == beforeSensor + 1 && networkInFlight);
  NetworkRequest reading = takeRequest();
  assert(reading.operation == NetworkOperation::Reading);
  JsonDocument payload;
  assert(!deserializeJson(payload, reading.body));
  assert(payload["serial_log"].as<String>() == serialLog && serialLog.find("state=ESTOP") != String::npos);
  completeRequest(reading, 200); receiveNetworkReply(true);
  testMilliseconds += POST_INTERVAL - 1; runEstopControl();
  assert(sensorReadCalls == beforeSensor + 2 && networkInFlight);
  NetworkRequest metadata = takeRequest();
  assert(metadata.operation == NetworkOperation::Reference); // never Command while held
  completeRequest(metadata, 200); receiveNetworkReply(true);
  testMilliseconds++; runEstopControl();
  assert(sensorReadCalls == beforeSensor + 3 && takeRequest().operation == NetworkOperation::Reading);
  assert(azMotorStopped && elMotorStopped && driveCalls == beforeDrive);
}
void testLiveCompass() {
  reset(); azNorthReferenceReady = true; azEncoderOffset = 40;
  readSensors();
  assert(azimuthAngle == trueHeading && azHeadingValid);
  assert(std::fabs(signedAngleDifference(encoderToTrueAzimuth(azEncoderAngle), azimuthAngle)) > 1);
  float previous = azimuthAngle;
  myMag.measurementOk = false; readSensors();
  assert(azimuthAngle == previous && !azHeadingValid && healthStatus == "FAULT");
}
void testAsyncNetwork() {
  reset();
  vQueueDelete(networkRequests); vQueueDelete(networkReplies);
  networkRequests = networkReplies = nullptr;
  failQueueCreationAt = queueCreationCalls + 1;
  assert(!startNetworkWorker() && !networkRequests && !networkReplies);
  failQueueCreationAt = 0; taskCreationOk = false;
  assert(!startNetworkWorker() && !networkRequests && !networkReplies);
  taskCreationOk = true;
  assert(startNetworkWorker() && networkRequests && networkReplies);
  JsonDocument doc; doc["value"] = 1;
  networkGeneration = 7;
  assert(queueNetworkRequest(NetworkOperation::Reading, doc));
  assert(!queueNetworkRequest(NetworkOperation::Command, doc));
  doc["value"] = 2;
  NetworkRequest request = takeRequest();
  assert(request.generation == 7 && request.createdAt == millis());
  assert(std::strlen(request.body) < NETWORK_BODY_SIZE);
  JsonDocument snapshot; assert(!deserializeJson(snapshot, request.body));
  assert(snapshot["value"].as<int>() == 1); // copied bytes, not shared JSON/String state
  completeRequest(request, 200); receiveNetworkReply(false);
  assert(!networkInFlight && lastReadingHttp == 200);
  doc["large"] = String(NETWORK_BODY_SIZE, 'x');
  assert(!queueNetworkRequest(NetworkOperation::Reading, doc) && !networkInFlight);
  assert(networkRequests->items.empty() && commandMessage == "NETWORK_PAYLOAD_TOO_LARGE");

  reset(); capture(170, 210); assert(startPoint(220, 45));
  lastPollTime = millis() - POLL_INTERVAL;
  runAzimuthControl(170, millis()); assert(!azMotorStopped);
  int before = driveCalls;
  serviceNetwork(millis(), false);
  assert(networkInFlight && !azMotorStopped);
  request = takeRequest(); assert(request.operation == NetworkOperation::Command);
  runAzimuthControl(171, millis());
  assert(driveCalls == before + 1 && !azMotorStopped);
  serviceNetwork(millis(), false); assert(!azMotorStopped && networkRequests->items.empty());
  testMilliseconds += SOURCE_TIMEOUT;
  expireCommand(millis()); assert(azMotorStopped && !azPointActive && networkGeneration == 1);
  completeRequest(request, 200, R"({"id":99,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false); assert(!azPointActive && !networkInFlight && lastCommandId == 0);

  reset(); capture(170, 210); commandBaselineReady = false;
  lastPollTime = millis() - POLL_INTERVAL;
  serviceNetwork(millis(), false); request = takeRequest();
  completeRequest(request, 200, R"({"id":10,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false); assert(commandBaselineReady && lastCommandId == 10 && !azPointActive);
  testMilliseconds += POLL_INTERVAL;
  serviceNetwork(millis(), false); request = takeRequest();
  testMilliseconds += 50;
  completeRequest(request, 200, R"({"id":11,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false);
  assert(azPointActive && lastCommandId == 11 && lastApiTime == request.createdAt);
  runAzimuthControl(180, millis()); assert(azPointComplete && !azPointActive);
  testMilliseconds += POLL_INTERVAL;
  serviceNetwork(millis(), false); request = takeRequest();
  completeRequest(request, 200, R"({"id":11,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false); assert(!azPointActive && azPointComplete && lastApiTime == request.createdAt);

  reset(); capture(170, 210); assert(startPoint(220, 45));
  lastCommandId = 11; startupCommandId = 10;
  JsonDocument empty;
  assert(queueNetworkRequest(NetworkOperation::Command, empty)); request = takeRequest();
  testEstopPin = LOW; loop();
  assert(estopWasActive && networkGeneration == 1 && !azPointActive && !commandBaselineReady);
  completeRequest(request, 200, R"({"id":12,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  testEstopPin = HIGH; loop();
  assert(!estopWasActive && networkGeneration == 2 && !azPointActive && !commandBaselineReady);
  request = takeRequest(); assert(request.generation == 2);
  if (request.operation != NetworkOperation::Command) {
    // Discarded old HTTP completion can defer the fresh baseline by one poll interval.
    completeRequest(request, 200); receiveNetworkReply(false);
    testMilliseconds += POLL_INTERVAL; serviceNetwork(millis(), false); request = takeRequest();
  }
  assert(request.operation == NetworkOperation::Command && request.generation == 2);
  completeRequest(request, 200, R"({"id":12,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false); assert(commandBaselineReady && startupCommandId == 12 && !azPointActive);

  reset(); capture(170, 210);
  assert(queueNetworkRequest(NetworkOperation::Command, empty)); request = takeRequest();
  testMilliseconds += SOURCE_TIMEOUT;
  completeRequest(request, 200, R"({"id":13,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  receiveNetworkReply(false); assert(lastCommandId == 0 && !azPointActive && !networkInFlight);

  reset(); capture(170, 210); assert(startPoint(220, 45));
  assert(queueNetworkRequest(NetworkOperation::Command, empty)); request = takeRequest();
  completeRequest(request, 200, R"({"id":14,"command_type":"point","point":{"target_az_angle":220,"target_el_angle":45}})");
  testHigh = testLow = 0; loop(); // feedback invalidates generation before applying pending reply
  assert(!azPointActive && azMotorStopped && networkGeneration == 1 && lastCommandId == 0);

  reset(); capture(170, 210); assert(startPoint(220, 45)); finishAzPoint();
  azEncoderValid = false; runAzimuthControl(180, millis());
  assert(apiElTarget < 0 && networkGeneration == 1 && !azPointComplete);

  reset(); capture(170, 210); assert(startPoint(220, 45));
  estopDuringPulse = true; before = driveCalls; loop();
  assert(testEstopPin == LOW && azMotorStopped && elMotorStopped && driveCalls == before);
  assert(estopWasActive && !azPointActive && !commandBaselineReady && networkGeneration == 1);
  estopDuringPulse = false; testEstopPin = HIGH; loop(); // brief pulse released before next loop
  assert(!azPointActive && !commandBaselineReady && azMotorStopped && networkGeneration == 2);
}
void testReportedNorthWait() {
  reset(); azEncoderAngle = 2.95f; trueHeading = 304.37f;
  startupCommandId = lastCommandId = 10;
  JsonDocument empty;
  assert(!azNorthReferenceReady && queueNetworkRequest(NetworkOperation::Command, empty));
  NetworkRequest request = takeRequest();
  completeRequest(request, 200, R"({"id":11,"command_type":"point","point":{"target_az_angle":90,"target_el_angle":45}})");
  unsigned long before = millis(); receiveNetworkReply(false);
  assert(millis() == before && azNorthReferenceReady && azPointActive && commandMessage == "POINT_ACCEPTED");
  assert(std::fabs(azEncoderOffset - 301.42f) < 0.001);
  assert(std::fabs(trueAzimuthToEncoder(90) - 148.58f) < 0.001);
  assert(chooseDirection(2.95f, trueAzimuthToEncoder(90)) == -1);
  reset(); azHeadingValid = false; assert(!startPoint(90, 45) && commandMessage == "MAGNETOMETER_INVALID");
  reset(); azEncoderValid = false; assert(!startPoint(90, 45) && commandMessage == "AZ_ENCODER_INVALID");
}
void testManualReference() {
  reset(); USE_MANUAL_AZ_REFERENCE = true;
  assert(std::fabs(encoderAtNorth - 267.8f) < 0.001);
  azEncoderAngle = 170; azHeadingValid = false; declination = NAN;
  assert(setAzimuthReference(170, NAN));
  assert(azNorthReferenceReady && std::fabs(azEncoderOffset - 92.2f) < 0.001);
  assert(std::fabs(signedAngleDifference(encoderToTrueAzimuth(encoderAtNorth), 0)) < 0.001);
  assert(std::fabs(trueAzimuthToEncoder(0) - encoderAtNorth) < 0.001);
  assert(setAzimuthReference(200, 35));
  assert(std::fabs(azEncoderOffset - 92.2f) < 0.001); // neither position nor compass recaptures zero
  assert(checkAzimuthFeedback());
  azEncoderValid = false; assert(!checkAzimuthFeedback());
  rejectedReference(170, 0);
  azEncoderValid = true; azMotorStopped = false; rejectedReference(170, 0);
  azMotorStopped = true; elMotorStopped = false; rejectedReference(170, 0);
  elMotorStopped = true; azPointActive = true; rejectedReference(170, 0);
  azPointActive = false; isTracking = true; rejectedReference(170, 0);
  isTracking = false; rejectedReference(NAN, 0);

  reset(); USE_MANUAL_AZ_REFERENCE = true;
  myMag.measurementOk = false; testNow = 0;
  azEncoderReady = false; testHigh = 2678; testLow = 922;
  assert(setAzimuthReference(267.8f, NAN) == false); // an actual encoder sample is still required
  readSensors();
  assert(checkAzimuthFeedback());
  readSensors();
  assert(std::fabs(azimuthAngle) < 0.001 && !azHeadingValid);
  assert(healthStatus == "DEGRADED");
  mpuOk = elMpuOk = GPS.fix = true;
  updateHealthStatus(); assert(healthStatus == "DEGRADED"); // compass/date alone are diagnostic in manual mode
  azEncoderValid = false; updateHealthStatus(); assert(healthStatus == "FAULT");
  azEncoderValid = true; networkReady = false; updateHealthStatus(); assert(healthStatus == "FAULT");
  networkReady = true;
  assert(publishAzimuthReference());
  NetworkRequest metadata = takeRequest();
  assert(metadata.operation == NetworkOperation::Reference);
  JsonDocument snapshot;
  assert(!deserializeJson(snapshot, metadata.body));
  assert(snapshot["az_reference"].as<String>() == "MANUAL_ALIGNMENT");
  assert(std::fabs(snapshot["az_encoder_offset"].as<float>() - 92.2f) < 0.001);
  assert(!snapshot["az_alignment_verified"].as<bool>());
  completeRequest(metadata, 200); receiveNetworkReply(false);
  assert(!azPointActive && !isTracking); // publishing reference metadata cannot arm either command path
  assert(buildDiagnosticLine(267.8f, -1, 0, 0, 0).find("ref=MANUAL_ALIGNMENT") != String::npos);
  commandBaselineReady = false;
  assert(!acceptCommandId(40) && !azPointActive);
  assert(acceptCommandId(41) && startPoint(20, 45));
  assert(std::fabs(trueAzimuthToEncoder(20) - 287.8f) < 0.001);
  int before = driveCalls;
  runAzimuthControl(267.8f, millis());
  assert(!azMotorStopped && driveCalls == before + 1);
  loop(); // bad compass/date cannot invalidate the fixed manual reference during movement
  assert(azNorthReferenceReady && azPointActive && !azMotorStopped);
  runAzimuthControl(287.8f, millis());
  assert(azPointComplete && !azPointActive && azMotorStopped);
  before = driveCalls;
  assert(!acceptCommandId(41));
  runAzimuthControl(280, millis());
  assert(azPointComplete && azMotorStopped && driveCalls == before);
  assert(!startPoint(172.2f, 45)); // raw 80 degrees is inside the unchanged blocked arc

  assert(acceptCommandId(42) && startPoint(30, 45));
  latchEmergencyStop();
  assert(azMotorStopped && elMotorStopped && !azPointActive && !commandBaselineReady);
  assert(apiAzTarget < 0 && apiElTarget < 0 && !azNorthReferenceReady);
  estopWasActive = false;
  assert(checkAzimuthFeedback());
  assert(!acceptCommandId(43)); // release consumes a fresh latest-command baseline
  assert(!acceptCommandId(43) && acceptCommandId(44) && startPoint(30, 45));
  testMilliseconds += SOURCE_TIMEOUT;
  expireCommand(millis());
  assert(azMotorStopped && elMotorStopped && !azPointActive && apiAzTarget < 0);
  assert(!acceptCommandId(44));
}
int main() {
  int cases = 0;
  assert(USE_MANUAL_AZ_REFERENCE); // shipped configuration selects the user-confirmed manual reference
  assert(AZ_MIN_PWM == 210 && AZ_MIN_PWM <= AZ_MAX_PWM);
  assert(computeAzimuthPwm(0.9f) == 0 && computeAzimuthPwm(1) >= 210 && computeAzimuthPwm(360) == 255);
  assert(std::fabs(AZ_ENCODER_MIN - 137.8f) < 0.001 && std::fabs(AZ_ENCODER_MAX - 37.8f) < 0.001);
  for (int current = 0; current < 360; current++) {
    for (int target = 0; target < 360; target++) {
      int direction = chooseDirection(current, target);
      bool targetAllowed = target >= AZ_ENCODER_MIN || target <= AZ_ENCODER_MAX;
      bool currentAllowed = current >= AZ_ENCODER_MIN || current <= AZ_ENCODER_MAX;
      if (!targetAllowed) assert(direction == 0);
      else if (!currentAllowed) {
        if (AZ_ENCODER_MIN - current <= AZ_TOLERANCE) assert(direction == 1);
        else if (current - AZ_ENCODER_MAX <= AZ_TOLERANCE) assert(direction == -1);
        else assert(direction == 0);
      } else {
        assert(direction != 0);
        float distance = direction > 0 ? cwDistance(current, target) : cwDistance(target, current);
        for (float step = 0; step < distance; step += 0.5f) {
          float angle = norm360(current + direction * step);
          assert(angle >= AZ_ENCODER_MIN || angle <= AZ_ENCODER_MAX);
        }
      }
      cases++;
    }
  }
  for (float offset : {0.0f, 40.0f, 200.0f, 350.0f}) {
    azEncoderOffset = offset;
    for (int raw = 0; raw < 360; raw++) {
      assert(std::fabs(signedAngleDifference(raw, trueAzimuthToEncoder(encoderToTrueAzimuth(raw)))) < 0.001);
    }
  }
  azEncoderReady = false; testHigh = 1378; testLow = 2222;
  assert(std::fabs(readAzEncoderAngle() - 137.8f) < 0.01 && azEncoderValid);
  azEncoderAngle = 359; testHigh = 10; testLow = 3590;
  assert(std::fabs(readAzEncoderAngle()) < 0.01);
  float previous = azEncoderAngle;
  testHigh = 0; assert(readAzEncoderAngle() == previous && !azEncoderValid);
  testHigh = 100; testLow = 0; assert(readAzEncoderAngle() == previous && !azEncoderValid);
  testDateAndCompass(); testMagnetometerStartupAndRecovery(); testImmediateReference(); testCommands();
  testHealthAndDiagnostics(); testEstopTelemetry(); testLiveCompass(); testAsyncNetwork(); testReportedNorthWait();
  testManualReference();
  std::cout << "PASS: " << cases << " safe routes, fixed manual reference and compass fallback, "
            << "magnetometer startup/recovery, Tesla scaling, command completion/no replay, timeout, health, E-stop and async network safety" << std::endl;
}
'''
with tempfile.TemporaryDirectory(prefix='astt-firmware-test-') as directory:
    executable = str(Path(directory) / 'firmware-test')
    subprocess.run(['g++', '-std=c++17', '-Wall', '-Wextra', '-Werror', '-I', str(json_include), '-x', 'c++', '-o', executable, '-'],
                   input=program, text=True, check=True)
    subprocess.run([executable], check=True)
