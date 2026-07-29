import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';

const sampleRate = 22050;
const output = join(process.cwd(), 'public', 'audio');
mkdirSync(output, { recursive: true });

const envelope = (time, duration, attack = 0.012, release = 0.12) =>
  Math.min(1, time / attack, Math.max(0, (duration - time) / release));
const tone = (frequency, duration, options = {}) => {
  const samples = new Float64Array(Math.ceil(duration * sampleRate));
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const sweep = options.sweep ? options.sweep(time / duration) : 1;
    const phase = 2 * Math.PI * frequency * sweep * time;
    const wave = options.square ? Math.sign(Math.sin(phase)) : Math.sin(phase);
    samples[index] = wave * envelope(time, duration, options.attack, options.release);
  }
  return samples;
};
const silence = (duration) => new Float64Array(Math.ceil(duration * sampleRate));
const sequence = (...parts) => {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Float64Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};
const mix = (...parts) => {
  const size = Math.max(...parts.map((part) => part.length));
  const result = new Float64Array(size);
  for (const part of parts) for (let i = 0; i < part.length; i += 1) result[i] += part[i] / parts.length;
  return result;
};
const wav = (samples) => {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-0.88, Math.min(0.88, sample * 0.72)) * 32767), 44 + index * 2));
  return buffer;
};

const sounds = {
  'rest-classic.wav': sequence(tone(880, 0.16), silence(0.07), tone(1175, 0.28)),
  'rest-bell.wav': mix(tone(740, 0.85, { release: 0.55 }), tone(1480, 0.85, { release: 0.65 }), tone(2220, 0.7, { release: 0.5 })),
  'rest-digital-beep.wav': tone(1250, 0.48, { square: true, attack: 0.006, release: 0.06 }),
  'rest-double-beep.wav': sequence(tone(1050, 0.2, { square: true }), silence(0.12), tone(1320, 0.24, { square: true })),
  'rest-gym-buzzer.wav': mix(tone(420, 0.95, { square: true, release: 0.08 }), tone(455, 0.95, { square: true, release: 0.08 })),
  'rest-sharp-alert.wav': sequence(tone(1900, 0.12, { square: true, release: 0.025 }), silence(0.055), tone(1550, 0.18, { square: true, release: 0.035 })),
  'rest-chime.wav': sequence(mix(tone(660, 0.34, { release: 0.22 }), tone(990, 0.34, { release: 0.25 })), tone(1320, 0.48, { release: 0.36 })),
};

for (const [name, samples] of Object.entries(sounds)) writeFileSync(join(output, name), wav(samples));
