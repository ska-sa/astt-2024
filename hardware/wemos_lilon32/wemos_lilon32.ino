#include <Wire.h>
#include <math.h>
#include <WiFi.h>
#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GPS.h>
#include <time.h>
#include <SparkFun_MMC5983MA_Arduino_Library.h>


// ---------- wifi and api ----------
const char* ssid = "SARAO_Guest";
const char* password = "ska.2009";
const char* commandsUrl = "http://172.22.9.54:8000/api/v1/commands/7/latest";
const char* readingsUrl = "http://172.22.9.54:8000/api/v1/readings";
const char* ntpServer = "pool.ntp.org";
int telescopeId = 7;




// ---------- pins ----------
// IN1-IN4 use consecutive header positions; ENA and ENB are adjacent.
const int AZ_IN1 = 14;
const int AZ_IN2 = 27;
const int EL_IN1 = 26;  // L298 IN3
const int EL_IN2 = 25;  // L298 IN4
const int AZ_ENA = 33;
const int EL_ENA = 32;  // L298 ENB
const int AZ_ENCODER_PIN = 19;
const int EL_ENCODER_PIN = 35;  // reserved for a future input-only encoder
const int ESTOP_PIN = 23;


// ---------- azimuth control ----------
const float AZ_MIN = 0.0;
const float AZ_MAX = 360.0;
const float AZ_ENCODER_MIN = 137.8;  // operator-verified decreasing stop
const float AZ_ENCODER_MAX = 37.8;   // operator-verified increasing stop; arc crosses 360/0
const float AZ_ENCODER_OFFSET = 0.0; // diagnostic fallback only; zero is not calibrated north
const bool USE_MANUAL_AZ_REFERENCE = true;
// Verified clockwise 1:1 mapping. The permitted 260-degree arc midpoint is
// norm360(137.8 + 260/2) = 267.8, not the arithmetic average of the stops.
// Manually level and north-align the base at this encoder position before use.
const float encoderAtNorth = 267.8f;
const float AZ_TOLERANCE = 1.0;
const float AZ_RAMP_RANGE = 60.0;
const int AZ_MIN_PWM = 210;  // 1.5 times the previous 140; qualify stopping at this power
const int AZ_MAX_PWM = 255;


// ---------- elevation control ----------
const float EL_MIN = 0.0;
const float EL_MAX = 90.0;
const float EL_TOLERANCE = 1.0;
const float EL_RAMP_RANGE = 30.0;
const int EL_MIN_PWM = 140;
const int EL_MAX_PWM = 255;
const float EL_MPU_SIGN = 1.0;     // reverse if the measured angle moves backwards
const float EL_ZERO_OFFSET = 0.0;  // set after the horizontal position is measured


// ---------- encoder ----------
const int AZ_ENCODER_SAMPLES = 7;        // odd number, we take the median
const float AZ_ENCODER_SMOOTHING = 0.5;  // 0 is no smoothing, 1 never updates
float azEncoderAngle = 0.0;
bool azEncoderReady = false;
bool azEncoderValid = false;
float azEncoderOffset = AZ_ENCODER_OFFSET;
bool azNorthReferenceReady = false;
bool azHeadingValid = false;
bool azMotorStopped = true;
bool elMotorStopped = true;


// ---------- command targets ----------
const unsigned long SOURCE_TIMEOUT = 10000;
float apiAzTarget = -1.0;
float apiElTarget = -1.0;
unsigned long lastApiTime = 0;
int startupCommandId = 0;
int lastCommandId = 0;
bool commandBaselineReady = false;
bool azPointActive = false;
bool azPointComplete = false;


// ---------- tracking ----------
bool isTracking = false;
float track_m1 = 0, track_m2 = 0;
float track_c1 = 0, track_c2 = 0;
float track_T_ra = 0, track_T_dec = 0;
float track_A = 0, track_phi = 0, track_D = 0;


// ---------- estop ----------
bool estopWasActive = false;


// ---------- network timing ----------
const unsigned long POST_INTERVAL = 5000;
const unsigned long POLL_INTERVAL = 2000;
unsigned long lastPostTime = 0;
unsigned long lastPollTime = 0;
unsigned long lastDiagnosticTime = 0;

// HTTP runs separately; only loop() owns sensors, commands and motor outputs.
enum class NetworkOperation : uint8_t { Command, Reading, Reference };
const size_t NETWORK_BODY_SIZE = 3072;
struct NetworkRequest {
  NetworkOperation operation;
  unsigned long createdAt;
  uint32_t generation;
  char body[NETWORK_BODY_SIZE];
};
struct NetworkReply {
  NetworkOperation operation;
  unsigned long createdAt;
  uint32_t generation;
  int status;
  char body[NETWORK_BODY_SIZE];
};
QueueHandle_t networkRequests = nullptr;
QueueHandle_t networkReplies = nullptr;
bool networkReady = false;
bool networkInFlight = false;
bool metadataPending = true;
uint32_t networkGeneration = 0;


// ---------- readings sent to backend ----------
float azimuthAngle = 0.0;
float elevationAngle = 0.0;
// site defaults, readGPS overwrites these only when it gets a fix
float latitude = -33.944481;
float longitude = 18.478685;
float altitude = 50.0;
String healthStatus = "OK";
String movementStatus = "IDLE";
String serialLog = "";
String commandMessage = "BOOT";
int lastCommandHttp = 0;
int lastReadingHttp = 0;
int lastMetadataHttp = 0;


// ---------- level antenna sensors ----------
// The MPU6050 shares the SDA/SCL I2C bus with the GPS and magnetometer.
const int I2C_SDA = 21;
const int I2C_SCL = 22;
Adafruit_GPS GPS(&Wire);
SFE_MMC5983MA myMag;
bool magOk = false;
bool magneticSampleValid = false;
unsigned long magLastAttempt = 0;
unsigned long magInitializedAt = 0;

