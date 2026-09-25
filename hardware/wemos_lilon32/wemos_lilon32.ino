#include <Wire.h>
#include <math.h>
#include <WiFi.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GPS.h>
#include <time.h>
#include <SparkFun_MMC5983MA_Arduino_Library.h>


// ---------- wifi and api ----------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* commandsUrl = "http://YOUR_BACKEND_IP:8000/api/v1/commands/7/latest";
const char* readingsUrl = "http://YOUR_BACKEND_IP:8000/api/v1/readings";
const char* ntpServer = "pool.ntp.org";
int telescopeId = 7;




// ---------- pins ----------
const int IN1 = 25;
const int IN2 = 26;
const int ENA = 27;
const int EL_IN3 = 32;
const int EL_IN4 = 33;
const int EL_ENB = 18;
const int EL_ENCODER_PIN = 35;  // reserved for a future input-only encoder
const int potPin = 34;  // adc1, input only, safe with wifi
const int encPin = 19;
const int estopPin = 23;


// ---------- azimuth range ----------
// full circle is allowed except the blocked zone, which is where cables
// or hardstops live. the blocked zone may wrap through 0.
const float AZ_MIN = 0.0;
const float AZ_MAX = 360.0;
const float BLOCK_START = 360.0;  // start of blocked zone, going cw
const float BLOCK_END = 139.00;   // end of blocked zone, going cw


// ---------- motor control ----------
const float TOLERANCE = 1.0;    // deg, closer than this counts as arrived
const float RAMP_RANGE = 60.0;  // deg of error that gives full power
const int MIN_PWM = 140;        // below this the motor just hums
const int MAX_PWM = 255;


// ---------- elevation control ----------
const float EL_MIN = 0.0;
const float EL_MAX = 90.0;
const float EL_TOLERANCE = 1.0;
const float EL_RAMP_RANGE = 30.0;
const float EL_MPU_SIGN = 1.0;     // reverse if the measured angle moves backwards
const float EL_ZERO_OFFSET = 0.0;  // set after the horizontal position is measured


// ---------- encoder ----------
const int ENC_SAMPLES = 7;        // odd number, we take the median
const float ENC_SMOOTHING = 0.5;  // 0 is no smoothing, 1 never updates
const float MAG_CORRECTION_GAIN = 0.02;
const float GYRO_STATIONARY_DPS = 1.5;
float encAngle = 0.0;
float azEncoderOffset = 0.0;
bool azReferenceReady = false;


// ---------- potentiometer ----------
const float POT_THRESHOLD = 4.0;  // deg of movement before we call it a change
float potTarget = 0.0;


// ---------- command arbitration ----------
const unsigned long SOURCE_TIMEOUT = 10000;
float apiTarget = -1.0;
float apiElTarget = -1.0;
unsigned long lastPotTime = 0;
unsigned long lastApiTime = 0;


// ---------- tracking ----------
bool isTracking = false;
float track_m1 = 0, track_m2 = 0;
float track_c1 = 0, track_c2 = 0;
float track_T_ra = 0, track_T_dec = 0;
float track_A = 0, track_phi = 0, track_D = 0;


// ---------- estop ----------
bool estopState = false;
bool lastButton = HIGH;


// ---------- network timing ----------
const unsigned long POST_INTERVAL = 5000;
const unsigned long POLL_INTERVAL = 2000;
unsigned long lastPostTime = 0;
unsigned long lastPollTime = 0;


// ---------- readings sent to backend ----------
float azimuthAngle = 0.0;
float elevationAngle = 0.0;
// site defaults, readGPS overwrites these only when it gets a fix
float latitude = -33.944481;
float longitude = 18.478685;
float altitude = 50.0;
String healthStatus = "OK";
String movementStatus = "IDLE";


// ---------- level antenna sensors ----------
// The MPU6050 shares the SDA/SCL I2C bus with the GPS and magnetometer.
const int I2C_SDA = 21;
const int I2C_SCL = 22;
Adafruit_GPS GPS(&Wire);
SFE_MMC5983MA myMag;
bool magOk = false;

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
float magneticFieldX = 0.0;
float magneticFieldY = 0.0;
float magneticFieldZ = 0.0;

