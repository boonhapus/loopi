#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for loopi.
 * @usage loopi <scenario.json> [options]
 * @description Pipeline: load JSON → launch browser with recordVideo → inject ghost cursor →
 *   run steps → close context (flushes .webm) → ffmpeg trim+speed → output/<name>.<format>
 */

import { readFile, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

import { cursorInitScript } from './cursor.js';
import { runStep } from './actions.js';
import { postProcess } from './postprocess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const BROWSERS = { chromium, chrome: chromium, firefox, webkit, safari: webkit };

/**
 * Parses command-line arguments.
 * @param {string[]} argv - Process.argv.slice(2)
 * @returns {{browser: string, scenario: string|null, format: string, outputDir: string|null, speed: number|null, help?: boolean}}
 */
function parseArgs(argv) {
  const args = { browser: 'chromium', scenario: null, format: 'mp4', outputDir: null, speed: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--browser' || a === '-b') {
      args.browser = argv[++i];
    } else if (a.startsWith('--browser=')) {
      args.browser = a.slice('--browser='.length);
    } else if (a === '--format' || a === '-f') {
      args.format = argv[++i];
    } else if (a.startsWith('--format=')) {
      args.format = a.slice('--format='.length);
    } else if (a === '--output' || a === '-o') {
      args.outputDir = argv[++i];
    } else if (a.startsWith('--output=')) {
      args.outputDir = a.slice('--output='.length);
    } else if (a === '--speed' || a === '-s') {
      args.speed = parseFloat(argv[++i]);
    } else if (a.startsWith('--speed=')) {
      args.speed = parseFloat(a.slice('--speed='.length));
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (!args.scenario) {
      args.scenario = a;
    }
  }
  return args;
}

/** Prints help text to stdout. */
function printHelp() {
  console.log(`loopi — render a scenario JSON to a polished video.

Usage:
  loopi <scenario.json> [options]

Options:
  -b, --browser   Browser engine (default: chromium). Aliases: chrome, safari.
  -f, --format   Output format (default: mp4). Options: mp4, gif.
  -o, --output   Output directory (default: ./output)
  -s, --speed   Playback speed (default: 1.5)
  -h, --help     Show this help.
`);
}

/**
 * Main entry point.
 * @returns {Promise<void>}
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.scenario) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const browserKey = args.browser.toLowerCase();
  const browserType = BROWSERS[browserKey];
  if (!browserType) {
    console.error(`Unknown browser: ${args.browser}. Use chromium, firefox, or webkit.`);
    process.exit(1);
  }

  const scenarioPath = path.resolve(args.scenario);
  const scenario = JSON.parse(await readFile(scenarioPath, 'utf8'));
  const scenarioName = path.basename(scenarioPath, path.extname(scenarioPath));

  const viewport = scenario.viewport ?? { width: 1280, height: 720 };
  const speed = args.speed ?? scenario.speed ?? 1.5;
  const baseUrl = scenario.baseUrl ?? '';

  const outputDir = args.outputDir ? path.resolve(args.outputDir) : path.join(projectRoot, 'output');
  const rawDir = path.join(outputDir, 'raw', scenarioName);
  await mkdir(rawDir, { recursive: true });

  const launchOptions = {};
  if (browserKey === 'chromium' || browserKey === 'chrome') {
    launchOptions.args = ['--disable-gpu', '--no-sandbox'];
  }

  console.log(`→ launching ${browserKey} at ${viewport.width}x${viewport.height}`);
  const browser = await browserType.launch(launchOptions);

  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: rawDir, size: viewport },
  });

  await context.addInitScript(cursorInitScript);
  const page = await context.newPage();

  try {
    for (const [i, step] of scenario.steps.entries()) {
      console.log(`  [${i + 1}/${scenario.steps.length}] ${step.action}${step.selector ? ` ${step.selector}` : ''}${step.url ? ` ${step.url}` : ''}`);
      await runStep(page, step, { baseUrl });
    }
    // let the final frame breathe before we cut the tail
    await page.waitForTimeout(1000);
  } finally {
    await context.close();
    await browser.close();
  }

  // Playwright names videos with a random id; grab the one webm in rawDir.
  const files = (await readdir(rawDir)).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) throw new Error('No recording produced.');
  const rawVideo = path.join(rawDir, files[0]);

  const ext = args.format === 'gif' ? 'gif' : 'mp4';
  const finalPath = path.join(outputDir, `${scenarioName}.${ext}`);
  console.log(`→ post-processing (speed ×${speed}, ${args.format}) → ${path.relative(projectRoot, finalPath)}`);
  await postProcess({ input: rawVideo, output: finalPath, speed, format: args.format });

  // Clean up the raw intermediate so output/ stays tidy.
  await rm(path.join(outputDir, 'raw'), { recursive: true, force: true });

  console.log(`✓ done: ${finalPath}`);
}

main().catch((err) => {
  console.error('✗ error:', err.message);
  process.exit(1);
});