const uint8_t MPU_ADDR = 0x68;
const uint8_t EL_MPU_ADDR = 0x69;
bool mpuOk = false;
bool elMpuOk = false;
float mpuAccelX = 0.0;
float mpuAccelY = 0.0;
float mpuAccelZ = 0.0;
float mpuGyroX = 0.0;
float mpuGyroY = 0.0;
float mpuGyroZ = 0.0;
float elMpuAccelX = 0.0;
float elMpuAccelY = 0.0;
float elMpuAccelZ = 0.0;
float elevationMpuPitch = 0.0;
float magneticFieldX = 0.0;
float magneticFieldY = 0.0;
float magneticFieldZ = 0.0;

// Canonical heading is atan2(Y, X); the user selected 0 degrees for dish-forward.
// Confirm against an independent heading before marking the mounting verified.
const float MAG_MOUNTING_OFFSET_DEG = 0.0;
// Keep the compass physically level; installed magnetic calibration is deferred.
float magneticHeading = NAN;
float declination = NAN;
float trueHeading = 0.0;
float levelRoll = 0.0;
float levelPitch = 0.0;

bool readMpuValues(uint8_t address, float &accelX, float &accelY, float &accelZ,
                   float &gyroX, float &gyroY, float &gyroZ) {
  Wire.beginTransmission(address);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0 || Wire.requestFrom(address, (uint8_t)14, (uint8_t)true) != 14) {
    return false;
  }

  uint8_t raw[14];
  for (uint8_t i = 0; i < 14; i++) raw[i] = Wire.read();

  int16_t ax = (int16_t)((raw[0] << 8) | raw[1]);
  int16_t ay = (int16_t)((raw[2] << 8) | raw[3]);
  int16_t az = (int16_t)((raw[4] << 8) | raw[5]);
  int16_t gx = (int16_t)((raw[8] << 8) | raw[9]);
  int16_t gy = (int16_t)((raw[10] << 8) | raw[11]);
  int16_t gz = (int16_t)((raw[12] << 8) | raw[13]);

  accelX = ax / 16384.0f;
  accelY = ay / 16384.0f;
  accelZ = az / 16384.0f;
  gyroX = gx / 131.0f;
  gyroY = gy / 131.0f;
  gyroZ = gz / 131.0f;
  return true;
}


bool readMpu() {
  return readMpuValues(MPU_ADDR, mpuAccelX, mpuAccelY, mpuAccelZ,
                       mpuGyroX, mpuGyroY, mpuGyroZ);
}


void updateLevelAngles() {
  float roll = atan2(mpuAccelY, mpuAccelZ);
  float pitch = atan2(-mpuAccelX,
                      sqrt(mpuAccelY * mpuAccelY + mpuAccelZ * mpuAccelZ));
  levelRoll = roll * 180.0 / PI;
  levelPitch = pitch * 180.0 / PI;
}


bool readElevationMpu() {
  float gyroX, gyroY, gyroZ;
  if (!readMpuValues(EL_MPU_ADDR, elMpuAccelX, elMpuAccelY, elMpuAccelZ,
                     gyroX, gyroY, gyroZ)) {
    return false;
  }

  float pitch = atan2(-elMpuAccelX,
                      sqrt(elMpuAccelY * elMpuAccelY + elMpuAccelZ * elMpuAccelZ));
  elevationMpuPitch = pitch * 180.0 / PI;

  // Relative elevation removes the small tilt left after manual base levelling.
  float relativeElevation = EL_MPU_SIGN * elevationMpuPitch
                            - levelPitch + EL_ZERO_OFFSET;
  elevationAngle = constrain(relativeElevation, EL_MIN, EL_MAX);
  return true;
}

bool initMpu(uint8_t address) {
  Wire.beginTransmission(address);
  Wire.write(0x6B);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  delay(100);
  return true;
}



// ================= tracking math =================


// the model gives ra in hours and dec in degrees for a day of the year.
// we then convert that to an az and el for our site at the current utc time.
float trackEl = 0.0;  // elevation of the source, degrees




// ================= angle helpers =================


// always return 0 to 360
float norm360(float a) {
  a = fmod(a, 360.0);
  if (a < 0) a += 360.0;
  return a;
}


// Distance from a to b in the increasing encoder-angle direction.
float cwDistance(float from, float to) {
  return norm360(to - from);
}


// shortest signed turn from one angle to another, from -180 to 180
float signedAngleDifference(float from, float to) {
  float difference = norm360(to - from);
  if (difference > 180.0) difference -= 360.0;
  return difference;
}


float encoderToTrueAzimuth(float encoderAngle) {
  return norm360(encoderAngle + azEncoderOffset);
}


float trueAzimuthToEncoder(float trueAzimuth) {
  return norm360(trueAzimuth - azEncoderOffset);
}





// Manual reference is a recorded mechanical position, never the current boot angle.
bool setAzimuthReference(float encoderAngle, float heading) {
  if (!azEncoderReady || !azEncoderValid
      || !azMotorStopped || !elMotorStopped || azPointActive || isTracking
      || !isfinite(encoderAngle)) return false;
  if (USE_MANUAL_AZ_REFERENCE) {
    if (!isfinite(encoderAtNorth) || encoderAtNorth < 0 || encoderAtNorth >= 360) return false;
    azEncoderOffset = norm360(-encoderAtNorth);
  } else {
    if (!azHeadingValid || !isfinite(heading)) return false;
    azEncoderOffset = norm360(heading - encoderAngle);
  }
  azNorthReferenceReady = true;
  return true;
}


// Manual Point needs encoder feedback, not a compass or declination date.
bool checkAzimuthFeedback() {
  if (!azEncoderReady || !azEncoderValid) commandMessage = "AZ_ENCODER_INVALID";
  else if (USE_MANUAL_AZ_REFERENCE) {
    if (!azNorthReferenceReady) setAzimuthReference(azEncoderAngle, trueHeading);
    if (azNorthReferenceReady) return true;
    commandMessage = "MANUAL_REFERENCE_UNAVAILABLE";
  }
  else if (!isfinite(declination)) commandMessage = "DECLINATION_DATE_UNSUPPORTED_OR_UNSYNCED";
  else if (!azHeadingValid) commandMessage = "MAGNETOMETER_INVALID";
  else {
    if (!azNorthReferenceReady) setAzimuthReference(azEncoderAngle, trueHeading);
    if (azNorthReferenceReady) return true;
    commandMessage = "AZ_REFERENCE_UNAVAILABLE";
  }
  return false;
}


