#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <Adafruit_GPS.h>
#include <SparkFun_MMC5983MA_Arduino_Library.h>

// ---------- Existing connections: unchanged ----------
const int I2C_SDA = 21;
const int I2C_SCL = 22;

Adafruit_GPS GPS(&Wire);  // Existing I2C GPS at address 0x10.
SFE_MMC5983MA myMag;

bool gpsReady = false;
bool magReady = false;
unsigned long lastGpsMessage = 0;

// ---------- Compass mounting ----------
// Initial convention: sensor +X points forward, +Y points left.
// Keep the sensor level.
// If clockwise rotation DECREASES the reading, change SIGN to -1.
const float HEADING_SIGN = 1.0f;
const float MOUNTING_OFFSET_DEG = 0.0f;

// ---------- Declination model: fixed site, 2026–2027 ----------
// Coefficients fitted at this location and 6 m altitude.
const float SITE_LAT = -33.944440f;
const float SITE_LON = 18.479819f;
const float SITE_TOLERANCE_DEG = 0.02f;

// Used ONLY when no recent GPS date is available.
// This is a labelled test date, not a live clock.
const float DEMO_DECIMAL_YEAR = 2026.81f;

// ---------- Latest magnetic vector, in microtesla ----------
float magX = 0.0f;
float magY = 0.0f;
float magZ = 0.0f;


// Keep angles between 0 and 360 degrees.
float wrap360(float angle) {
  angle = fmodf(angle, 360.0f);
  return angle < 0.0f ? angle + 360.0f : angle;
}


// Initialize once; measurements then run automatically.
bool initializeMagnetometer() {
  if (!myMag.begin(Wire)) return false;
  if (!myMag.softReset()) return false;
  if (!myMag.enableAutomaticSetReset()) return false;
  if (!myMag.setFilterBandwidth(100)) return false;
  if (!myMag.setContinuousModeFrequency(20)) return false;

  return myMag.enableContinuousMode();
}


// Keep processing GPS data without waiting for a satellite fix.
void readGPS() {
  if (!gpsReady) return;

  GPS.read();

  if (GPS.newNMEAreceived() && GPS.parse(GPS.lastNMEA())) {
    lastGpsMessage = millis();
  }
}


bool gpsIsFresh() {
  return gpsReady && lastGpsMessage != 0 &&
         millis() - lastGpsMessage < 5000;
}


// Convert GPS UTC date/time into a decimal year.
float gpsDecimalYear() {
  if (!gpsIsFresh() || GPS.year == 0 ||
      GPS.month < 1 || GPS.month > 12) {
    return NAN;
  }

  int year = 2000 + GPS.year;
  bool leap = year % 4 == 0 &&
              (year % 100 != 0 || year % 400 == 0);

  const int daysPerMonth[] = {
    31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  };

  int monthDays = daysPerMonth[GPS.month - 1] +
                  (leap && GPS.month == 2);

  if (GPS.day < 1 || GPS.day > monthDays) return NAN;

  int days = GPS.day - 1;

  for (int month = 1; month < GPS.month; month++) {
    days += daysPerMonth[month - 1];
    if (leap && month == 2) days++;
  }

  float dayFraction =
      (GPS.hour * 3600.0f + GPS.minute * 60.0f + GPS.seconds)
      / 86400.0f;

  return year + (days + dayFraction) / (leap ? 366.0f : 365.0f);
}


// Read the latest continuous measurement and update X/Y/Z.
bool readMagnetometer() {
  uint32_t x, y, z;

  if (!myMag.readFieldsXYZ(&x, &y, &z)) return false;

  // Reject invalid or saturated measurements.
  if (x == 0 || x >= 262143 ||
      y == 0 || y >= 262143 ||
      z == 0 || z >= 262143) {
    return false;
  }

  // 18-bit midpoint: 131072.
  // Sensitivity: 16384 counts/gauss; 1 gauss = 100 microtesla.
  const float microteslaPerCount = 100.0f / 16384.0f;

  magX = (float(x) - 131072.0f) * microteslaPerCount;
  magY = (float(y) - 131072.0f) * microteslaPerCount;
  magZ = (float(z) - 131072.0f) * microteslaPerCount;

  return hypotf(magX, magY) > 0.01f;
}


