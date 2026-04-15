import { GAME_CONFIG, TILE_LETTERS } from '../../app/constants.js';

export class PuzzleGenerator {
    static generateDailyPuzzle(date) {
        // Create a seed from the date
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const seed = this.dateToSeed(dateStr);

        // Use seeded random number generator
        const rng = this.createSeededRNG(seed);

        // Generate 5 starting positions
        const startTiles = [];
        const positions = [];

        for (let i = 0; i < GAME_CONFIG.START_TILES_COUNT; i++) {
            let row, col;
            let attempts = 0;
            const maxAttempts = 100;

            // Find a position that's at least 2 spaces away from existing tiles
            do {
                row = Math.floor(rng() * GAME_CONFIG.GRID_SIZE);
                col = Math.floor(rng() * GAME_CONFIG.GRID_SIZE);
                attempts++;
            } while (
                attempts < maxAttempts &&
                positions.some(pos =>
                    Math.abs(pos.row - row) <= 1 && Math.abs(pos.col - col) <= 1
                )
            );

            // Select random letter using weighted distribution
            const letter = this.selectRandomLetter(rng);

            const tile = { row, col, letter };
            startTiles.push(tile);
            positions.push({ row, col });
        }

        return {
            date: dateStr,
            startTiles: startTiles,
            seed: seed
        };
    }

    static dateToSeed(dateStr) {
        // Convert date string to a numeric seed
        let seed = 0;
        for (let i = 0; i < dateStr.length; i++) {
            const char = dateStr.charCodeAt(i);
            seed = ((seed << 5) - seed) + char;
            seed = seed & seed; // Convert to 32-bit integer
        }
        return Math.abs(seed);
    }

    static createSeededRNG(seed) {
        // Simple linear congruential generator
        let state = seed;

        return function() {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }

    static selectRandomLetter(rng) {
        // Use the same letter distribution as the original game
        const letters = TILE_LETTERS.split('');
        const index = Math.floor(rng() * letters.length);
        return letters[index];
    }

    static validatePuzzle(puzzle) {
        // Basic validation of the generated puzzle
        if (!puzzle.startTiles || puzzle.startTiles.length !== GAME_CONFIG.START_TILES_COUNT) {
            return false;
        }

        // Check that all positions are within grid bounds
        for (const tile of puzzle.startTiles) {
            if (tile.row < 0 || tile.row >= GAME_CONFIG.GRID_SIZE ||
                tile.col < 0 || tile.col >= GAME_CONFIG.GRID_SIZE) {
                return false;
            }
        }

        // Check that no two tiles occupy the same position
        const positions = new Set();
        for (const tile of puzzle.startTiles) {
            const key = `${tile.row}-${tile.col}`;
            if (positions.has(key)) {
                return false;
            }
            positions.add(key);
        }

        return true;
    }

    // Helper method to get today's puzzle
    static getTodaysPuzzle() {
        const today = new Date().toISOString().split('T')[0];
        return this.generateDailyPuzzle(today);
    }

    // Helper method to get a specific date's puzzle
    static getPuzzleForDate(date) {
        return this.generateDailyPuzzle(date);
    }
}