bool inAzimuthNoGoZone(float angle) {
  return cwDistance(AZ_ENCODER_MIN, angle) > cwDistance(AZ_ENCODER_MIN, AZ_ENCODER_MAX);
}


// +1 requests an increasing encoder angle, -1 a decreasing angle, and 0 stops.
int chooseDirection(float current, float target) {
  if (!isfinite(current) || !isfinite(target)) return 0;
  if (inAzimuthNoGoZone(target)) return 0;

  if (inAzimuthNoGoZone(current)) {
    // Allow small measurement errors at a stop, but only move back into the safe arc.
    if (cwDistance(current, AZ_ENCODER_MIN) <= AZ_TOLERANCE) return 1;
    if (cwDistance(AZ_ENCODER_MAX, current) <= AZ_TOLERANCE) return -1;
    return 0;
  }

  return (cwDistance(AZ_ENCODER_MIN, target) >= cwDistance(AZ_ENCODER_MIN, current)) ? 1 : -1;
}




// ================= encoder =================


// read the pwm duty cycle and turn it into an angle.
// takes the median of several samples so one bad pulse cannot move the value.
float readAzEncoderAngle() {
  azEncoderValid = false;
  float samples[AZ_ENCODER_SAMPLES];
  int valid = 0;


  for (int i = 0; i < AZ_ENCODER_SAMPLES; i++) {
    unsigned long hi = pulseIn(AZ_ENCODER_PIN, HIGH, 25000);
    unsigned long lo = pulseIn(AZ_ENCODER_PIN, LOW, 25000);
    if (hi == 0 || lo == 0) continue;
    samples[valid] = ((float)hi / (float)(hi + lo)) * 360.0;
    valid++;
  }


  if (valid == 0) return azEncoderAngle;
  azEncoderValid = true;


  // sort so we can pick the middle value
  for (int i = 0; i < valid - 1; i++) {
    for (int j = i + 1; j < valid; j++) {
      if (samples[j] < samples[i]) {
        float tmp = samples[i];
        samples[i] = samples[j];
        samples[j] = tmp;
      }
    }
  }
  float median = samples[valid / 2];


  if (!azEncoderReady) {
    azEncoderAngle = norm360(median);
    azEncoderReady = true;
  } else {
    // Smooth across 359/0 without inventing a position halfway around the circle.
    float difference = signedAngleDifference(azEncoderAngle, median);
    azEncoderAngle = norm360(azEncoderAngle + (1.0 - AZ_ENCODER_SMOOTHING) * difference);
  }
  return azEncoderAngle;
}


// ================= magnetometer =================

// Research fit: (-33.944440, 18.479819), altitude 6 m, compared with WMM for 2026-2027.
float magneticDeclination(float year) {
  if (!isfinite(year) || year < 2026.0f || year >= 2028.0f) return NAN;
  const float t = year - 2026.0f;
  return (7.015377035040e-04f * t + (-2.339418355340e-01f)) * t + (-2.667043477086e+01f);
}


float currentDecimalYear() {
  time_t nowUtc = time(nullptr);
  struct tm utc;
  if (nowUtc < 1700000000 || gmtime_r(&nowUtc, &utc) == nullptr) return NAN;

  int year = utc.tm_year + 1900;
  // No unsynchronised date or extrapolation beyond the research comparison window.
  if (year < 2026 || year >= 2028) return NAN;
  bool leapYear = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
  float days = utc.tm_yday
               + (utc.tm_hour * 3600.0f + utc.tm_min * 60.0f + utc.tm_sec) / 86400.0f;
  return year + days / (leapYear ? 366.0f : 365.0f);
}


// Working standalone compass setup, on the existing shared Wire bus.
bool initializeMagnetometer() {
  if (!myMag.begin(Wire) || !myMag.softReset()
      || !myMag.enableAutomaticSetReset()
      || !myMag.setFilterBandwidth(100)
      || !myMag.setContinuousModeFrequency(20)) return false;
  return myMag.enableContinuousMode();
}


bool ensureMagnetometerReady() {
  if (!magOk) {
    if (millis() - magLastAttempt < 1000) return false;
    magLastAttempt = millis();
    magOk = initializeMagnetometer();
    if (!magOk) return false;
    magInitializedAt = millis();
  }
  return millis() - magInitializedAt >= 100;
}


// Raw Tesla telemetry and factory-centered compass counts; no calibration fit.
bool readMagneticField(float raw[3]) {
  magneticSampleValid = false;
  if (!ensureMagnetometerReady()) return false;

  uint32_t rawX, rawY, rawZ;
  if (!myMag.readFieldsXYZ(&rawX, &rawY, &rawZ)) {
    if (!myMag.isConnected()) magOk = false;
    return false;
  }
  if (rawX == 0 || rawX >= 262143 || rawY == 0 || rawY >= 262143
      || rawZ == 0 || rawZ >= 262143) return false;
  // MMC5983 output is unsigned 18-bit counts centered at 131072.
  // Working sketch sensitivity: 16384 counts/gauss; 1 gauss = 1e-4 Tesla.
  const float teslaPerCount = 1.0e-4f / 16384.0f;
  magneticFieldX = ((float)rawX - 131072.0f) * teslaPerCount;
  magneticFieldY = ((float)rawY - 131072.0f) * teslaPerCount;
  magneticFieldZ = ((float)rawZ - 131072.0f) * teslaPerCount;
  raw[0] = (float)rawX - 131072.0f;
  raw[1] = (float)rawY - 131072.0f;
  raw[2] = (float)rawZ - 131072.0f;
  magneticSampleValid = true;
  return true;
}


float computeTrueHeading() {
  azHeadingValid = false;
  magneticHeading = NAN;
  declination = magneticDeclination(currentDecimalYear());
  float raw[3];
  if (!readMagneticField(raw)) return trueHeading;
  if (hypot(raw[0], raw[1]) < 1.0f) return trueHeading;
  magneticHeading = norm360(atan2(raw[1], raw[0]) * 180.0 / PI + MAG_MOUNTING_OFFSET_DEG);
  if (!isfinite(declination)) return trueHeading;
  float heading = norm360(magneticHeading + declination);
  azHeadingValid = isfinite(heading);
  return azHeadingValid ? heading : trueHeading;
}


