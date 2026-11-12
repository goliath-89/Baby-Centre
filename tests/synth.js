// Synthetic cry-like audio for tests: harmonic bursts with vibrato, a falling melody and optional noise.
const fs = require('fs');
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeCry({ f0 = 440, burst = 0.9, pause = 0.35, noise = 0.02, harsh = 0, sr = 48000, dur = 5, amp = 0.4, seed = 3 } = {}) {
  const out = new Float32Array(Math.round(sr * dur)), rnd = rng(seed);
  let phase = 0, t0 = 0.1;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr, cyc = (t - t0) % (burst + pause), on = t >= t0 && cyc < burst;
    let v = (rnd() * 2 - 1) * noise * 0.2;
    if (on) {
      const x = cyc / burst, env = Math.min(1, x / 0.08, (1 - x) / 0.12);
      const f = f0 * (1.06 - 0.12 * x) * (1 + 0.01 * Math.sin(2 * Math.PI * 6 * t));
      phase += 2 * Math.PI * f / sr;
      let h = Math.sin(phase) + 0.6 * Math.sin(2 * phase) + 0.4 * Math.sin(3 * phase) + 0.2 * Math.sin(4 * phase);
      // "harsh" stretches replace voicing with noise, like a dysphonic cry
      const rough = harsh > 0 && ((cyc * 7) % 1) < harsh;
      v += env * amp * (rough ? (rnd() * 2 - 1) * 1.2 : h / 2.2) + env * (rnd() * 2 - 1) * noise;
    }
    out[i] = v;
  }
  return out;
}
function makeSpeechLike({ sr = 48000, dur = 5 } = {}) { return makeCry({ f0: 140, burst: 0.25, pause: 0.2, sr, dur }); }
function writeWav(file, samples, sr) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}
module.exports = { makeCry, makeSpeechLike, writeWav };