float magneticDeclination = -25.6;
float headingOffset = 90.0;
float DEFAULT_HEADING = 0.0;   // used when magnetometer is absent or not yet calibrated
const float MAG_MIN_CALIBRATION_SPAN = 5000.0;
float trueHeading = DEFAULT_HEADING;
float levelRoll = 0.0;
float levelPitch = 0.0;

bool calibrated = false;
unsigned long calibStartTime = 0;
uint32_t minX = 4294967295, minY = 4294967295;
uint32_t maxX = 0, maxY = 0;
float offX = 0, offY = 0, offZ = 0;
float scaleX = 1, scaleY = 1, scaleZ = 1;

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


bool readElevationMpu() {
  float gyroX, gyroY, gyroZ;
  if (!readMpuValues(EL_MPU_ADDR, elMpuAccelX, elMpuAccelY, elMpuAccelZ,
                     gyroX, gyroY, gyroZ)) {
    return false;
  }

  float angle = atan2(-elMpuAccelX,
                      sqrt(elMpuAccelY * elMpuAccelY + elMpuAccelZ * elMpuAccelZ));
  elevationAngle = constrain(EL_MPU_SIGN * angle * 180.0f / PI + EL_ZERO_OFFSET,
                             EL_MIN, EL_MAX);
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


// distance going clockwise from a to b
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
  if (!azReferenceReady) return norm360(encoderAngle);
  return norm360(encoderAngle + azEncoderOffset);
}


float trueAzimuthToEncoder(float trueAzimuth) {
  if (!azReferenceReady) return norm360(trueAzimuth);
  return norm360(trueAzimuth - azEncoderOffset);
}


void updateAzimuthReference(float encoderAngle) {
  if (!magOk || !calibrated || !mpuOk) return;
  if (fabs(mpuGyroZ) > GYRO_STATIONARY_DPS) return;
  if (movementStatus != "IDLE") return;

  if (!azReferenceReady) {
    azEncoderOffset = norm360(trueHeading - encoderAngle);
    azReferenceReady = true;
    Serial.printf("az reference ready offset %.1f\n", azEncoderOffset);
    return;
  }

  float encoderHeading = encoderToTrueAzimuth(encoderAngle);
  float correction = signedAngleDifference(encoderHeading, trueHeading);
  azEncoderOffset = norm360(azEncoderOffset + MAG_CORRECTION_GAIN * correction);
}


bool inBlockedZone(float angle) {
  float a = norm360(angle);
  if (BLOCK_START <= BLOCK_END) {
    return a >= BLOCK_START && a <= BLOCK_END;
  }
  // zone wraps through 0
  return a >= BLOCK_START || a <= BLOCK_END;
}


// walk the path one degree at a time and see if it enters the blocked zone
bool pathIsBlocked(float from, float to, int direction) {
  float dist = (direction > 0) ? cwDistance(from, to) : cwDistance(to, from);
  for (float step = 0; step <= dist; step += 1.0) {
    float here = (direction > 0) ? from + step : from - step;
    if (inBlockedZone(here)) return true;
  }
  return false;
}


// +1 is clockwise, -1 is counter clockwise, 0 means no safe path
int chooseDirection(float current, float target) {
  float cw = cwDistance(current, target);
  float ccw = cwDistance(target, current);


  bool cwOk = !pathIsBlocked(current, target, 1);
  bool ccwOk = !pathIsBlocked(current, target, -1);


  if (cwOk && ccwOk) return (cw <= ccw) ? 1 : -1;  // both clear, take shorter
  if (cwOk) return 1;
  if (ccwOk) return -1;
  return 0;
}




// ================= encoder =================


// read the pwm duty cycle and turn it into an angle.
// takes the median of several samples so one bad pulse cannot move the value.
float readEncoderAngle() {
  float samples[ENC_SAMPLES];
  int valid = 0;


  for (int i = 0; i < ENC_SAMPLES; i++) {
    unsigned long hi = pulseIn(encPin, HIGH, 25000);
    unsigned long lo = pulseIn(encPin, LOW, 25000);
    if (hi + lo == 0) continue;
    samples[valid] = ((float)hi / (float)(hi + lo)) * 360.0;
    valid++;
  }


  if (valid == 0) return encAngle;


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


  // light smoothing, keeps motion continuous without staircasing
  encAngle = (ENC_SMOOTHING * encAngle) + ((1.0 - ENC_SMOOTHING) * median);
  return norm360(encAngle);
}