// ================= motor =================


void stopAzimuthMotor() {
  azMotorStopped = true;
  digitalWrite(AZ_IN1, LOW);
  digitalWrite(AZ_IN2, LOW);
  analogWrite(AZ_ENA, 0);
}


void stopElevationMotor() {
  elMotorStopped = true;
  digitalWrite(EL_IN1, LOW);
  digitalWrite(EL_IN2, LOW);
  analogWrite(EL_ENA, 0);
}


void driveAzimuthMotor(int pwm, int direction) {
  azMotorStopped = pwm == 0;
  if (direction > 0) {
    digitalWrite(AZ_IN1, HIGH);
    digitalWrite(AZ_IN2, LOW);
  } else {
    digitalWrite(AZ_IN1, LOW);
    digitalWrite(AZ_IN2, HIGH);
  }
  analogWrite(AZ_ENA, pwm);
}


void driveElevationMotor(int pwm, int direction) {
  elMotorStopped = pwm == 0;
  if (direction > 0) {
    digitalWrite(EL_IN1, HIGH);
    digitalWrite(EL_IN2, LOW);
  } else {
    digitalWrite(EL_IN1, LOW);
    digitalWrite(EL_IN2, HIGH);
  }
  analogWrite(EL_ENA, pwm);
}


// bigger error means more power, but never below AZ_MIN_PWM or we just hum
int computeAzimuthPwm(float errorSize) {
  if (errorSize < AZ_TOLERANCE) return 0;
  float scale = errorSize / AZ_RAMP_RANGE;
  if (scale > 1.0) scale = 1.0;
  return AZ_MIN_PWM + (int)((AZ_MAX_PWM - AZ_MIN_PWM) * scale);
}


int computeElevationPwm(float errorSize) {
  if (errorSize < EL_TOLERANCE) return 0;
  float scale = errorSize / EL_RAMP_RANGE;
  if (scale > 1.0) scale = 1.0;
  return EL_MIN_PWM + (int)((EL_MAX_PWM - EL_MIN_PWM) * scale);
}




// ================= gps =================


void readGPS() {
  GPS.read();
  if (!GPS.newNMEAreceived()) return;
  if (!GPS.parse(GPS.lastNMEA())) return;
  if (GPS.fix) {
    latitude = GPS.latitudeDegrees;
    longitude = GPS.longitudeDegrees;
    altitude = GPS.altitude;
  }
}




// ================= tracking math =================




float computeAzFromSource() {
  time_t nowUtc = time(nullptr);
  if (nowUtc < 1700000000) return -1.0;  // clock not synced yet
  if (track_T_ra <= 0 || track_T_dec == 0) return -1.0;


  struct tm utc;
  gmtime_r(&nowUtc, &utc);


  // day of year, with a fraction for the time of day
  float dayOfYear = utc.tm_yday + 1
                    + (utc.tm_hour * 3600.0 + utc.tm_min * 60.0 + utc.tm_sec) / 86400.0;


  // ra is piecewise linear in hours, one slope per half of the year
  float raHours;
  if (dayOfYear < track_T_ra) {
    raHours = track_m1 * dayOfYear + track_c1;
  } else {
    raHours = track_m2 * dayOfYear + track_c2;
  }
  raHours = fmod(raHours, 24.0);
  if (raHours < 0) raHours += 24.0;
  float raDeg = raHours * 15.0;


  // dec is a sinusoid over the year, T_dec is already 365.25 / 2pi
  float decDeg = track_A * sin(dayOfYear / track_T_dec + track_phi) + track_D;


  // sidereal time, needs double or we lose half a degree
  double d = ((double)nowUtc - 946728000.0) / 86400.0;
  double gmst = fmod(280.46061837 + 360.98564736629 * d, 360.0);
  if (gmst < 0) gmst += 360.0;


  float lst = fmod(gmst + longitude, 360.0);
  float ha = fmod(lst - raDeg, 360.0);


  float haRad = ha * PI / 180.0;
  float decRad = decDeg * PI / 180.0;
  float latRad = latitude * PI / 180.0;


  float sinAlt = sin(decRad) * sin(latRad) + cos(decRad) * cos(latRad) * cos(haRad);
  sinAlt = max(-1.0f, min(1.0f, sinAlt));
  float altRad = asin(sinAlt);
  trackEl = altRad * 180.0 / PI;


  float cosAz = (sin(decRad) - sinAlt * sin(latRad)) / (cos(altRad) * cos(latRad));
  cosAz = max(-1.0f, min(1.0f, cosAz));
  float azDeg = acos(cosAz) * 180.0 / PI;
  if (sin(haRad) > 0) azDeg = 360.0 - azDeg;


  if (isnan(azDeg)) return -1.0;
  return norm360(azDeg);
}




// ================= network =================


void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("wifi");


  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(10);
    Serial.print(".");
  }


  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ok " + WiFi.localIP().toString());
  } else {
    Serial.println(" failed, running offline");
  }
}


void syncNTP() {
  if (WiFi.status() != WL_CONNECTED) return;
  configTime(0, 0, ntpServer);
  struct tm timeinfo;
  unsigned long start = millis();
  while (!getLocalTime(&timeinfo, 1000) && millis() - start < 15000) {}
  Serial.println("time synced");
}


// Bound server responses; never interpret truncated commands.
bool readNetworkBody(HTTPClient &http, char *body, size_t capacity) {
  // Our JSON API supplies Content-Length; reject unknown/chunked lengths too.
  if (http.getSize() < 0 || http.getSize() >= (int)capacity) return false;
  String response = http.getString();
  if (response.length() >= capacity) return false;
  response.toCharArray(body, capacity);
  return true;
}


