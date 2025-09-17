// Scrabble letter values
const LETTER_VALUES = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10
};

// Word validation cache to avoid repeated API calls
const WORD_CACHE = new Map();

class WordGridGame {
    constructor() {
        this.gridSize = 10;
        this.grid = [];
        this.currentTurn = 1;
        this.maxTurns = 7;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;
        this.startTiles = [];
        this.committedTiles = new Set();
        
        this.init();
    }

    init() {
        this.createGrid();
        this.placeStartTiles();
        this.renderGrid();
        this.attachEventListeners();
        this.updateStats();
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
        const letters = 'AAEEIIOOUURRLLLNNNSSTTDDGGBBCCMMPPFFHHVVWWYYKJXQZ';
        const positions = [];
        this.startTiles = [];
        
        // Place 5 random tiles
        for (let i = 0; i < 5; i++) {
            const letter = letters[Math.floor(Math.random() * letters.length)];
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

    renderGrid() {
        const gridEl = document.getElementById('grid');
        gridEl.innerHTML = '';
        
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
                const inCurrentWord = this.currentWord.find(w => w.row === i && w.col === j);
                if (inCurrentWord) {
                    cell.classList.add('current-word');
                }
                
                // Add arrow for direction at the current typing position
                if (this.isTyping && this.shouldShowArrowAt(i, j)) {
                    cell.classList.add('arrow');
                    if (this.currentDirection === 'horizontal') {
                        cell.classList.add('arrow-right');
                    } else if (this.currentDirection === 'vertical') {
                        cell.classList.add('arrow-down');
                    }
                }
                
                // Add selected state for starting cell
                if (this.isTyping && i === this.startRow && j === this.startCol) {
                    cell.classList.add('selected');
                }
                
                gridEl.appendChild(cell);
            }
        }
    }

    canTypeAt(row, col) {
        if (!this.isTyping) return true;
        if (this.grid[row][col] && !this.isPartOfCurrentWord(row, col)) return false;
        
        if (this.currentDirection === 'horizontal') {
            return row === this.startRow && col >= this.startCol;
        } else if (this.currentDirection === 'vertical') {
            return col === this.startCol && row >= this.startRow;
        }
        return false;
    }

    isPartOfCurrentWord(row, col) {
        return this.currentWord.some(w => w.row === row && w.col === col);
    }

    shouldShowArrowAt(row, col) {
        if (!this.isTyping) return false;
        
        // If no letters typed yet, show arrow at starting position
        if (this.currentWord.length === 0) {
            return row === this.startRow && col === this.startCol;
        }
        
        // Show arrow at the position where the next letter would go
        const lastLetter = this.currentWord[this.currentWord.length - 1];
        let nextRow, nextCol;
        
        if (this.currentDirection === 'horizontal') {
            nextRow = lastLetter.row;
            nextCol = lastLetter.col + 1;
        } else {
            nextRow = lastLetter.row + 1;
            nextCol = lastLetter.col;
        }
        
        // Check if we need to skip occupied cells
        while (nextRow < this.gridSize && nextCol < this.gridSize && 
               this.grid[nextRow][nextCol] && !this.isPartOfCurrentWord(nextRow, nextCol)) {
            if (this.currentDirection === 'horizontal') {
                nextCol++;
            } else {
                nextRow++;
            }
        }
        
        return row === nextRow && col === nextCol && 
               nextRow < this.gridSize && nextCol < this.gridSize;
    }

    attachEventListeners() {
        const gridEl = document.getElementById('grid');
        gridEl.addEventListener('click', this.handleCellClick.bind(this));
        
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        document.getElementById('submitBtn').addEventListener('click', this.submitWord.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearCurrentWord.bind(this));
        document.getElementById('newGameBtn').addEventListener('click', this.newGame.bind(this));
        document.getElementById('infoBtn').addEventListener('click', this.showModal.bind(this));
        document.getElementById('modalClose').addEventListener('click', this.hideModal.bind(this));
        document.getElementById('modalOverlay').addEventListener('click', this.handleOverlayClick.bind(this));
    }

    handleCellClick(e) {
        if (!e.target.classList.contains('cell')) return;
        if (this.currentTurn > this.maxTurns) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (this.isTyping) {
            // If clicking on the starting cell while typing, switch direction
            if (row === this.startRow && col === this.startCol) {
                this.switchDirection();
                return;
            }
            
            // If clicking on a different empty cell, start typing there instead
            if (!this.grid[row][col]) {
                this.clearCurrentWord();
                this.startTyping(row, col);
                return;
            }
            
            if (!this.canTypeAt(row, col)) return;
        }
        
        if (this.grid[row][col] && !this.isPartOfCurrentWord(row, col)) return;
        
        if (!this.isTyping) {
            this.startTyping(row, col);
        }
    }

