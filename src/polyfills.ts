import { Buffer } from "buffer";
import process from "process";

declare global {
  interface Window {
    Buffer?: typeof Buffer;
    process?: typeof process;
  }
}

const runtimeGlobal = globalThis as typeof globalThis & { Buffer?: typeof Buffer };

if (!runtimeGlobal.Buffer) {
  runtimeGlobal.Buffer = Buffer;
}

if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

const runtimeWithProcess = globalThis as typeof globalThis & { process?: typeof process };

if (!runtimeWithProcess.process) {
  runtimeWithProcess.process = process;
}

if (typeof window !== "undefined" && !window.process) {
  window.process = process;
}
