import { GAME_CONFIG, TILE_LETTERS, LETTER_VALUES, DIRECTIONS } from './constants.js';

// Grid management and tile operations for Connect5
export class GridManager {
    constructor(uiManager) {
        this.gridSize = GAME_CONFIG.GRID_SIZE;
        this.grid = [];
        this.startTiles = [];
        this.committedTiles = new Set();
        this.uiManager = uiManager;
        this.createGrid();
    }

    createGrid() {
        this.grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = '';
            }
        }
    }

    placeStartTiles() {
        const positions = [];
        this.startTiles = [];
        
        // Place random tiles
        for (let i = 0; i < GAME_CONFIG.START_TILES_COUNT; i++) {
            const letter = TILE_LETTERS[Math.floor(Math.random() * TILE_LETTERS.length)];
            let row, col;
            
            // Find a position that's at least 2 spaces away from existing tiles
            do {
                row = Math.floor(Math.random() * this.gridSize);
                col = Math.floor(Math.random() * this.gridSize);
            } while (positions.some(pos => 
                Math.abs(pos.row - row) <= 1 && Math.abs(pos.col - col) <= 1
            ));
            
            positions.push({ row, col });
            this.grid[row][col] = letter;
            this.startTiles.push(`${row}-${col}`);
        }
    }

    renderGrid(currentWord, isTyping, startRow, startCol, currentDirection) {
        this.uiManager.clearGrid();
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                const letter = this.grid[i][j];
                if (letter) {
                    cell.textContent = letter;
                    const value = LETTER_VALUES[letter];
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'letter-value';
                    valueSpan.textContent = value;
                    cell.appendChild(valueSpan);
                }
                
                // Apply styles
                const key = `${i}-${j}`;
                if (this.startTiles.includes(key)) {
                    cell.classList.add('start-tile');
                } else if (this.committedTiles.has(key)) {
                    cell.classList.add('committed');
                }
                
                // Check if part of current word
                const inCurrentWord = currentWord.find(w => w.row === i && w.col === j);
                if (inCurrentWord) {
                    cell.classList.add('current-word');
                }
                
                // Add arrow for direction at the current typing position
                if (isTyping && this.shouldShowArrowAt(i, j, currentWord, startRow, startCol, currentDirection)) {
                    cell.classList.add('arrow');
                    if (currentDirection === DIRECTIONS.HORIZONTAL) {
                        cell.classList.add('arrow-right');
                    } else if (currentDirection === DIRECTIONS.VERTICAL) {
                        cell.classList.add('arrow-down');
                    }
                }
                
                // Add selected state for starting cell
                if (isTyping && i === startRow && j === startCol) {
                    cell.classList.add('selected');
                }
                
                this.uiManager.elements.grid.appendChild(cell);
            }
        }
    }

    shouldShowArrowAt(row, col, currentWord, startRow, startCol, currentDirection) {
        // If no letters typed yet, show arrow at starting position
        if (currentWord.length === 0) {
            return row === startRow && col === startCol;
        }
        
        // Show arrow at the position where the next letter would go
        const lastLetter = currentWord[currentWord.length - 1];
        let nextRow, nextCol;
        
        if (currentDirection === DIRECTIONS.HORIZONTAL) {
            nextRow = lastLetter.row;
            nextCol = lastLetter.col + 1;
        } else {
            nextRow = lastLetter.row + 1;
            nextCol = lastLetter.col;
        }
        
        // Check if we need to skip occupied cells
        while (nextRow < this.gridSize && nextCol < this.gridSize && 
               this.grid[nextRow][nextCol] && !this.isPartOfCurrentWord(nextRow, nextCol, currentWord)) {
            if (currentDirection === DIRECTIONS.HORIZONTAL) {
                nextCol++;
            } else {
                nextRow++;
            }
        }
        
        return row === nextRow && col === nextCol && 
               nextRow < this.gridSize && nextCol < this.gridSize;
    }

    isPartOfCurrentWord(row, col, currentWord) {
        return currentWord.some(w => w.row === row && w.col === col);
    }

    getAllFormedWords(currentWord) {
        const formedWords = [];
        const wordSet = new Set(); // Prevent duplicates

        // For each new letter placed, check what words it forms
        for (const letterPos of currentWord) {
            if (!letterPos.isNew) continue; // Only check newly placed letters

            // Check horizontal word at this position
            const horizontalWord = this.getWordAt(letterPos.row, letterPos.col, DIRECTIONS.HORIZONTAL);
            if (horizontalWord.length >= GAME_CONFIG.MIN_WORD_LENGTH && !wordSet.has(horizontalWord)) {
                formedWords.push(horizontalWord);
                wordSet.add(horizontalWord);
            }

            // Check vertical word at this position
            const verticalWord = this.getWordAt(letterPos.row, letterPos.col, DIRECTIONS.VERTICAL);
            if (verticalWord.length >= GAME_CONFIG.MIN_WORD_LENGTH && !wordSet.has(verticalWord)) {
                formedWords.push(verticalWord);
                wordSet.add(verticalWord);
            }
        }

        return formedWords;
    }

    getWordAt(row, col, direction) {
        if (direction === DIRECTIONS.HORIZONTAL) {
            // Find horizontal word containing this position
            let startCol = col;
            let endCol = col;

            // Scan left
            while (startCol > 0 && this.grid[row][startCol - 1]) {
                startCol--;
            }

            // Scan right
            while (endCol < this.gridSize - 1 && this.grid[row][endCol + 1]) {
                endCol++;
            }

            // Build word
            let word = '';
            for (let c = startCol; c <= endCol; c++) {
                word += this.grid[row][c];
            }
            return word;

        } else {
            // Find vertical word containing this position
            let startRow = row;
            let endRow = row;

            // Scan up
            while (startRow > 0 && this.grid[startRow - 1][col]) {
                startRow--;
            }

            // Scan down
            while (endRow < this.gridSize - 1 && this.grid[endRow + 1][col]) {
                endRow++;
            }

            // Build word
            let word = '';
            for (let r = startRow; r <= endRow; r++) {
                word += this.grid[r][col];
            }
            return word;
        }
    }

    // Keep this for compatibility, but now it shows all formed words
    getCompleteWord(currentWord, startRow, startCol, currentDirection) {
        const allWords = this.getAllFormedWords(currentWord);
        return allWords.length > 0 ? allWords.join(' + ') : '';
    }

    getIntersectionWords(currentWord, currentDirection) {
        const intersectionWords = [];
        
        // Check each newly placed letter for perpendicular words
        for (const w of currentWord) {
            if (!w.isNew) continue; // Only check new letters
            
            let word = '';
            
            if (currentDirection === DIRECTIONS.HORIZONTAL) {
                // Check vertical word at this position
                let startRow = w.row;
                let endRow = w.row;
                
                // Scan up
                while (startRow > 0 && this.grid[startRow - 1][w.col]) {
                    startRow--;
                }
                
                // Scan down
                while (endRow < this.gridSize - 1 && this.grid[endRow + 1][w.col]) {
                    endRow++;
                }
                
                // Build vertical word
                if (startRow < w.row || endRow > w.row) {
                    for (let row = startRow; row <= endRow; row++) {
                        word += this.grid[row][w.col];
                    }
                }
                
            } else {
                // Check horizontal word at this position
                let startCol = w.col;
                let endCol = w.col;
                
                // Scan left
                while (startCol > 0 && this.grid[w.row][startCol - 1]) {
                    startCol--;
                }
                
                // Scan right
                while (endCol < this.gridSize - 1 && this.grid[w.row][endCol + 1]) {
                    endCol++;
                }
                
                // Build horizontal word
                if (startCol < w.col || endCol > w.col) {
                    for (let col = startCol; col <= endCol; col++) {
                        word += this.grid[w.row][col];
                    }
                }
            }
            
            if (word.length >= 2) {
                intersectionWords.push(word);
            }
        }
        
        return intersectionWords;
    }

    isConnected(currentWord) {
        // Check if word connects to any existing tile
        for (const w of currentWord) {
            const key = `${w.row}-${w.col}`;
            if (this.startTiles.includes(key) || this.committedTiles.has(key)) {
                return true;
            }
            
            // Check adjacent cells
            const adjacent = [
                [w.row - 1, w.col],
                [w.row + 1, w.col],
                [w.row, w.col - 1],
                [w.row, w.col + 1]
            ];
            
            for (const [r, c] of adjacent) {
                if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                    const adjKey = `${r}-${c}`;
                    if ((this.startTiles.includes(adjKey) || this.committedTiles.has(adjKey)) && 
                        !this.isPartOfCurrentWord(r, c, currentWord)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    areAllTilesConnected() {
        if (this.startTiles.length < 2) return true;
        
        // Use flood fill to check if all starting tiles are in the same connected component
        const visited = new Set();
        const queue = [];
        
        // Start from the first starting tile
        const firstTile = this.startTiles[0];
        const [startRow, startCol] = firstTile.split('-').map(Number);
        queue.push(`${startRow}-${startCol}`);
        visited.add(`${startRow}-${startCol}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const [row, col] = current.split('-').map(Number);
            
            // Check all 4 adjacent cells
            const neighbors = [
                [row - 1, col], // up
                [row + 1, col], // down
                [row, col - 1], // left
                [row, col + 1]  // right
            ];
            
            for (const [r, c] of neighbors) {
                const key = `${r}-${c}`;
                if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize &&
                    !visited.has(key) && this.grid[r][c]) {
                    visited.add(key);
                    queue.push(key);
                }
            }
        }
        
        // Check if all starting tiles were visited
        return this.startTiles.every(tile => visited.has(tile));
    }

    reset() {
        this.createGrid();
        this.startTiles = [];
        this.committedTiles = new Set();
    }
}