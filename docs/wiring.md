# Optional ESP32 Can-Measurement Station — Wiring, BOM & Calibration

This hardware module is **optional** and completely decoupled from the main CanOptimizer web application. It connects directly to desktop Chrome or Edge via the **Web Serial API** over USB on `/hardware` (no backend server required).

---

## 1. Measurement Principle

Mount a distance sensor facing straight down above a flat base plate at a fixed height $H_{\text{base}}$ (typically 25–30 cm). When an empty soda can is placed on the base plate directly beneath the sensor, the sensor reads the distance $d_{\text{top}}$ from the sensor to the top of the can:

$$h_{\text{can}} = (H_{\text{base}} - d_{\text{top}}) + \Delta_{\text{cal}}$$

Diameter $d$ is entered manually in `/hardware` (using a ruler or digital caliper), because low-cost ultrasonic/ToF sensors cannot reliably measure curved cylindrical diameters.

---

## 2. Bill of Materials (BOM)

| Qty | Component | Notes | Est. Cost (USD) |
| --- | --- | --- | --- |
| 1 | ESP32 DevKit V1 (30-pin or 38-pin) | USB-to-Serial built in (CP2102 or CH340) | $5–$8 |
| 1 | VL53L0X Time-of-Flight Laser Sensor (recommended) | I2C, ±1–2 mm repeatability, works well on shiny aluminum tops | $3–$5 |
| *or* 1 | HC-SR04 Ultrasonic Sensor (alternative) | Uncomment `#define USE_HCSR04` in `firmware/src/main.cpp` | $2 |
| 1 | USB Data Cable (Micro-USB or USB-C) | Must support data, not charge-only | $2 |
| 4 | Female-to-Female Jumper Wires | For sensor-to-ESP32 connections | $1 |
| 1 | Simple L-Bracket / Cardboard / Acrylic Stand | Holds sensor ~25 cm above flat base | $0–$5 |
| 1 | Digital Caliper or Ruler | For manual diameter measurement | $5–$10 |

---

## 3. Wiring Table

### Option A: VL53L0X Time-of-Flight Sensor (Default — Recommended)

| VL53L0X Pin | ESP32 Pin | Function |
| --- | --- | --- |
| `VCC` / `VIN` | `3V3` | 3.3 V Power |
| `GND` | `GND` | Common Ground |
| `SDA` | `GPIO 21` | I2C Data |
| `SCL` | `GPIO 22` | I2C Clock |

### Option B: HC-SR04 Ultrasonic Sensor (Fallback)

> **Note:** Standard HC-SR04 outputs a 5 V pulse on `ECHO`. Use a simple voltage divider (1 kΩ + 2 kΩ resistors) on `ECHO` to protect the 3.3 V ESP32 GPIO, or use an HC-SR04P (3.3 V compatible).

| HC-SR04 Pin | ESP32 Pin | Function |
| --- | --- | --- |
| `VCC` | `VIN` (5 V) or `3V3` (if HC-SR04P) | Power |
| `GND` | `GND` | Common Ground |
| `TRIG` | `GPIO 5` | Trigger Output |
| `ECHO` | `GPIO 18` (via 1 kΩ / 2 kΩ divider) | Echo Input |

### ASCII Physical Setup

```text
          [ VL53L0X / HC-SR04 ]  <--- mounted at fixed height H_base (~25 cm)
                   |
                   |  d_top (laser / ultrasonic beam)
                   v
              +---------+
              |  SODA   |  h_can = H_base - d_top
              |   CAN   |
              +---------+
        =======================  Flat Base Plate
```

---

## 4. Flashing & Calibration Routine

1. **Flash Firmware** using PlatformIO (`firmware/platformio.ini` + `firmware/src/main.cpp`) or Arduino IDE (install `VL53L0X` by Pololu).
2. **Zero Calibration (`CAL_ZERO`)**:
   - Remove all objects from the base plate.
   - Open Serial Monitor at **115200 baud** and send:
     ```text
     CAL_ZERO
     ```
   - The ESP32 measures the median of 7 samples and stores `baseDistanceCm`.
3. **Reference-Height Calibration (`CAL_REF`)**:
   - Place a known-height reference object (e.g., a 12.00 cm block or caliper-measured can) under the sensor.
   - Send:
     ```text
     CAL_REF 12.00
     ```
   - The ESP32 computes and applies `offsetCm`.
4. **Connect to CanOptimizer**:
   - Close Serial Monitor (only one app can hold the COM port).
   - Open `/hardware` in Chrome or Edge, click **Connect device**, select your ESP32 USB port, enter the caliper diameter, and click **Capture to Real Cans Table**.

---

## 5. JSON Serial Protocol

Every 500 ms, the ESP32 outputs one newline-delimited JSON object at 115200 baud:

```json
{"height_cm": 12.24}
```

Diagnostic lines starting with `#` are automatically ignored by `lib/serial.ts`.