// Immutable snapshots only: no sensors, target state or motor access in this task.
void networkWorker(void *unused) {
  NetworkRequest request;
  NetworkReply reply;
  for (;;) {
    if (xQueueReceive(networkRequests, &request, portMAX_DELAY) != pdTRUE) continue;
    reply = {};
    reply.operation = request.operation;
    reply.createdAt = request.createdAt;
    reply.generation = request.generation;
    reply.status = -1;
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;
      http.setTimeout(1500);
      http.setConnectTimeout(1500);
      if (request.operation == NetworkOperation::Command) {
        http.begin(client, commandsUrl);
        reply.status = http.GET();
        if (reply.status == 200 && !readNetworkBody(http, reply.body, sizeof(reply.body))) reply.status = -3;
      } else if (request.operation == NetworkOperation::Reading) {
        http.begin(client, readingsUrl);
        http.addHeader("Content-Type", "application/json");
        reply.status = http.POST((uint8_t *)request.body, strlen(request.body));
      } else {
        String telescopeUrl = String(commandsUrl);
        telescopeUrl.replace("/commands/", "/telescopes/");
        telescopeUrl.replace("/latest", "");
        http.begin(client, telescopeUrl);
        reply.status = http.GET();
        if (reply.status == 200) {
          JsonDocument telescope;
          JsonDocument update;
          if (!readNetworkBody(http, reply.body, sizeof(reply.body))) reply.status = -3;
          else if (deserializeJson(telescope, reply.body) || deserializeJson(update, request.body)) reply.status = -2;
          else {
            JsonObject metadata = telescope["metadata"].as<JsonObject>();
            if (metadata.isNull()) metadata = telescope["metadata"].to<JsonObject>();
            metadata.remove("az_calibration_valid");
            metadata.remove("az_compass_test_mode");
            metadata.remove("az_encoder_mapping_verified");
            for (JsonPair entry : update.as<JsonObject>()) metadata[entry.key()] = entry.value();
            if (measureJson(telescope) >= sizeof(reply.body)) reply.status = -3;
            else {
              serializeJson(telescope, reply.body, sizeof(reply.body));
              http.end();
              http.begin(client, telescopeUrl);
              http.addHeader("Content-Type", "application/json");
              reply.status = http.PUT((uint8_t *)reply.body, strlen(reply.body));
            }
          }
        }
        reply.body[0] = '\0';
      }
      http.end();
    }
    // One outstanding request: command replies cannot be overwritten by telemetry.
    xQueueSend(networkReplies, &reply, portMAX_DELAY);
  }
}


bool startNetworkWorker() {
  networkRequests = xQueueCreate(1, sizeof(NetworkRequest));
  networkReplies = xQueueCreate(1, sizeof(NetworkReply));
  if (networkRequests && networkReplies
      && xTaskCreatePinnedToCore(networkWorker, "astt-http", 16384, nullptr, 1, nullptr, 0) == pdPASS) return true;
  if (networkRequests) vQueueDelete(networkRequests);
  if (networkReplies) vQueueDelete(networkReplies);
  networkRequests = networkReplies = nullptr;
  return false;
}


bool queueNetworkRequest(NetworkOperation operation, const JsonDocument &doc) {
  if (!networkReady || networkInFlight) return false;
  NetworkRequest request = {};
  request.operation = operation;
  request.createdAt = millis();
  request.generation = networkGeneration;
  if (measureJson(doc) >= sizeof(request.body)) {
    commandMessage = "NETWORK_PAYLOAD_TOO_LARGE";
    return false;
  }
  serializeJson(doc, request.body, sizeof(request.body));
  if (xQueueSend(networkRequests, &request, 0) != pdTRUE) return false;
  networkInFlight = true;
  return true;
}


// Best-effort metadata snapshot; failure never disables local AZ control.
bool publishAzimuthReference() {
  JsonDocument doc;
  doc["az_encoder_min"] = AZ_ENCODER_MIN;
  doc["az_encoder_max"] = AZ_ENCODER_MAX;
  doc["az_encoder_offset"] = azEncoderOffset;
  doc["az_range_temporary"] = false;
  doc["az_reference"] = USE_MANUAL_AZ_REFERENCE ? "MANUAL_ALIGNMENT"
                        : (azNorthReferenceReady ? "compass_estimate" : "encoder");
  doc["az_alignment_verified"] = false;
  doc["magnetic_declination"] = declination;
  doc["mag_declination_supported"] = isfinite(declination);
  return queueNetworkRequest(NetworkOperation::Reference, doc);
}


// Health describes actual sample availability, not a claim of calibrated accuracy.
void updateHealthStatus() {
  if (estopWasActive || !networkReady || !azEncoderValid
      || (!USE_MANUAL_AZ_REFERENCE && (!azHeadingValid || !isfinite(declination)))) {
    healthStatus = "FAULT";
  } else if (!mpuOk || !elMpuOk || !GPS.fix || !azHeadingValid || !isfinite(declination)) {
    healthStatus = "DEGRADED";
  } else healthStatus = "OK";
}


void readSensors() {
  readGPS();
  azEncoderAngle = readAzEncoderAngle();
  mpuOk = readMpu();
  if (mpuOk) updateLevelAngles();
  trueHeading = computeTrueHeading();
  // Manual AZ comes only from the encoder; raw compass heading stays diagnostic.
  azimuthAngle = USE_MANUAL_AZ_REFERENCE ? encoderToTrueAzimuth(azEncoderAngle) : trueHeading;
  elMpuOk = readElevationMpu();
  updateHealthStatus();
}