// ================= magnetometer =================

// returns a tilt-compensated true heading in degrees.
// until calibration is valid, keep the previous heading and use encoder-only control.
float computeTrueHeading() {
  if (!magOk) {
    magOk = myMag.begin();
    if (magOk) myMag.softReset();
    else return trueHeading;
  }

  uint32_t rawX, rawY, rawZ;
  myMag.getMeasurementXYZ(&rawX, &rawY, &rawZ);
  // MMC5983 output is unsigned 18-bit counts centered at 131072.
  // 0.00625 mG/LSB = 6.25e-10 T/LSB.
  magneticFieldX = ((float)rawX - 131072.0f) * 6.25e-10f;
  magneticFieldY = ((float)rawY - 131072.0f) * 6.25e-10f;
  magneticFieldZ = ((float)rawZ - 131072.0f) * 6.25e-10f;

  if (!calibrated) {
    if (rawX < minX) minX = rawX;
    if (rawY < minY) minY = rawY;
    if (rawX > maxX) maxX = rawX;
    if (rawY > maxY) maxY = rawY;

    if (millis() - calibStartTime > 20000) {
      float spanX = (float)(maxX - minX);
      float spanY = (float)(maxY - minY);
      if (spanX >= MAG_MIN_CALIBRATION_SPAN && spanY >= MAG_MIN_CALIBRATION_SPAN) {
        offX = (maxX + minX) / 2.0;
        offY = (maxY + minY) / 2.0;
        offZ = 131072.0;
        scaleX = spanX / 2.0;
        scaleY = spanY / 2.0;
        scaleZ = (scaleX + scaleY) / 2.0;
        calibrated = true;
        Serial.println("mag calibrated; true-north reference available");
      }
    }
    return trueHeading;
  }

  if (!mpuOk) return trueHeading;

  float cx = ((float)rawX - offX) / scaleX;
  float cy = ((float)rawY - offY) / scaleY;
  float cz = ((float)rawZ - offZ) / scaleZ;

  // The fixed MPU removes the small roll and pitch left after manual levelling.
  float roll = atan2(mpuAccelY, mpuAccelZ);
  float pitch = atan2(-mpuAccelX,
                      sqrt(mpuAccelY * mpuAccelY + mpuAccelZ * mpuAccelZ));
  levelRoll = roll * 180.0 / PI;
  levelPitch = pitch * 180.0 / PI;
  float horizontalX = cx * cos(pitch) + cz * sin(pitch);
  float horizontalY = cx * sin(roll) * sin(pitch)
                      + cy * cos(roll)
                      - cz * sin(roll) * cos(pitch);

  float heading = norm360(atan2(horizontalX, -horizontalY) * 180.0 / PI
                          + 180.0 + headingOffset);
  return norm360(heading + magneticDeclination);
}

// ================= potentiometer =================


// esp32 adc is 12 bit, so the raw range is 0 to 4095
float readPotAngle() {
  long sum = 0;
  for (int i = 0; i < 8; i++) sum += analogRead(potPin);
  float raw = sum / 8.0;
  return (raw / 4095.0) * 360.0;
}




// ================= motor =================


void stopMotor() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0);
}


void stopElevationMotor() {
  digitalWrite(EL_IN3, LOW);
  digitalWrite(EL_IN4, LOW);
  analogWrite(EL_ENB, 0);
}


void driveMotor(int pwm, int direction) {
  if (direction > 0) {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
  } else {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
  }
  analogWrite(ENA, pwm);
}


void driveElevationMotor(int pwm, int direction) {
  if (direction > 0) {
    digitalWrite(EL_IN3, HIGH);
    digitalWrite(EL_IN4, LOW);
  } else {
    digitalWrite(EL_IN3, LOW);
    digitalWrite(EL_IN4, HIGH);
  }
  analogWrite(EL_ENB, pwm);
}


