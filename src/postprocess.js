/**
 * @fileoverview FFmpeg post-processing wrapper.
 * @description Thin wrapper around the ffmpeg binary. Chains:
 *   1. trim 1s off head and tail
 *   2. speed up by `speed` factor (setpts for video, atempo-safe for audio if any)
 *   3. encode H.264 MP4 at CRF 23
 */

import { spawn, spawnSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Resolves the ffmpeg binary, preferring PATH and falling back to Playwright's bundle.
 * @returns {string} Path or command name for ffmpeg
 */
function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const lookup = process.platform === 'win32' ? 'where ffmpeg' : 'command -v ffmpeg';
  const r = spawnSync(lookup, { shell: true, encoding: 'utf8' });
  if (r.status === 0) {
    const line = r.stdout.split(/\r?\n/).find((l) => l.trim());
    if (line) return line.trim();
  }
  const candidates =
    process.platform === 'win32'
      ? ['C:/ProgramData/chocolatey/bin/ffmpeg.exe', 'C:/Program Files/ffmpeg/bin/ffmpeg.exe']
      : [];
  for (const c of candidates) if (existsSync(c)) return c;
  return 'ffmpeg';
}

const FFMPEG_RAW = resolveFfmpeg();
const FFMPEG = FFMPEG_RAW.includes(' ') ? `"${FFMPEG_RAW}"` : FFMPEG_RAW;

/** Seconds to trim from the start of the video. */
const TRIM_HEAD_S = 1;
/** Seconds to trim from the end of the video. */
const TRIM_TAIL_S = 1;

/**
 * Checks if ffmpeg is available on the system PATH.
 * @returns {Promise<boolean>}
 */
function ffmpegAvailable() {
  return new Promise((resolve) => {
    const p = spawn(FFMPEG, ['-version'], { shell: true });
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Gets the duration of a media file using ffprobe.
 * @param {string} input - Path to input file
 * @returns {Promise<number>} Duration in seconds
 */
function getDurationSeconds(input) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ['-i', `"${input}"`], { shell: true });
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', reject);
    p.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return reject(new Error('could not parse duration from ffmpeg output'));
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    });
  });
}

/**
 * Runs ffmpeg with the given arguments.
 * @param {string[]} args - FFmpeg CLI arguments
 * @returns {Promise<void>}
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'], shell: true });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

/**
 * Post-processes a raw .webm recording into a polished MP4 or GIF.
 * @param {Object} options - Process options
 * @param {string} options.input - Input .webm path
 * @param {string} options.output - Output path
 * @param {number} [options.speed=1.5] - Playback speedup factor
 * @param {string} [options.format='mp4'] - Output format: 'mp4' or 'gif'
 * @returns {Promise<void>}
 */
export async function postProcess({ input, output, speed = 1.5, format = 'mp4' }) {
  await stat(input); // throws if missing
  if (!(await ffmpegAvailable())) {
    throw new Error('ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg` or `apt install ffmpeg`).');
  }

  const duration = await getDurationSeconds(input);
  const keep = Math.max(0.5, duration - TRIM_HEAD_S - TRIM_TAIL_S);

  let args;
  if (format === 'gif') {
    args = [
      '-y',
      '-ss', String(TRIM_HEAD_S),
      '-i', `"${input}"`,
      '-t', String(keep),
      '-filter_complex', `[0:v]setpts=PTS/${speed},palettegen=stats_mode=diff[p];[0:v][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      `"${output}"`,
    ];
  } else {
    args = [
      '-y',
      '-ss', String(TRIM_HEAD_S),
      '-i', `"${input}"`,
      '-t', String(keep),
      '-filter:v', `setpts=PTS/${speed}`,
      '-an',
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      `"${output}"`,
    ];
  }

  await runFfmpeg(args);
}