    startTyping(row, col) {
        this.isTyping = true;
        this.startRow = row;
        this.startCol = col;
        this.currentWord = [];
        
        // Starting cell should be empty for typing
        if (this.grid[row][col]) {
            this.showMessage('Cannot start typing on an occupied cell!', 'error');
            return;
        }
        
        // Determine possible directions
        const hasHorizontal = this.canExtendHorizontal(row, col);
        const hasVertical = this.canExtendVertical(row, col);
        
        if (hasHorizontal && !hasVertical) {
            this.currentDirection = 'horizontal';
        } else if (!hasHorizontal && hasVertical) {
            this.currentDirection = 'vertical';
        } else {
            this.currentDirection = 'horizontal'; // Default
        }
        
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('clearBtn').disabled = false;
        this.showMessage('Type your word. Press Enter to submit or Escape to clear.', 'info');
        this.updateCurrentWordDisplay();
        this.updateWordScore();
        this.renderGrid();
    }

    switchDirection() {
        // Only allow switching if we haven't typed any letters yet
        if (this.currentWord.length > 0) {
            this.showMessage('Cannot change direction after typing letters!', 'error');
            return;
        }

        const hasHorizontal = this.canExtendHorizontal(this.startRow, this.startCol);
        const hasVertical = this.canExtendVertical(this.startRow, this.startCol);

        if (this.currentDirection === 'horizontal' && hasVertical) {
            this.currentDirection = 'vertical';
            this.showMessage('Direction changed to vertical. Type your word.', 'info');
        } else if (this.currentDirection === 'vertical' && hasHorizontal) {
            this.currentDirection = 'horizontal';
            this.showMessage('Direction changed to horizontal. Type your word.', 'info');
        } else {
            this.showMessage('Cannot switch to that direction from this position.', 'error');
        }

        this.renderGrid();
    }

    canExtendHorizontal(row, col) {
        return col < this.gridSize - 1;
    }

    canExtendVertical(row, col) {
        return row < this.gridSize - 1;
    }

