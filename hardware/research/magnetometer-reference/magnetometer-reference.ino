// =====================================================================
// True North heading with hard-iron + soft-iron calibration
// (SIMPLE version: independent per-axis correction, no cross-axis fit)
// =====================================================================
//
// HOW THIS WORKS
// --------------
// If you rotate an undistorted magnetometer through every orientation,
// the raw readings trace out a sphere centered on zero (Earth's field has
// constant strength - only its direction changes as you rotate).
//
// Two things distort that:
//   - Hard iron  (a nearby object with its own fixed magnetic field)
//     shifts the sphere off-center, without changing its shape.
//   - Soft iron  (nearby material that redirects the ambient field)
//     stretches the sphere into an ellipsoid.
//
// This sketch fixes both by, for each axis independently:
//   1. Recording the min and max raw value seen while you tumble the
//      sensor through all orientations.
//   2. Hard-iron offset  = the midpoint of that swing (recenters it).
//   3. Soft-iron scale   = half the swing (rescales it to match the
//                          other axes, undoing the stretch).
//
// This is "simple" because it treats the three axes independently. It
// works well as long as the distortion is roughly lined up with the
// sensor's own X/Y/Z axes. It will NOT correct distortion that's tilted
// relative to the sensor (cross-axis coupling) - see the ELLIPSOID
// version of this sketch if you need that.
//
// There is no online learning or gradient descent here at all: the
// calibration numbers are computed once, from a fixed formula, right
// after the sweep finishes, and then held constant while you take
// readings.
// =====================================================================

#include <Wire.h>
#include <SparkFun_MMC5983MA_Arduino_Library.h>
#include <math.h>

SFE_MMC5983MA myMag;

// ---- Compass mounting / declination settings ----
float front_offset = 90;                           // Rotates the raw heading so 0 deg = the sensor's "front"
float magneticDeclination = -25.4 - front_offset;   // Local magnetic declination, adjusted for mounting
float headingOffset = 0.0;                          // Extra manual trim, if you ever need it

// The MMC5983MA outputs unsigned 18-bit counts (0..262143). Centering
// them on zero makes all the calibration math below easier to follow.
const float ADC_MIDPOINT = 131072.0f;

// ---- Calibration state ----
bool calibrating = true;
unsigned long calibStartTime = 0;
const unsigned long calibDurationMillis = 20000; // 20s calibration sweep

float rawMin[3] = { 1e9,  1e9,  1e9 };
float rawMax[3] = { -1e9, -1e9, -1e9 };

// The result of calibration: subtract hardIronOffset, then divide by
// softIronScale, one value per axis.
float hardIronOffset[3] = { 0, 0, 0 };
float softIronScale[3]  = { 1, 1, 1 };

// ---------------------------------------------------------------------
// Starts (or restarts) the calibration sweep.
// ---------------------------------------------------------------------
void beginCalibration()
{
    calibrating = true;
    calibStartTime = millis();

    for (int i = 0; i < 3; i++)
    {
        rawMin[i] = 1e9;
        rawMax[i] = -1e9;
    }

    Serial.println();
    Serial.println("=== CALIBRATION ===");
    Serial.println("Slowly rotate/tumble the sensor through ALL orientations");
    Serial.println("(not just flat - tilt and roll it too, to cover all 3 axes)");
    Serial.print("Calibrating for ");
    Serial.print(calibDurationMillis / 1000);
    Serial.println(" seconds...");
}

// ---------------------------------------------------------------------
// Turns the recorded min/max swing into hard-iron offset + soft-iron
// scale, and switches over to normal running mode.
// ---------------------------------------------------------------------
void finishCalibration()
{
    for (int i = 0; i < 3; i++)
    {
        // Hard-iron offset: the center of this axis's swing.
        hardIronOffset[i] = (rawMin[i] + rawMax[i]) / 2.0f;

        // Soft-iron scale: half of this axis's total swing (its "radius").
        float extent = (rawMax[i] - rawMin[i]) / 2.0f;
        if (extent < 1.0f) extent = 1.0f; // guard against divide-by-zero
        softIronScale[i] = extent;
    }

    Serial.println("=== CALIBRATION COMPLETE ===");
    Serial.print("Hard-iron offset: ");
    Serial.print(hardIronOffset[0], 1); Serial.print(", ");
    Serial.print(hardIronOffset[1], 1); Serial.print(", ");
    Serial.println(hardIronOffset[2], 1);
    Serial.print("Soft-iron scale:  ");
    Serial.print(softIronScale[0], 1); Serial.print(", ");
    Serial.print(softIronScale[1], 1); Serial.print(", ");
    Serial.println(softIronScale[2], 1);
    Serial.println("(Send any character over Serial at any time to recalibrate.)");
    Serial.println("=== RUNNING ===");

    calibrating = false;
}

void setup()
{
    Serial.begin(115200);
    Serial.println("MMC5983MA True North - simple per-axis calibration");

    Wire.begin();

    if (myMag.begin() == false)
    {
        Serial.println("MMC5983MA did not respond - check wiring. Freezing.");
        while (true);
    }

    myMag.softReset();

    // The sensor's own internal offset drifts slowly with temperature.
    // Automatic SET/RESET cancels that drift in hardware, on every single
    // reading, so it never shows up as a slow crawl in the heading later.
    myMag.enableAutomaticSetReset();

    beginCalibration();
}

void loop()
{
    // Send any character over Serial (e.g. from the Serial Monitor) at
    // any time to restart calibration - handy if you move the sensor to
    // a new mount, or want to redo a sweep you weren't happy with.
    if (Serial.available())
    {
        while (Serial.available()) Serial.read(); // clear the buffer
        beginCalibration();
    }

    uint32_t rawX, rawY, rawZ;
    myMag.getMeasurementXYZ(&rawX, &rawY, &rawZ);

    float raw[3];
    raw[0] = (float)rawX - ADC_MIDPOINT;
    raw[1] = (float)rawY - ADC_MIDPOINT;
    raw[2] = (float)rawZ - ADC_MIDPOINT;

    // -------------------------
    // CALIBRATING
    // -------------------------
    if (calibrating)
    {
        for (int i = 0; i < 3; i++)
        {
            if (raw[i] < rawMin[i]) rawMin[i] = raw[i];
            if (raw[i] > rawMax[i]) rawMax[i] = raw[i];
        }

        if (millis() - calibStartTime >= calibDurationMillis)
            finishCalibration();

        delay(20);
        return;
    }

    // -------------------------
    // APPLY CALIBRATION
    // -------------------------
    float corrected[3];
    for (int i = 0; i < 3; i++)
        corrected[i] = (raw[i] - hardIronOffset[i]) / softIronScale[i];

    // -------------------------
    // HEADING
    // -------------------------
    float heading = atan2(corrected[0], -corrected[1]);
    heading = heading * 180.0 / PI;
    heading += 180;

    // Heading correction
    heading += headingOffset;

    if (heading >= 360) heading -= 360;
    if (heading < 0)    heading += 360;

    // Apply magnetic declination
    float trueHeading = heading + magneticDeclination;

    if (trueHeading >= 360) trueHeading -= 360;
    if (trueHeading < 0)    trueHeading += 360;

    Serial.print("Mag Heading: ");
    Serial.print(heading, 1);
    Serial.print("  True Heading: ");
    Serial.println(trueHeading, 1);

    delay(100);
}