// The same bounded snapshot is printed locally and stored on its API reading.
String buildDiagnosticLine(float encoderAngle, float encoderTarget, int direction, int azPwm, int elPwm) {
  char line[1024];
  snprintf(line, sizeof(line),
           "ms=%lu health=%s state=%s cmd=%d last_event=%s enc=%.2f az=%.2f el=%.2f target=%.2f/%.2f rawTarget=%.2f dir=%d reqPWM=%d/%d magnetic=%.2f decl=%.4f true=%.2f offset=%.2f ref=%s ENC=%s MAG=%s heading=%s mag_uT=%.2f/%.2f/%.2f MPU=%s accel_ms2=%.2f/%.2f/%.2f gyro_dps=%.2f/%.2f/%.2f base=%.1f/%.1f EL_MPU=%s GPS=%s lat=%.5f lon=%.5f alt_m=%.1f site=%s http_prev(command/reading/metadata)=%d/%d/%d",
           millis(), healthStatus.c_str(), movementStatus.c_str(), lastCommandId, commandMessage.c_str(),
           encoderAngle, azimuthAngle, elevationAngle, apiAzTarget, apiElTarget, encoderTarget,
           direction, azPwm, elPwm, magneticHeading, declination, trueHeading, azEncoderOffset,
           USE_MANUAL_AZ_REFERENCE ? "MANUAL_ALIGNMENT"
             : (azNorthReferenceReady ? "COMPASS_ESTIMATE" : "SENSOR_UNAVAILABLE"),
           azEncoderValid ? "OK" : "ERR", magneticSampleValid ? "OK" : "ERR",
           azHeadingValid ? "LIVE" : "STALE",
           magneticFieldX * 1.0e6f, magneticFieldY * 1.0e6f, magneticFieldZ * 1.0e6f,
           mpuOk ? "OK" : "ERR", mpuAccelX * 9.80665f, mpuAccelY * 9.80665f, mpuAccelZ * 9.80665f,
           mpuGyroX, mpuGyroY, mpuGyroZ, levelRoll, levelPitch,
           elMpuOk ? "OK" : "ERR", GPS.fix ? "FIX" : "NO_FIX", latitude, longitude, altitude,
           GPS.fix ? "GPS" : "DEFAULT", lastCommandHttp, lastReadingHttp, lastMetadataHttp);
  return String(line);
}


void updateDiagnostics(unsigned long now, float encoderAngle, float encoderTarget,
                       int direction, int azPwm, int elPwm) {
  updateHealthStatus();
  serialLog = buildDiagnosticLine(encoderAngle, encoderTarget, direction, azPwm, elPwm);
  if (now - lastDiagnosticTime >= 1000) {
    lastDiagnosticTime = now;
    Serial.println(serialLog);
  }
}


bool postReadings() {
  JsonDocument doc;
  doc["telescope_id"] = telescopeId;
  doc["azimuth_angle"] = azimuthAngle;
  doc["elevation_angle"] = elevationAngle;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["altitude"] = altitude;
  doc["gyroscope_x"] = mpuGyroX;
  doc["gyroscope_y"] = mpuGyroY;
  doc["gyroscope_z"] = mpuGyroZ;
  doc["acceleration_x"] = mpuAccelX * 9.80665f;
  doc["acceleration_y"] = mpuAccelY * 9.80665f;
  doc["acceleration_z"] = mpuAccelZ * 9.80665f;
  doc["magnetic_field_x"] = magneticFieldX;
  doc["magnetic_field_y"] = magneticFieldY;
  doc["magnetic_field_z"] = magneticFieldZ;
  doc["health_status"] = healthStatus;
  doc["movement_status"] = movementStatus;
  doc["serial_log"] = serialLog;

  return queueNetworkRequest(NetworkOperation::Reading, doc);
}


// A repeated ID is a heartbeat, not permission to restart a completed or stopped Point.
bool acceptCommandId(int commandId) {
  if (commandId <= 0) { commandMessage = "INVALID_COMMAND_ID"; return false; }
  if (!commandBaselineReady) {
    startupCommandId = commandId;
    lastCommandId = commandId;
    commandBaselineReady = true;
    commandMessage = "STARTUP_BASELINE_SEND_NEW_COMMAND";
    return false;
  }
  if (commandId <= startupCommandId || commandId < lastCommandId) return false;
  if (commandId == lastCommandId) { lastApiTime = millis(); return false; }
  lastCommandId = commandId;
  return true;
}


void clearCommandTargets() {
  stopAzimuthMotor();
  stopElevationMotor();
  azPointActive = false;
  azPointComplete = false;
  apiAzTarget = -1.0f;
  apiElTarget = -1.0f;
  isTracking = false;
  lastApiTime = 0;
}


void expireCommand(unsigned long now) {
  if ((azPointActive || isTracking || apiElTarget >= 0) && now - lastApiTime >= SOURCE_TIMEOUT) {
    networkGeneration++;
    clearCommandTargets();
    commandMessage = "COMMAND_TIMEOUT_SEND_NEW_COMMAND";
  }
}


void finishAzPoint() {
  stopAzimuthMotor();
  azPointActive = false;
  azPointComplete = true;
  commandMessage = "AZ_POINT_COMPLETE";
}


bool startPoint(float azimuth, float elevation) {
  if (!checkAzimuthFeedback()) return false;
  if (!isfinite(azimuth) || !isfinite(elevation) || azimuth < AZ_MIN || azimuth > AZ_MAX
      || elevation < EL_MIN || elevation > EL_MAX) {
    commandMessage = "POINT_REJECTED_INVALID_ANGLES";
    return false;
  }
  if (inAzimuthNoGoZone(trueAzimuthToEncoder(azimuth))) {
    char reason[120];
    snprintf(reason, sizeof(reason), "POINT_REJECTED_RAW_TARGET_BLOCKED requested=%.2f raw=%.2f",
             azimuth, trueAzimuthToEncoder(azimuth));
    commandMessage = reason;
    return false;
  }
  apiAzTarget = norm360(azimuth);
  apiElTarget = elevation;
  azPointActive = true;
  azPointComplete = false;
  isTracking = false;
  lastApiTime = millis();
  commandMessage = "POINT_ACCEPTED";
  return true;
}