// bigger error means more power, but never below MIN_PWM or we just hum
int computePwm(float errorSize) {
  if (errorSize < TOLERANCE) return 0;
  float scale = errorSize / RAMP_RANGE;
  if (scale > 1.0) scale = 1.0;
  return MIN_PWM + (int)((MAX_PWM - MIN_PWM) * scale);
}


int computeElevationPwm(float errorSize) {
  if (errorSize < EL_TOLERANCE) return 0;
  float scale = errorSize / EL_RAMP_RANGE;
  if (scale > 1.0) scale = 1.0;
  return MIN_PWM + (int)((MAX_PWM - MIN_PWM) * scale);
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


void postReadings() {
  if (WiFi.status() != WL_CONNECTED) return;


  WiFiClient client;
  HTTPClient http;
  http.begin(client, readingsUrl);
  http.addHeader("Content-Type", "application/json");


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


  String payload;
  serializeJson(doc, payload);
  Serial.printf("GPS lat %.5f lon %.5f alt %.1f m fix %d\n", latitude, longitude, altitude, GPS.fix);
  Serial.printf("MPU accel %.4f %.4f %.4f m/s2, gyro %.2f %.2f %.2f deg/s (%s)\n",
                mpuAccelX * 9.80665f, mpuAccelY * 9.80665f, mpuAccelZ * 9.80665f,
                mpuGyroX, mpuGyroY, mpuGyroZ,
                mpuOk ? "OK" : "NOT FOUND");
  Serial.printf("MAG %.8f %.8f %.8f T (%s)\n",
                magneticFieldX, magneticFieldY, magneticFieldZ, magOk ? "OK" : "NOT FOUND");
  int responseCode = http.POST(payload);
  Serial.printf("readings POST %d: %s\n", responseCode, payload.c_str());
  http.end();
}


void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;


  WiFiClient client;
  HTTPClient http;
  http.begin(client, commandsUrl);


  if (http.GET() != 200) {
    http.end();
    return;
  }


  JsonDocument doc;
  if (deserializeJson(doc, http.getString())) {
    http.end();
    return;
  }


  const char* cmdType = doc["command_type"] | "";


  if (strcmp(cmdType, "point") == 0) {
    float newAz = doc["point"]["target_az_angle"] | -1.0f;
    float newEl = doc["point"]["target_el_angle"] | -1.0f;
    if (newAz >= 0 && newAz <= 360 && newEl >= EL_MIN && newEl <= EL_MAX) {
      apiTarget = norm360(newAz);
      apiElTarget = newEl;
      lastApiTime = millis();
      isTracking = false;
      Serial.printf("point az %.1f el %.1f\n", apiTarget, apiElTarget);
    }
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
    lastApiTime = millis();
    Serial.println("track");
  }


  http.end();
}




// ================= setup =================


void setup() {
  Serial.begin(115200);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(EL_IN3, OUTPUT);
  pinMode(EL_IN4, OUTPUT);
  pinMode(EL_ENB, OUTPUT);
  pinMode(potPin, INPUT);
  pinMode(encPin, INPUT);
  pinMode(estopPin, INPUT_PULLUP);
  stopMotor();
  stopElevationMotor();


  pinMode(I2C_SDA, INPUT_PULLUP);
  pinMode(I2C_SCL, INPUT_PULLUP);
  Wire.begin(I2C_SDA, I2C_SCL);


  GPS.begin(0x10);
  GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
  GPS.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);


  magOk = myMag.begin();
  if (magOk) myMag.softReset();
  else Serial.println("no magnetometer");

  mpuOk = initMpu(MPU_ADDR) && readMpu();
  if (mpuOk) Serial.println("mpu6050 ready");
  else Serial.println("no mpu6050");

  elMpuOk = initMpu(EL_MPU_ADDR) && readElevationMpu();
  if (elMpuOk) Serial.println("elevation mpu6050 ready");
  else Serial.println("no elevation mpu6050");


  connectWifi();
  syncNTP();


  // start the pot target where the knob already is, so we do not
  // immediately think the user turned it
  potTarget = readPotAngle();
  encAngle = readEncoderAngle();
  lastPotTime = millis();


  calibStartTime = millis();
  Serial.println("ready");
}




// ================= loop =================


