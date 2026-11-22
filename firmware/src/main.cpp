/**
 * CanOptimizer — Optional ESP32 Can-Height Measurement Firmware
 *
 * Streams one JSON line per reading over USB Serial (115200 baud) for the
 * Web Serial API page (/hardware), e.g.:
 *   {"height_cm": 12.24}
 *
 * Supported distance sensors (select one below):
 *   - VL53L0X Time-of-Flight laser sensor (default, I2C: SDA=21, SCL=22)
 *   - HC-SR04 ultrasonic sensor (uncomment USE_HCSR04; TRIG=5, ECHO=18)
 *
 * Serial Calibration Commands (send via Serial Monitor at 115200 baud):
 *   CAL_ZERO         -> Measure empty base platform to set baseDistanceCm
 *   CAL_REF 12.00    -> Calibrate scale/offset using a known-height reference object (cm)
 */

#include <Arduino.h>
#include <Wire.h>

// Uncomment to use HC-SR04 instead of VL53L0X
// #define USE_HCSR04

#ifndef USE_HCSR04
  #include <VL53L0X.h>
  VL53L0X tofSensor;
#else
  const int TRIG_PIN = 5;
  const int ECHO_PIN = 18;
#endif

// Distance from sensor mounted overhead to the flat base plate (cm)
float baseDistanceCm = 25.00f;
float offsetCm = 0.00f;

const int NUM_SAMPLES = 7;
const unsigned long SAMPLE_INTERVAL_MS = 500;
unsigned long lastSampleMs = 0;

float readRawDistanceCm() {
#ifndef USE_HCSR04
  uint16_t mm = tofSensor.readRangeSingleMillimeters();
  if (tofSensor.timeoutOccurred() || mm == 0 || mm > 2000) {
    return -1.0f;
  }
  return mm / 10.0f;
#else
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long durationUs = pulseIn(ECHO_PIN, HIGH, 25000);
  if (durationUs == 0) return -1.0f;
  return (durationUs * 0.0343f) / 2.0f;
#endif
}

float readFilteredDistanceCm() {
  float samples[NUM_SAMPLES];
  int valid = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    float d = readRawDistanceCm();
    if (d > 0.0f) {
      samples[valid++] = d;
    }
    delay(15);
  }
  if (valid == 0) return -1.0f;
  // Simple insertion sort to take the median (rejects single-sample spikes)
  for (int i = 1; i < valid; i++) {
    float key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }
  return samples[valid / 2];
}

void handleSerialCommands() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "CAL_ZERO") {
    float d = readFilteredDistanceCm();
    if (d > 0.0f) {
      baseDistanceCm = d;
      offsetCm = 0.0f;
      Serial.print("# Calibrated baseDistanceCm = ");
      Serial.println(baseDistanceCm, 2);
    } else {
      Serial.println("# Calibration failed: invalid sensor reading");
    }
  } else if (cmd.startsWith("CAL_REF ")) {
    float knownHeight = cmd.substring(8).toFloat();
    float d = readFilteredDistanceCm();
    if (knownHeight > 0.0f && d > 0.0f) {
      float rawHeight = baseDistanceCm - d;
      offsetCm = knownHeight - rawHeight;
      Serial.print("# Reference calibrated offsetCm = ");
      Serial.println(offsetCm, 2);
    } else {
      Serial.println("# Reference calibration failed");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

#ifndef USE_HCSR04
  Wire.begin(21, 22);
  tofSensor.setTimeout(500);
  if (!tofSensor.init()) {
    Serial.println("# ERROR: Failed to detect VL53L0X sensor!");
  } else {
    tofSensor.setMeasurementTimingBudget(33000);
    Serial.println("# CanOptimizer ESP32 ready (VL53L0X)");
  }
#else
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.println("# CanOptimizer ESP32 ready (HC-SR04)");
#endif
}

void loop() {
  handleSerialCommands();

  unsigned long now = millis();
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    float distCm = readFilteredDistanceCm();
    if (distCm > 0.0f) {
      float heightCm = (baseDistanceCm - distCm) + offsetCm;
      if (heightCm > 1.0f && heightCm < 50.0f) {
        Serial.print("{\"height_cm\": ");
        Serial.print(heightCm, 2);
        Serial.println("}");
      }
    }
  }
}