void applyCommandReply(const NetworkReply &reply) {
  lastCommandHttp = reply.status;
  if (lastCommandHttp != 200) {
    if (lastCommandHttp == 404 && !commandBaselineReady) {
      commandBaselineReady = true;
      commandMessage = "NO_COMMAND_SEND_NEW_COMMAND";
    }
    return;
  }


  JsonDocument doc;
  if (deserializeJson(doc, reply.body)) {
    commandMessage = "COMMAND_JSON_ERROR";
    return;
  }

  int commandId = doc["id"] | 0;
  const char* cmdType = doc["command_type"] | "";
  if (strcmp(cmdType, "point") != 0 && strcmp(cmdType, "track") != 0) {
    commandMessage = "UNSUPPORTED_COMMAND_TYPE";
    return;
  }
  if (!acceptCommandId(commandId)) {
    if (commandId == lastCommandId && commandId > startupCommandId) lastApiTime = reply.createdAt;
    return;
  }
  clearCommandTargets();
  if (!checkAzimuthFeedback()) return;

  if (strcmp(cmdType, "point") == 0) {
    float newAz = doc["point"]["target_az_angle"] | -1.0f;
    float newEl = doc["point"]["target_el_angle"] | -1.0f;
    if (startPoint(newAz, newEl)) lastApiTime = reply.createdAt;
  } else if (strcmp(cmdType, "track") == 0) {
    track_m1 = doc["track"]["source"]["m_1"] | 0.0f;
    track_m2 = doc["track"]["source"]["m_2"] | 0.0f;
    track_c1 = doc["track"]["source"]["c_1"] | 0.0f;
    track_c2 = doc["track"]["source"]["c_2"] | 0.0f;
    track_T_ra = doc["track"]["source"]["T_ra"] | 1.0f;
    track_A = doc["track"]["source"]["A"] | 0.0f;
    track_phi = doc["track"]["source"]["phi"] | 0.0f;
    track_D = doc["track"]["source"]["D"] | 0.0f;
    track_T_dec = doc["track"]["source"]["T_dec"] | 1.0f;
    isTracking = true;
    lastCommandId = commandId;
    lastApiTime = reply.createdAt;
    commandMessage = "TRACK_ACCEPTED";
  }


}


// Apply replies only here, after the loop checks current E-stop and feedback.
void receiveNetworkReply(bool estopActive) {
  if (!networkReady) return;
  NetworkReply reply;
  if (xQueueReceive(networkReplies, &reply, 0) != pdTRUE) return;
  networkInFlight = false;
  // Leave a gap after a slow poll so telemetry and metadata also get a turn.
  if (reply.operation == NetworkOperation::Command) lastPollTime = millis();
  if (reply.generation != networkGeneration || millis() - reply.createdAt >= SOURCE_TIMEOUT) return;
  if (reply.operation == NetworkOperation::Command) {
    if (!estopActive) applyCommandReply(reply);
  } else if (reply.operation == NetworkOperation::Reading) lastReadingHttp = reply.status;
  else lastMetadataHttp = reply.status;
}


void serviceNetwork(unsigned long now, bool estopActive) {
  if (!networkReady || networkInFlight) return;
  if (!estopActive && now - lastPollTime >= POLL_INTERVAL) {
    JsonDocument empty;
    if (queueNetworkRequest(NetworkOperation::Command, empty)) lastPollTime = now;
  } else if (now - lastPostTime >= POST_INTERVAL) {
    if (postReadings()) {
      lastPostTime = now;
      metadataPending = true;
    }
  } else if (metadataPending && publishAzimuthReference()) metadataPending = false;
}




// Latch even a brief sampled E-stop; releasing it cannot revive an old command.
void latchEmergencyStop() {
  stopAzimuthMotor();
  stopElevationMotor();
  movementStatus = "ESTOP";
  healthStatus = "FAULT";
  if (!estopWasActive) {
    networkGeneration++;
    clearCommandTargets();
    startupCommandId = lastCommandId;
    commandBaselineReady = false;
    azNorthReferenceReady = false;
    commandMessage = "ESTOP_ACTIVE_TARGETS_CLEARED";
  }
  estopWasActive = true;
}


// ================= setup =================


void setup() {
  Serial.begin(115200);
  pinMode(AZ_IN1, OUTPUT);
  pinMode(AZ_IN2, OUTPUT);
  pinMode(AZ_ENA, OUTPUT);
  pinMode(EL_IN1, OUTPUT);
  pinMode(EL_IN2, OUTPUT);
  pinMode(EL_ENA, OUTPUT);
  pinMode(AZ_ENCODER_PIN, INPUT);
  pinMode(ESTOP_PIN, INPUT_PULLUP);
  stopAzimuthMotor();
  stopElevationMotor();
  // Also initialize telemetry if the encoder is temporarily unavailable at boot.
  if (USE_MANUAL_AZ_REFERENCE) azEncoderOffset = norm360(-encoderAtNorth);
  if (USE_MANUAL_AZ_REFERENCE) {
    Serial.printf("MANUAL_ALIGNMENT: level base and north-align at encoder %.2f before commands; accuracy unverified\n",
                  encoderAtNorth);
  } else Serial.println("AZ compass estimate: keep sensor level; magnetic calibration deferred");


  pinMode(I2C_SDA, INPUT_PULLUP);
  pinMode(I2C_SCL, INPUT_PULLUP);
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(20);


  GPS.begin(0x10);
  GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
  GPS.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);


  // One-second power-up/retry and continuous reads run in loop(), never a wait loop.
  magOk = false;

  mpuOk = initMpu(MPU_ADDR) && readMpu();
  if (mpuOk) updateLevelAngles();
  if (mpuOk) Serial.println("mpu6050 ready");
  else Serial.println("no mpu6050");

  elMpuOk = initMpu(EL_MPU_ADDR) && readElevationMpu();
  if (elMpuOk) Serial.println("elevation mpu6050 ready");
  else Serial.println("no elevation mpu6050");


  connectWifi();
  syncNTP();
  networkReady = startNetworkWorker();
  if (!networkReady) commandMessage = "NETWORK_WORKER_UNAVAILABLE_OUTPUTS_DISABLED";


  azEncoderAngle = readAzEncoderAngle();
  if (USE_MANUAL_AZ_REFERENCE) setAzimuthReference(azEncoderAngle, NAN);


  Serial.println("ready");
}




// ================= loop =================