    handleArrowKey(key) {
        if (!this.isTyping) return;
        
        // Only allow arrow key movement if no letters have been typed yet
        if (this.currentWord.length > 0) {
            this.showMessage('Cannot move after typing letters! Use Escape to clear first.', 'error');
            return;
        }
        
        // Calculate new position based on arrow key
        let newRow = this.startRow;
        let newCol = this.startCol;
        
        switch (key) {
            case 'ArrowUp':
                newRow = Math.max(0, this.startRow - 1);
                break;
            case 'ArrowDown':
                newRow = Math.min(this.gridSize - 1, this.startRow + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, this.startCol - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(this.gridSize - 1, this.startCol + 1);
                break;
        }
        
        // Only move if the new position is empty
        if (!this.grid[newRow][newCol]) {
            this.startRow = newRow;
            this.startCol = newCol;
            
            // Update direction based on movement and available extensions
            if (key === 'ArrowLeft' || key === 'ArrowRight') {
                if (this.canExtendHorizontal(newRow, newCol)) {
                    this.currentDirection = 'horizontal';
                } else if (this.canExtendVertical(newRow, newCol)) {
                    this.currentDirection = 'vertical';
                }
            } else {
                if (this.canExtendVertical(newRow, newCol)) {
                    this.currentDirection = 'vertical';
                } else if (this.canExtendHorizontal(newRow, newCol)) {
                    this.currentDirection = 'horizontal';
                }
            }
            
            this.showMessage('Use arrow keys to move, then type your word.', 'info');
            this.renderGrid();
        } else {
            this.showMessage('Cannot move to occupied cell!', 'error');
        }
    }

    handleKeyPress(e) {
        if (!this.isTyping) return;
        
        if (e.key === 'Enter') {
            this.submitWord();
        } else if (e.key === 'Escape') {
            this.clearCurrentWord();
        } else if (e.key === 'Backspace') {
            this.removeLastLetter();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            this.handleArrowKey(e.key);
            e.preventDefault();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            this.addLetter(e.key.toUpperCase());
        }
    }

    addLetter(letter) {
        if (!this.isTyping) return;
        
        let nextRow, nextCol;
        
        if (this.currentWord.length === 0) {
            // First letter - place at starting position
            nextRow = this.startRow;
            nextCol = this.startCol;
        } else {
            // Subsequent letters - place after the last letter in currentWord
            const lastLetter = this.currentWord[this.currentWord.length - 1];
            if (this.currentDirection === 'horizontal') {
                nextRow = lastLetter.row;
                nextCol = lastLetter.col + 1;
            } else {
                nextRow = lastLetter.row + 1;
                nextCol = lastLetter.col;
            }
        }
        
        // Check bounds
        if (nextRow >= this.gridSize || nextCol >= this.gridSize) return;
        
        // Skip if there's already a letter there (unless it's part of current word)
        if (this.grid[nextRow][nextCol] && !this.isPartOfCurrentWord(nextRow, nextCol)) {
            // Try to skip to next position
            if (this.currentDirection === 'horizontal') {
                nextCol++;
            } else {
                nextRow++;
            }
            if (nextRow >= this.gridSize || nextCol >= this.gridSize) return;
        }
        
        this.currentWord.push({ row: nextRow, col: nextCol, letter, isNew: !this.grid[nextRow][nextCol] });
        if (!this.grid[nextRow][nextCol]) {
            this.grid[nextRow][nextCol] = letter;
        }
        
        this.updateCurrentWordDisplay();
        this.updateWordScore();
        this.renderGrid();
    }

    removeLastLetter() {
        if (this.currentWord.length === 0) return;
        
        const lastLetter = this.currentWord.pop();
        if (lastLetter.isNew) {
            this.grid[lastLetter.row][lastLetter.col] = '';
        }
        
        this.updateCurrentWordDisplay();
        this.updateWordScore();
        this.renderGrid();
    }

    updateCurrentWordDisplay() {
        const wordStr = this.getCompleteWord();
        document.getElementById('currentWord').textContent = wordStr || '';
    }

    updateWordScore() {
        let score = 0;
        let hasNewLetters = false;
        
        // Calculate score from currentWord array - this is more reliable
        for (const w of this.currentWord) {
            const letter = w.letter || this.grid[w.row][w.col];
            score += LETTER_VALUES[letter] || 0;
            if (w.isNew) {
                hasNewLetters = true;
            }
        }
        
        // Word score display removed - now only show in main score
    }

    clearCurrentWord(exitTypingMode = true) {
        for (const w of this.currentWord) {
            if (w.isNew) {
                this.grid[w.row][w.col] = '';
            }
        }
        
        this.currentWord = [];
        
        if (exitTypingMode) {
            this.isTyping = false;
            this.currentDirection = null;
            this.startRow = null;
            this.startCol = null;
            
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('clearBtn').disabled = true;
            this.showMessage('Word cleared. Click a cell to start a new word.', 'info');
        }
        
        document.getElementById('currentWord').textContent = '';
        this.renderGrid();
    }

    async submitWord() {
        // Get the complete word first
        const wordStr = this.getCompleteWord();
        
        if (wordStr.length < 2) {
            this.showMessage('Word must be at least 2 letters long!', 'error');
            return;
        }
        
        // Show loading message while validating
        this.showMessage('Validating word...', 'info');
        
        const isValid = await this.isValidWord(wordStr);
        if (!isValid) {
            this.showMessage(`"${wordStr}" is not a valid word!`, 'error');
            return;
        }
        
        // Check all intersecting words formed by new letters
        const intersectionWords = this.getIntersectionWords();
        for (const word of intersectionWords) {
            if (word.length >= 2) {
                const isIntersectionValid = await this.isValidWord(word);
                if (!isIntersectionValid) {
                    this.showMessage(`"${word}" formed by intersection is not a valid word!`, 'error');
                    return;
                }
            }
        }
        
        if (!this.isConnected()) {
            this.showMessage('Word must connect to existing letters!', 'error');
            return;
        }
        
        // Calculate score for main word
        let mainWordScore = 0;
        let tilesPlaced = 0;
        
        for (const w of this.currentWord) {
            const letter = w.letter || this.grid[w.row][w.col];
            mainWordScore += LETTER_VALUES[letter] || 0;
            if (w.isNew) {
                tilesPlaced++;
                this.committedTiles.add(`${w.row}-${w.col}`);
            }
        }
        
        // Calculate score for intersection words
        let intersectionScore = 0;
        for (const intersectionWord of intersectionWords) {
            for (const letter of intersectionWord) {
                intersectionScore += LETTER_VALUES[letter] || 0;
            }
        }
        
        const totalWordScore = mainWordScore + intersectionScore;
        this.score += totalWordScore;
        
        // Clear current word state
        this.currentWord = [];
        this.isTyping = false;
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
        document.getElementById('currentWord').textContent = '';
        
        // Create message showing all words formed
        let message = `Word "${wordStr}" submitted!`;
        if (intersectionWords.length > 0) {
            message += ` Also formed: ${intersectionWords.join(', ')}.`;
        }
        message += ` +${totalWordScore} points`;
        
        this.showMessage(message, 'success');
        
        this.currentTurn++;
        this.updateStats();
        this.renderGrid();
        
        // Check for win condition: all starting tiles connected
        if (this.areAllTilesConnected()) {
            this.winGame();
        } else if (this.currentTurn > this.maxTurns) {
            this.endGame();
        }
    }

    getCompleteWord() {
        if (this.currentWord.length === 0) return '';
        
        // Find the full extent of the word by scanning in both directions
        let startRow, startCol, endRow, endCol;
        
        if (this.currentDirection === 'horizontal') {
            startRow = endRow = this.startRow;
            startCol = this.startCol;
            endCol = this.startCol;
            
            // Scan left to find the beginning
            while (startCol > 0 && this.grid[startRow][startCol - 1]) {
                startCol--;
            }
            
            // Scan right to find the end
            while (endCol < this.gridSize - 1 && this.grid[endRow][endCol + 1]) {
                endCol++;
            }
            
            // Build the word from left to right
            let word = '';
            for (let col = startCol; col <= endCol; col++) {
                word += this.grid[startRow][col];
            }
            return word;
            
        } else {
            // Vertical
            startCol = endCol = this.startCol;
            startRow = this.startRow;
            endRow = this.startRow;
            
            // Scan up to find the beginning
            while (startRow > 0 && this.grid[startRow - 1][startCol]) {
                startRow--;
            }
            
            // Scan down to find the end
            while (endRow < this.gridSize - 1 && this.grid[endRow + 1][endCol]) {
                endRow++;
            }
            
            // Build the word from top to bottom
            let word = '';
            for (let row = startRow; row <= endRow; row++) {
                word += this.grid[row][startCol];
            }
            return word;
        }
    }

    getIntersectionWords() {
        const intersectionWords = [];
        
        // Check each newly placed letter for perpendicular words
        for (const w of this.currentWord) {
            if (!w.isNew) continue; // Only check new letters
            
            let word = '';
            
            if (this.currentDirection === 'horizontal') {
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

    async isValidWord(word) {
        const upperWord = word.toUpperCase();
        
        // Check cache first
        if (WORD_CACHE.has(upperWord)) {
            return WORD_CACHE.get(upperWord);
        }
        
        try {
            // Use Dictionary API - this is a free API that covers most English words
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${upperWord.toLowerCase()}`);
            const isValid = response.ok;
            
            // Cache the result
            WORD_CACHE.set(upperWord, isValid);
            return isValid;
            
        } catch (error) {
            console.warn('Dictionary API error:', error);
            // Fallback: accept words 2+ letters for now
            const isValid = word.length >= 2;
            WORD_CACHE.set(upperWord, isValid);
            return isValid;
        }
    }

    isConnected() {
        // Check if word connects to any existing tile
        for (const w of this.currentWord) {
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
                        !this.isPartOfCurrentWord(r, c)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    updateStats() {
        const turnEl = document.getElementById('turn');
        const currentDisplayTurn = Math.min(this.currentTurn, this.maxTurns);
        turnEl.textContent = `${currentDisplayTurn}/${this.maxTurns}`;
        
        // Add last turn styling and warning
        if (currentDisplayTurn === this.maxTurns) {
            turnEl.classList.add('last-turn');
            this.showLastTurnWarning();
        } else {
            turnEl.classList.remove('last-turn');
            this.hideLastTurnWarning();
        }
        
        document.getElementById('score').textContent = this.score;
    }

    showLastTurnWarning() {
        let warningEl = document.getElementById('lastTurnWarning');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'lastTurnWarning';
            warningEl.className = 'last-turn-warning';
            warningEl.textContent = 'LAST TURN';
            
            // Insert before grid container
            const gridContainer = document.querySelector('.grid-container');
            gridContainer.parentNode.insertBefore(warningEl, gridContainer);
        }
        warningEl.style.display = 'block';
    }

    hideLastTurnWarning() {
        const warningEl = document.getElementById('lastTurnWarning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }
    }

    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
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
    
    winGame() {
        const turnsUsed = this.currentTurn - 1;
        const turnsRemaining = this.maxTurns - turnsUsed;
        const bonusPoints = turnsRemaining * 10;
        this.score += bonusPoints;
        
        this.showMessage(`🎉 YOU WIN! All tiles connected in ${turnsUsed} turns! Base Score: ${this.score - bonusPoints} + Bonus: ${bonusPoints} (${turnsRemaining} turns × 10) = Final Score: ${this.score}`, 'success');
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
    }

    endGame() {
        this.showMessage(`💀 YOU LOSE! Failed to connect all tiles in 7 turns. Final Score: ${this.score}`, 'error');
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
    }

    newGame() {
        this.currentTurn = 1;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;
        this.startTiles = [];
        this.committedTiles = new Set();
        
        this.init();
        this.showMessage('New game started! Click a cell to begin.', 'info');
    }

    showModal() {
        document.getElementById('modalOverlay').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none';
    }

    handleOverlayClick(e) {
        // Close modal if clicking on overlay (not the modal content)
        if (e.target === document.getElementById('modalOverlay')) {
            this.hideModal();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new WordGridGame();
});