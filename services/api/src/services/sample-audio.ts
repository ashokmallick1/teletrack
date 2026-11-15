import fs from 'fs';
import path from 'path';

/**
 * Creates a valid PCM WAV audio file with a subtle pleasant chime tone
 */
export function createSampleWavBuffer(durationSeconds = 8): Buffer {
  const sampleRate = 8000; // 8kHz standard telephony
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * (bitsPerSample / 8);

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesize telephone-like audio tone (440Hz dial chime decaying over time)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Pleasant dual-frequency tone with decay (telecom style)
    const freq = 440 + Math.sin(t * 3) * 50;
    const envelope = Math.max(0, 1 - (t % 2) / 2); // Repeating chime every 2s
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3 * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
}