void loop() {
  unsigned long now = millis();


  readGPS();


  // estop
  bool button = digitalRead(estopPin);
  if (button == LOW && lastButton == HIGH) {
    estopState = !estopState;
    delay(10);
  }
  lastButton = button;


  if (estopState) {
    stopMotor();
    stopElevationMotor();
    movementStatus = "ESTOP";
    healthStatus = "FAULT";
    Serial.println("estop");
    delay(10);
    return;
  }
  healthStatus = "OK";


  // The encoder is the fast mechanical position used by the motor loop.
  float current = readEncoderAngle();

  if (!readMpu()) {
    if (mpuOk) Serial.println("mpu6050 read failed");
    mpuOk = false;
  } else {
    if (!mpuOk) Serial.println("mpu6050 detected");
    mpuOk = true;
  }

  // The magnetometer supplies true north. The fixed MPU compensates small tilt.
  trueHeading = computeTrueHeading();
  updateAzimuthReference(current);
  azimuthAngle = encoderToTrueAzimuth(current);

  if (!readElevationMpu()) {
    if (elMpuOk) Serial.println("elevation mpu6050 read failed");
    elMpuOk = false;
  } else {
    if (!elMpuOk) Serial.println("elevation mpu6050 detected");
    elMpuOk = true;
  }


  // did the user turn the knob
  float pot = readPotAngle();
  pot = 180;
  if (fabs(pot - potTarget) > POT_THRESHOLD) {
    potTarget = pot;
    lastPotTime = now;
    isTracking = false;
  }


  // tracking keeps recomputing its own target
  if (isTracking) {
    float computed = computeAzFromSource();
    if (computed < 0) {
      isTracking = false;
      apiElTarget = -1.0f;
      Serial.println("track failed, clock or params bad");
    } else {
      apiTarget = computed;
      apiElTarget = (trackEl >= EL_MIN && trackEl <= EL_MAX) ? trackEl : -1.0f;
      lastApiTime = now;
      if (apiElTarget < 0) Serial.printf("source outside elevation range el %.1f\n", trackEl);
    }
  }


  // whichever source spoke most recently wins
  bool apiFresh = (apiTarget >= 0) && (now - lastApiTime < SOURCE_TIMEOUT);
  bool potFresh = (now - lastPotTime < SOURCE_TIMEOUT);


  float target;
  const char* source;
  if (apiFresh && (!potFresh || lastApiTime > lastPotTime)) {
    target = apiTarget;
    source = "api";
  } else {
    target = potTarget;
    source = "pot";
  }
  target = norm360(target);

  // Targets are true azimuth. Convert them to the encoder's mechanical frame so
  // the encoder can control movement and protect the configured blocked zone.
  float targetEncoder = trueAzimuthToEncoder(target);
  float error = fabs(cwDistance(current, targetEncoder));
  if (error > 180.0) error = 360.0 - error;


  int pwm = computePwm(error);
  int dir = chooseDirection(current, targetEncoder);


  if (pwm == 0) {
    stopMotor();
    movementStatus = "IDLE";
  } else if (dir == 0) {
    stopMotor();
    movementStatus = "NO PATH";
  } else {
    driveMotor(pwm, dir);
    movementStatus = isTracking ? "TRACKING" : "MOVING";
  }


  bool elApiFresh = (apiElTarget >= EL_MIN && apiElTarget <= EL_MAX) && (now - lastApiTime < SOURCE_TIMEOUT);
  float elError = 0.0;
  int elPwm = 0;

  if (!elMpuOk || !elApiFresh) {
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

  Serial.printf("enc %.1f az %.1f tgt %.1f mag %.1f gyroZ %.1f level %.1f/%.1f el %.1f tgt %.1f err %.1f pwm %d/%d ref %s %s %s\n",
                current, azimuthAngle, target, trueHeading, mpuGyroZ, levelRoll, levelPitch,
                elevationAngle, apiElTarget, error, pwm, elPwm,
                azReferenceReady ? "MAG" : "ENC", source, movementStatus.c_str());


  // network
  if (now - lastPostTime >= POST_INTERVAL) {
    lastPostTime = now;
    postReadings();
  }
  if (now - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = now;
    pollCommands();
  }



}
