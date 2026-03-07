// Web Audio API sound effects utility
let audioCtx = null;

const getAudioCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
};

const playTone = (freq, duration, type = 'sine', volume = 0.15) => {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Silently fail if audio is not available
    }
};

export const playCorrect = () => {
    playTone(660, 0.2, 'sine', 0.12);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.08), 80);
};

export const playWrong = () => {
    playTone(200, 0.3, 'sawtooth', 0.08);
};

export const playCountdown = () => {
    playTone(440, 0.1, 'sine', 0.1);
};

export const playCountdownGo = () => {
    playTone(880, 0.3, 'sine', 0.15);
};

export const playComplete = () => {
    playTone(523, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 120);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 240);
    setTimeout(() => playTone(1047, 0.3, 'sine', 0.15), 360);
};

export const playFail = () => {
    playTone(400, 0.2, 'sawtooth', 0.1);
    setTimeout(() => playTone(300, 0.3, 'sawtooth', 0.1), 200);
};
