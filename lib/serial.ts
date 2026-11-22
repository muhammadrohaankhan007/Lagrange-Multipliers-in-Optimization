/**
 * Web Serial API client for the optional ESP32 Can-Measurement Station.
 *
 * Works directly in Chrome / Edge over USB — no backend server required.
 * Expects newline-delimited JSON from the ESP32, e.g.:
 *   {"height_cm": 12.24}
 * Malformed or out-of-range lines never crash the app and instead report a warning.
 */

export interface SerialReading {
  height_cm: number;
  timestamp: string;
  raw?: string;
  simulated: boolean;
}

export type SerialParseOutcome =
  | { kind: "reading"; reading: SerialReading }
  | { kind: "ignore" }
  | { kind: "warning"; message: string; raw: string };

/**
 * Pure parser for a single line received from the ESP32 USB serial stream.
 * Comment lines starting with '#' and empty lines are ignored; malformed JSON
 * or out-of-range height_cm values produce a non-fatal warning.
 */
export function parseSerialLine(line: string): SerialParseOutcome {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return { kind: "ignore" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      kind: "warning",
      message: `Ignored malformed serial line (invalid JSON): "${trimmed.slice(0, 80)}"`,
      raw: trimmed,
    };
  }

  if (typeof parsed !== "object" || parsed === null || !("height_cm" in parsed)) {
    return {
      kind: "warning",
      message: `Ignored JSON line missing "height_cm" field: "${trimmed.slice(0, 80)}"`,
      raw: trimmed,
    };
  }

  const h = Number((parsed as { height_cm: unknown }).height_cm);
  if (!Number.isFinite(h) || h <= 0 || h >= 100) {
    return {
      kind: "warning",
      message: `Ignored out-of-range height_cm value (${String(
        (parsed as { height_cm: unknown }).height_cm
      )}); expected 0 < height_cm < 100 cm.`,
      raw: trimmed,
    };
  }

  return {
    kind: "reading",
    reading: {
      height_cm: Number(h.toFixed(2)),
      timestamp: new Date().toISOString(),
      raw: trimmed,
      simulated: false,
    },
  };
}

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort(): Promise<SerialPortLike>;
  };
}

export function isWebSerialSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "serial" in navigator && Boolean((navigator as NavigatorWithSerial).serial);
}

export class Esp32SerialClient {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private keepReading = false;

  async connect(
    onReading: (reading: SerialReading) => void,
    onError: (message: string) => void,
    onWarning?: (message: string) => void,
    baudRate: number = 115200
  ): Promise<void> {
    if (!isWebSerialSupported()) {
      throw new Error("Web Serial API is not supported in this browser. Use Chrome or Edge.");
    }

    const nav = navigator as NavigatorWithSerial;
    const port = await nav.serial!.requestPort();
    await port.open({ baudRate });
    this.port = port;
    this.keepReading = true;

    if (!port.readable) {
      throw new Error("Serial port is not readable.");
    }

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>).catch(() => {
      // Stream closes on disconnect
    });

    const reader = decoder.readable.getReader();
    this.reader = reader;

    let buffer = "";
    try {
      while (this.keepReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const outcome = parseSerialLine(line);
            if (outcome.kind === "reading") {
              onReading(outcome.reading);
            } else if (outcome.kind === "warning" && onWarning) {
              onWarning(outcome.message);
            }
          }
        }
      }
    } catch (err) {
      if (this.keepReading) {
        onError(err instanceof Error ? err.message : "Serial read error");
      }
    } finally {
      reader.releaseLock();
    }
  }

  async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
    } catch {
      // Ignore cancel errors
    }
    try {
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      // Ignore close errors
    }
  }
}

export interface SimulatedCanPreset {
  id: string;
  label: string;
  height_cm: number;
  diameter_cm: number;
  stated_volume_ml: number;
}

export const SIMULATED_CAN_PRESETS: SimulatedCanPreset[] = [
  {
    id: "355_standard",
    label: "355 mL Standard Soda Can",
    height_cm: 12.27,
    diameter_cm: 6.62,
    stated_volume_ml: 355,
  },
  {
    id: "330_sleek",
    label: "330 mL Sleek Can",
    height_cm: 14.6,
    diameter_cm: 5.8,
    stated_volume_ml: 330,
  },
  {
    id: "250_slim",
    label: "250 mL Energy Slim Can",
    height_cm: 13.45,
    diameter_cm: 5.3,
    stated_volume_ml: 250,
  },
  {
    id: "500_tallboy",
    label: "500 mL Tallboy Can",
    height_cm: 16.8,
    diameter_cm: 6.62,
    stated_volume_ml: 500,
  },
];

/** Generate one realistic simulated sensor reading with ~0.04 cm jitter. */
export function generateSimulatedReading(preset: SimulatedCanPreset): SerialReading {
  const jitter = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.14;
  const height_cm = Number(Math.max(1.0, preset.height_cm + jitter).toFixed(2));
  return {
    height_cm,
    timestamp: new Date().toISOString(),
    raw: JSON.stringify({ height_cm }),
    simulated: true,
  };
}