void loop() {
  unsigned long now = millis();


  bool estopActive = digitalRead(ESTOP_PIN) == LOW;
  if (estopActive) {
    latchEmergencyStop();
    readSensors();
    updateDiagnostics(now, azEncoderAngle, -1.0f, 0, 0, 0);
    receiveNetworkReply(true);
    serviceNetwork(millis(), true);
    delay(10);
    return;
  }

  if (estopWasActive) {
    networkGeneration++;
    metadataPending = true;
    lastPollTime = millis() - POLL_INTERVAL;
    commandMessage = "ESTOP_RELEASED_SEND_NEW_COMMAND";
  }
  estopWasActive = false;
  readSensors();
  // Sensor reads can wait for a pulse/I2C response. Never drive past a new E-stop.
  if (digitalRead(ESTOP_PIN) == LOW) {
    latchEmergencyStop();
    return;
  }
  expireCommand(millis());
  float azCurrent = azEncoderAngle;
  if (!USE_MANUAL_AZ_REFERENCE
      && (!isfinite(declination) || (!azPointActive && !isTracking && !azHeadingValid))) {
    azNorthReferenceReady = false;
  }
  setAzimuthReference(azCurrent, trueHeading);
  if ((!networkReady || !azNorthReferenceReady || !azEncoderValid)
      && (azPointActive || isTracking || apiElTarget >= 0)) {
    networkGeneration++;
    clearCommandTargets();
    commandMessage = "FEEDBACK_LOST_SEND_NEW_COMMAND";
  }
  receiveNetworkReply(false);
  now = millis();


  // tracking keeps recomputing its own target
  if (isTracking) {
    float computed = computeAzFromSource();
    if (computed < 0) {
      isTracking = false;
      apiAzTarget = -1.0f;
      apiElTarget = -1.0f;
      commandMessage = "TRACK_FAILED_CLOCK_OR_PARAMETERS";
    } else {
      apiAzTarget = computed;
      apiElTarget = (trackEl >= EL_MIN && trackEl <= EL_MAX) ? trackEl : -1.0f;
      if (apiElTarget < 0) commandMessage = "TRACK_SOURCE_OUTSIDE_EL_RANGE";
    }
  }


  bool azTargetFresh = (apiAzTarget >= AZ_MIN && apiAzTarget <= AZ_MAX)
                       && (now - lastApiTime < SOURCE_TIMEOUT);
  float azTarget = apiAzTarget;
  float azTargetEncoder = -1.0;
  float azError = 0.0;
  int azPwm = 0;
  int azDirection = 0;

  bool referenceReady = networkReady && azNorthReferenceReady && commandBaselineReady;
  if (!referenceReady || !azEncoderValid) {
    stopAzimuthMotor();
    movementStatus = referenceReady ? "AZ ENCODER UNAVAILABLE" : "AZ FEEDBACK UNAVAILABLE";
  } else if (!azTargetFresh || (!isTracking && !azPointActive)) {
    stopAzimuthMotor();
    movementStatus = azPointComplete ? "AZ POINT COMPLETE" : "IDLE";
    if (azPointComplete) azError = fabs(signedAngleDifference(encoderToTrueAzimuth(azCurrent), apiAzTarget));
  } else {
    azTarget = norm360(apiAzTarget);

    // Convert true azimuth to raw encoder degrees before applying mechanical limits.
    azTargetEncoder = trueAzimuthToEncoder(azTarget);
    azDirection = chooseDirection(azCurrent, azTargetEncoder);

    if (azDirection == 0) {
      stopAzimuthMotor();
      azPointActive = false;
      movementStatus = inAzimuthNoGoZone(azCurrent) ? "AZ POSITION BLOCKED" : "AZ TARGET BLOCKED";
      commandMessage = movementStatus;
    } else {
      azError = (azDirection > 0)
                ? cwDistance(azCurrent, azTargetEncoder)
                : cwDistance(azTargetEncoder, azCurrent);
      azPwm = computeAzimuthPwm(azError);

      if (azPwm == 0) {
        stopAzimuthMotor();
        if (!isTracking) finishAzPoint();
        movementStatus = "IDLE";
      } else {
        driveAzimuthMotor(azPwm, azDirection);
        movementStatus = isTracking ? "TRACKING" : "MOVING";
      }
    }
  }


  bool elTargetFresh = (apiElTarget >= EL_MIN && apiElTarget <= EL_MAX)
                       && (now - lastApiTime < SOURCE_TIMEOUT);
  float elError = 0.0;
  int elPwm = 0;

  if (!referenceReady || !mpuOk || !elMpuOk || !elTargetFresh) {
    stopElevationMotor();
  } else {
    float signedElError = apiElTarget - elevationAngle;
    elError = fabs(signedElError);
    int elDirection = (signedElError >= 0) ? 1 : -1;
    elPwm = computeElevationPwm(elError);

    bool atLowerLimit = elDirection < 0 && elevationAngle <= EL_MIN;
    bool atUpperLimit = elDirection > 0 && elevationAngle >= EL_MAX;
    if (elPwm == 0 || atLowerLimit || atUpperLimit) {
      stopElevationMotor();
    } else {
      driveElevationMotor(elPwm, elDirection);
      if (movementStatus == "IDLE") {
        movementStatus = isTracking ? "TRACKING" : "MOVING";
      }
    }
  }

  if (referenceReady && azEncoderValid && mpuOk && elMpuOk && azTargetFresh && elTargetFresh
      && !isTracking && azPointComplete && azPwm == 0 && elPwm == 0
      && azError < AZ_TOLERANCE && elError < EL_TOLERANCE) {
    movementStatus = "ON TARGET";
  }

  updateDiagnostics(now, azCurrent, azTargetEncoder, azDirection, azPwm, elPwm);


  serviceNetwork(millis(), false);
  delay(1);  // Yield without interrupting the PWM outputs.


}
/*
Operator-verified raw stops: 137.8° and 37.8°, clockwise 1:1 encoder mapping.
Raw allowed travel: 137.8° through 360/0° to 37.8°; limits do not include the north offset.
No-go zone: between 37.8° and 137.8°, excluding the endpoints.
Manual north is the permitted-arc midpoint 267.8°, physically aligned by the operator.
Manual UI/readings use encoder + fixed offset; Point targets subtract that offset.
Compass readings never overwrite the manual reference. Absolute accuracy is unqualified.
No startup movement; phone alignment is an operator precondition, not sensed by firmware.
*/
