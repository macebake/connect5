import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_CONFIG = {
  GRID_SIZE: 10,
  START_TILES_COUNT: 5
};

const TILE_LETTERS = 'AAEEIIOOUURRLLLNNNSSTTDDGGBBCCMMPPFFHHVVWWYYKJXQZ';
const PUZZLE_EPOCH = '2026-04-15';

function getCurrentUtcDate() {
  return new Date().toISOString().split('T')[0];
}

function createSeed(dateStr, secret) {
  const digest = createHash('sha256').update(`${secret}:${dateStr}`).digest('hex');
  return Number.parseInt(digest.slice(0, 8), 16);
}

function createSeededRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function selectRandomLetter(rng) {
  const index = Math.floor(rng() * TILE_LETTERS.length);
  return TILE_LETTERS[index];
}

function getPuzzleNumber(dateStr) {
  const currentDate = new Date(`${dateStr}T00:00:00Z`);
  const epochDate = new Date(`${PUZZLE_EPOCH}T00:00:00Z`);
  const dayNumber = Math.floor((currentDate - epochDate) / 86400000) + 1;
  return Math.max(1, dayNumber);
}

function generatePuzzle(dateStr, secret) {
  const rng = createSeededRng(createSeed(dateStr, secret));
  const positions = [];
  const startTiles = [];

  for (let i = 0; i < GAME_CONFIG.START_TILES_COUNT; i += 1) {
    let row = 0;
    let col = 0;
    let attempts = 0;

    do {
      row = Math.floor(rng() * GAME_CONFIG.GRID_SIZE);
      col = Math.floor(rng() * GAME_CONFIG.GRID_SIZE);
      attempts += 1;
    } while (
      attempts < 100 &&
      positions.some((pos) => Math.abs(pos.row - row) <= 1 && Math.abs(pos.col - col) <= 1)
    );

    const tile = { row, col, letter: selectRandomLetter(rng) };
    positions.push({ row, col });
    startTiles.push(tile);
  }

  return {
    date: dateStr,
    puzzleNumber: getPuzzleNumber(dateStr),
    startTiles,
    generatedAt: new Date().toISOString()
  };
}

async function main() {
  const dateArg = process.argv[2];
  const dateStr = dateArg || process.env.CONNECT5_PUZZLE_DATE || getCurrentUtcDate();
  const secret = process.env.CONNECT5_DAILY_SECRET;

  if (!secret) {
    throw new Error('CONNECT5_DAILY_SECRET is required.');
  }

  const puzzle = generatePuzzle(dateStr, secret);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.resolve(__dirname, '../assets/data');
  const outputPath = path.join(outputDir, 'daily-puzzle.json');

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(puzzle, null, 2)}\n`);

  console.log(`Wrote ${outputPath} for ${dateStr}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
