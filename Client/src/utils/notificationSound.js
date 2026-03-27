const STORAGE_KEY = "sustainos:alert-sound";

let audioContext = null;
let primed = false;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  return audioContext;
};

const getSavedSoundPreference = () => {
  if (typeof window === "undefined") return "on";
  return window.localStorage.getItem(STORAGE_KEY) || "on";
};

const scheduleTone = (ctx, { startAt, frequency, duration, gain, type = "sine" }) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
};

export const isAlertSoundEnabled = () => getSavedSoundPreference() !== "off";

export const setAlertSoundEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
};

export const primeAlertAudio = () => {
  if (typeof window === "undefined" || primed) return;

  const unlockAudio = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      primed = ctx.state === "running";
    } catch {
      primed = false;
    }

    if (primed) {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    }
  };

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
};

export const playAlertSound = async ({ priority = "LOW", type = "SYSTEM" } = {}) => {
  if (!isAlertSoundEnabled()) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    return false;
  }

  if (ctx.state !== "running") return false;

  const urgent = String(priority || "").toUpperCase() === "HIGH" || String(type || "").toUpperCase() === "ALERT";
  const baseTime = ctx.currentTime + 0.02;

  if (urgent) {
    scheduleTone(ctx, { startAt: baseTime, frequency: 740, duration: 0.12, gain: 0.07, type: "triangle" });
    scheduleTone(ctx, { startAt: baseTime + 0.14, frequency: 988, duration: 0.14, gain: 0.08, type: "triangle" });
    scheduleTone(ctx, { startAt: baseTime + 0.32, frequency: 1318, duration: 0.2, gain: 0.06, type: "sine" });
  } else {
    scheduleTone(ctx, { startAt: baseTime, frequency: 660, duration: 0.1, gain: 0.05, type: "sine" });
    scheduleTone(ctx, { startAt: baseTime + 0.16, frequency: 988, duration: 0.14, gain: 0.045, type: "sine" });
  }

  return true;
};