// Calculate the heading of the chosen sensor-forward direction.
float magneticHeading() {
  float angle = atan2f(magY, magX) * 180.0f / PI;

  return wrap360(HEADING_SIGN * angle + MOUNTING_OFFSET_DEG);
}


// Fixed-site quadratic. Do not extrapolate outside the checked years.
float magneticDeclination(float year) {
  if (!isfinite(year) || year < 2026.0f || year >= 2028.0f) {
    return NAN;
  }

  const float t = year - 2026.0f;

  return (0.000701527468f * t - 0.233941823368f) * t
         - 26.6704347739f;
}


// Calculate and print the compass result.
void printCompass() {
  float year = gpsDecimalYear();
  bool gpsTime = isfinite(year);

  if (!gpsTime) year = DEMO_DECIMAL_YEAR;

  bool gpsPosition = gpsIsFresh() && GPS.fix;

  bool outsideSite = gpsPosition &&
      (fabsf(GPS.latitudeDegrees - SITE_LAT) > SITE_TOLERANCE_DEG ||
       fabsf(GPS.longitudeDegrees - SITE_LON) > SITE_TOLERANCE_DEG);

  float magnetic = magneticHeading();
  float declination = magneticDeclination(year);
  float heading = wrap360(magnetic + declination);

  Serial.printf(
      "X=%.2f Y=%.2f Z=%.2f uT | MAG=%.1f | ",
      magX, magY, magZ, magnetic
  );

  if (outsideSite) {
    Serial.print("TRUE=unavailable: outside fitted site | ");
  } else if (!isfinite(declination)) {
    Serial.print("TRUE=unavailable: date outside 2026-2027 | ");
  } else {
    Serial.printf("D=%.3f | TRUE=%.1f | ", declination, heading);
  }

  Serial.printf(
      "year=%.4f (%s)",
      year, gpsTime ? "GPS" : "DEMO DATE"
  );

  if (gpsPosition) {
    Serial.printf(
        " | GPS=%.6f,%.6f\n",
        GPS.latitudeDegrees, GPS.longitudeDegrees
    );
  } else {
    Serial.println(" | position=ASSUMED TEST SITE");
  }
}


// Try once per second until initialization succeeds.
// Also allows one second for power-up before the first attempt.
bool ensureMagnetometerReady() {
  static unsigned long lastAttempt = 0;
  static unsigned long initializedAt = 0;

  if (!magReady) {
    if (millis() - lastAttempt < 1000) return false;
    lastAttempt = millis();

    magReady = initializeMagnetometer();

    if (!magReady) {
      Serial.println("Magnetometer not ready; retrying in 1 second.");
      return false;
    }

    initializedAt = millis();
    Serial.println("Magnetometer ready.");
  }

  // Allow continuous mode to produce readings after initialization.
  return millis() - initializedAt >= 100;
}


void setup() {
  Serial.begin(115200);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(20);

  // Magnetometer initialization now happens in loop(), with retries.
  Serial.println("Starting compass; waiting for magnetometer power-up.");

  gpsReady = GPS.begin(0x10);

  if (gpsReady) {
    GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
    GPS.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);
  }

  Serial.println(
      gpsReady ? "GPS connected; listening for date/location."
               : "GPS unavailable; using labelled demo date/site."
  );

  Serial.println("Keep the sensor level and motor power disconnected.");
}


void loop() {
  readGPS();

  if (!ensureMagnetometerReady()) return;

  // Display readings five times per second.
  static unsigned long lastOutput = 0;
  if (millis() - lastOutput < 200) return;
  lastOutput = millis();

  if (!readMagnetometer()) {
    Serial.println("Invalid magnetic reading; no heading reported.");

    // Reinitialize if communication is lost, not just because a
    // measurement is saturated or otherwise invalid.
    if (!myMag.isConnected()) magReady = false;

    return;
  }

  // Uses XYZ to show total field strength.
  // This is a diagnostic, NOT tilt compensation.
  float fieldStrength =
      sqrtf(magX * magX + magY * magY + magZ * magZ);

  Serial.printf("B=%.2f uT | ", fieldStrength);
  printCompass();
}


// TEST ONLY: no motors, encoder, Wi-Fi, API or calibration sweep.
// This is an uncalibrated, level-compass estimate.
// GPS supplies date/time and checks proximity to the fitted location.
// GPS coordinates do NOT refit the polynomial.
// Validate direction, mounting and interference before integration.
