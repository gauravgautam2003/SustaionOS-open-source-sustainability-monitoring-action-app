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

const scheduleTone = (ctx, { startAt, frequency, duration, gain, type = "sine", sweepTo = null }) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (sweepTo && sweepTo !== frequency) {
    oscillator.frequency.exponentialRampToValueAtTime(sweepTo, startAt + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
};

const playLayeredTone = (ctx, { startAt, frequency, duration, gain, type = "triangle" }) => {
  scheduleTone(ctx, { startAt, frequency, duration, gain, type });
  scheduleTone(ctx, {
    startAt,
    frequency: frequency * 2,
    duration: Math.max(0.08, duration - 0.03),
    gain: gain * 0.45,
    type: "sine",
  });
  scheduleTone(ctx, {
    startAt,
    frequency: Math.max(180, frequency / 2),
    duration: duration + 0.03,
    gain: gain * 0.25,
    type: "triangle",
  });
};

const playHornBlast = (ctx, { startAt, rootFrequency, duration = 0.22, gain = 0.18 }) => {
  scheduleTone(ctx, {
    startAt,
    frequency: rootFrequency,
    sweepTo: Math.max(220, rootFrequency - 36),
    duration,
    gain,
    type: "sawtooth",
  });
  scheduleTone(ctx, {
    startAt,
    frequency: rootFrequency * 1.24,
    sweepTo: Math.max(260, rootFrequency * 1.18),
    duration: duration - 0.02,
    gain: gain * 0.72,
    type: "square",
  });
  scheduleTone(ctx, {
    startAt,
    frequency: Math.max(160, rootFrequency / 2),
    sweepTo: Math.max(140, rootFrequency / 2 - 14),
    duration: duration + 0.05,
    gain: gain * 0.4,
    type: "triangle",
  });
};

const playSirenSweep = (ctx, { startAt, fromFrequency, toFrequency, duration = 0.34, gain = 0.18 }) => {
  scheduleTone(ctx, {
    startAt,
    frequency: fromFrequency,
    sweepTo: toFrequency,
    duration,
    gain,
    type: "sawtooth",
  });
  scheduleTone(ctx, {
    startAt,
    frequency: fromFrequency * 1.5,
    sweepTo: toFrequency * 1.45,
    duration: duration - 0.02,
    gain: gain * 0.7,
    type: "square",
  });
  scheduleTone(ctx, {
    startAt,
    frequency: Math.max(180, fromFrequency / 2),
    sweepTo: Math.max(180, toFrequency / 2),
    duration: duration + 0.04,
    gain: gain * 0.42,
    type: "triangle",
  });
};

const playEmergencySiren = (ctx, { startAt, cycles = 5, gain = 0.2 }) => {
  const cycleDuration = 0.34;

  for (let index = 0; index < cycles; index += 1) {
    const cycleStart = startAt + index * cycleDuration;
    const upward = index % 2 === 0;
    playSirenSweep(ctx, {
      startAt: cycleStart,
      fromFrequency: upward ? 560 : 960,
      toFrequency: upward ? 960 : 560,
      duration: cycleDuration,
      gain: gain * (index === cycles - 1 ? 0.92 : 1),
    });
  }

  playHornBlast(ctx, {
    startAt: startAt + cycles * cycleDuration - 0.06,
    rootFrequency: 440,
    duration: 0.28,
    gain: gain * 0.92,
  });
};

const resolveSoundProfile = ({ priority = "LOW", type = "SYSTEM", title = "", message = "" } = {}) => {
  const severity = String(priority || "").toUpperCase();
  const category = String(type || "").toUpperCase();
  const text = `${title} ${message}`.toLowerCase();

  const resourceSpike =
    /(water|paani|leak|pipeline|tank|flow|energy|electricity|power|load|hvac|voltage|current)/.test(text) &&
    /(spike|high|critical|urgent|detected|alert|warning)/.test(text);

  if (resourceSpike && (severity === "HIGH" || category === "ALERT")) {
    return "resource-siren";
  }

  if (severity === "HIGH" || category === "ALERT") {
    return "urgent-chime";
  }

  return "default-chime";
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

export const playAlertSound = async ({ priority = "LOW", type = "SYSTEM", title = "", message = "" } = {}) => {
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

  const profile = resolveSoundProfile({ priority, type, title, message });
  const baseTime = ctx.currentTime + 0.02;

  if (profile === "resource-siren") {
    playEmergencySiren(ctx, { startAt: baseTime, cycles: 5, gain: 0.22 });
  } else if (profile === "urgent-chime") {
    playLayeredTone(ctx, { startAt: baseTime, frequency: 784, duration: 0.14, gain: 0.14, type: "triangle" });
    playLayeredTone(ctx, { startAt: baseTime + 0.16, frequency: 1046, duration: 0.16, gain: 0.16, type: "triangle" });
    playLayeredTone(ctx, { startAt: baseTime + 0.38, frequency: 1396, duration: 0.24, gain: 0.13, type: "sine" });
  } else {
    playLayeredTone(ctx, { startAt: baseTime, frequency: 698, duration: 0.12, gain: 0.1, type: "sine" });
    playLayeredTone(ctx, { startAt: baseTime + 0.15, frequency: 988, duration: 0.18, gain: 0.095, type: "triangle" });
  }

  return true;
};
