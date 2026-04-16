import { GAME_CONFIG, DIRECTIONS, MESSAGE_TYPES } from '../app/constants.js';
import { GridManager } from './GridManager.js';
import { WordValidator } from './WordValidator.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import { UIManager } from './UIManager.js';

// Main Connect5 game class that orchestrates all game systems
export class Connect5Game {
    constructor(options = {}) {
        const { autoInit = true } = options;

        this.currentTurn = 1;
        this.maxTurns = GAME_CONFIG.MAX_TURNS;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;
        this.gameOver = false;
        
        // Initialize managers
        this.uiManager = new UIManager();
        this.gridManager = new GridManager(this.uiManager);
        this.wordValidator = new WordValidator();
        this.scoreCalculator = new ScoreCalculator();
        
        if (autoInit) {
            this.init();
        }
    }

    init() {
        this.gameOver = false;
        this.gridManager.placeStartTiles();
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        this.attachEventListeners();
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.showMessage('Click an empty cell to start typing a word', MESSAGE_TYPES.INFO);
    }

    attachEventListeners() {
        this.uiManager.elements.grid.addEventListener('click', this.handleCellClick.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.uiManager.elements.submitBtn.addEventListener('click', this.submitWord.bind(this));
        this.uiManager.elements.clearBtn.addEventListener('click', this.clearCurrentWord.bind(this));
        this.uiManager.elements.newGameBtn.addEventListener('click', this.newGame.bind(this));
        this.uiManager.elements.infoBtn.addEventListener('click', this.uiManager.showModal.bind(this.uiManager));
        this.uiManager.elements.modalClose.addEventListener('click', this.uiManager.hideModal.bind(this.uiManager));
        this.uiManager.elements.modalOverlay.addEventListener('click', this.handleOverlayClick.bind(this));
    }

    handleCellClick(e) {
        if (!e.target.classList.contains('cell')) return;
        if (this.gameOver) return;
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
            if (!this.gridManager.grid[row][col]) {
                this.clearCurrentWord();
                this.startTyping(row, col);
                return;
            }
            
            if (!this.canTypeAt(row, col)) return;
        }
        
        if (this.gridManager.grid[row][col] && !this.gridManager.isPartOfCurrentWord(row, col, this.currentWord)) return;
        
        if (!this.isTyping) {
            this.startTyping(row, col);
        }
    }

    startTyping(row, col) {
        if (this.gameOver) return;

        this.isTyping = true;
        this.startRow = row;
        this.startCol = col;
        this.currentWord = [];
        
        // Starting cell should be empty for typing
        if (this.gridManager.grid[row][col]) {
            this.uiManager.showMessage('Cannot start typing on an occupied cell!', MESSAGE_TYPES.ERROR);
            return;
        }
        
        // Simple direction selection - default to horizontal
        // User can click same cell to switch direction
        this.currentDirection = DIRECTIONS.HORIZONTAL;
        
        this.uiManager.setButtonsEnabled(true, true);
        this.uiManager.showMessage('Type your word. Press Enter to submit or Escape to clear.', MESSAGE_TYPES.INFO);
        this.uiManager.updateCurrentWordDisplay('');
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
    }

    switchDirection() {
        // Only allow switching if we haven't typed any letters yet
        if (this.currentWord.length > 0) {
            this.uiManager.showMessage('Cannot change direction after typing letters!', MESSAGE_TYPES.ERROR);
            return;
        }

        // Simple direction toggle
        if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
            this.currentDirection = DIRECTIONS.VERTICAL;
            this.uiManager.showMessage('Direction changed to vertical. Type your word.', MESSAGE_TYPES.INFO);
        } else {
            this.currentDirection = DIRECTIONS.HORIZONTAL;
            this.uiManager.showMessage('Direction changed to horizontal. Type your word.', MESSAGE_TYPES.INFO);
        }

        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
    }



    handleKeyPress(e) {
        if (this.gameOver) return;
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

    handleArrowKey(key) {
        if (!this.isTyping) return;
        
        // Only allow arrow key movement if no letters have been typed yet
        if (this.currentWord.length > 0) {
            this.uiManager.showMessage('Cannot move after typing letters! Use Escape to clear first.', MESSAGE_TYPES.ERROR);
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
                newRow = Math.min(GAME_CONFIG.GRID_SIZE - 1, this.startRow + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, this.startCol - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(GAME_CONFIG.GRID_SIZE - 1, this.startCol + 1);
                break;
        }
        
        // Only move if the new position is empty
        if (!this.gridManager.grid[newRow][newCol]) {
            this.startRow = newRow;
            this.startCol = newCol;
            
            // Update direction based on movement and available extensions
            if (key === 'ArrowLeft' || key === 'ArrowRight') {
                if (this.canExtendHorizontal(newRow, newCol)) {
                    this.currentDirection = DIRECTIONS.HORIZONTAL;
                } else if (this.canExtendVertical(newRow, newCol)) {
                    this.currentDirection = DIRECTIONS.VERTICAL;
                }
            } else {
                if (this.canExtendVertical(newRow, newCol)) {
                    this.currentDirection = DIRECTIONS.VERTICAL;
                } else if (this.canExtendHorizontal(newRow, newCol)) {
                    this.currentDirection = DIRECTIONS.HORIZONTAL;
                }
            }
            
            this.uiManager.showMessage('Use arrow keys to move, then type your word.', MESSAGE_TYPES.INFO);
            this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        } else {
            this.uiManager.showMessage('Cannot move to occupied cell!', MESSAGE_TYPES.ERROR);
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
            if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
                nextRow = lastLetter.row;
                nextCol = lastLetter.col + 1;
            } else {
                nextRow = lastLetter.row + 1;
                nextCol = lastLetter.col;
            }
        }
        
        // Check bounds
        if (nextRow >= GAME_CONFIG.GRID_SIZE || nextCol >= GAME_CONFIG.GRID_SIZE) return;
        
        // Skip if there's already a letter there (unless it's part of current word)
        if (this.gridManager.grid[nextRow][nextCol] && !this.gridManager.isPartOfCurrentWord(nextRow, nextCol, this.currentWord)) {
            // Try to skip to next position
            if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
                nextCol++;
            } else {
                nextRow++;
            }
            if (nextRow >= GAME_CONFIG.GRID_SIZE || nextCol >= GAME_CONFIG.GRID_SIZE) return;
        }
        
        this.currentWord.push({ row: nextRow, col: nextCol, letter, isNew: !this.gridManager.grid[nextRow][nextCol] });
        if (!this.gridManager.grid[nextRow][nextCol]) {
            this.gridManager.grid[nextRow][nextCol] = letter;
        }
        
        this.uiManager.updateCurrentWordDisplay(this.gridManager.getCompleteWord(this.currentWord, this.startRow, this.startCol, this.currentDirection));
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
    }

    removeLastLetter() {
        if (this.currentWord.length === 0) return;
        
        const lastLetter = this.currentWord.pop();
        if (lastLetter.isNew) {
            this.gridManager.grid[lastLetter.row][lastLetter.col] = '';
        }
        
        this.uiManager.updateCurrentWordDisplay(this.gridManager.getCompleteWord(this.currentWord, this.startRow, this.startCol, this.currentDirection));
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
    }

    clearCurrentWord(exitTypingMode = true) {
        for (const w of this.currentWord) {
            if (w.isNew) {
                this.gridManager.grid[w.row][w.col] = '';
            }
        }
        
        this.currentWord = [];
        
        if (exitTypingMode) {
            this.isTyping = false;
            this.currentDirection = null;
            this.startRow = null;
            this.startCol = null;
            
            this.uiManager.setButtonsEnabled(false, false);
            this.uiManager.showMessage('Word cleared. Click a cell to start a new word.', MESSAGE_TYPES.INFO);
        }
        
        this.uiManager.updateCurrentWordDisplay('');
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
    }

    canTypeAt(row, col) {
        if (!this.isTyping) return true;
        if (this.gridManager.grid[row][col] && !this.gridManager.isPartOfCurrentWord(row, col, this.currentWord)) return false;
        
        if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
            return row === this.startRow && col >= this.startCol;
        } else if (this.currentDirection === DIRECTIONS.VERTICAL) {
            return col === this.startCol && row >= this.startRow;
        }
        return false;
    }

    async submitWord() {
        if (this.gameOver) return;

        // Get all words formed by the new letters
        const formedWords = this.gridManager.getAllFormedWords(this.currentWord);

        if (formedWords.length === 0) {
            this.uiManager.showMessage('No valid words formed!', MESSAGE_TYPES.ERROR);
            return;
        }

        if (!this.gridManager.isConnected(this.currentWord)) {
            this.uiManager.showMessage('Word must connect to existing letters!', MESSAGE_TYPES.ERROR);
            return;
        }
        
        // Calculate and apply scores
        const totalTurnScore = this.scoreCalculator.calculateTotalTurnScore(this.currentWord, formedWords);
        this.score += totalTurnScore;

        // Mark tiles as committed
        for (const w of this.currentWord) {
            if (w.isNew) {
                this.gridManager.committedTiles.add(`${w.row}-${w.col}`);
            }
        }

        // Create success message
        let message;
        if (formedWords.length === 1) {
            message = `Word "${formedWords[0]}" submitted!`;
        } else {
            message = `Words "${formedWords.join(', ')}" submitted!`;
        }
        message += ` +${totalTurnScore} points`;
        
        // Clear current word state
        this.currentWord = [];
        this.isTyping = false;
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        
        this.uiManager.setButtonsEnabled(false, false);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.showMessage(message, MESSAGE_TYPES.SUCCESS);
        
        this.currentTurn++;
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        
        // Check for win condition: all starting tiles connected
        if (this.gridManager.areAllTilesConnected()) {
            const boardIsValid = await this.validateCompletedBoard();
            if (boardIsValid) {
                this.winGame();
            } else if (this.currentTurn > this.maxTurns) {
                this.endGame();
            }
        } else if (this.currentTurn > this.maxTurns) {
            this.endGame();
        }
    }

    async validateCompletedBoard() {
        const boardWords = this.gridManager.getAllWordsOnBoard();

        this.uiManager.showMessage('Checking final board...', MESSAGE_TYPES.INFO);

        for (const word of boardWords) {
            const isValid = await this.wordValidator.isValidWord(word);
            if (!isValid) {
                this.uiManager.showMessage(`All tiles are connected, but the final board includes "${word}". Keep going.`, MESSAGE_TYPES.ERROR);
                return false;
            }
        }

        return true;
    }

    winGame() {
        const turnsUsed = this.currentTurn - 1;
        const turnsRemaining = GAME_CONFIG.MAX_TURNS - turnsUsed;
        const bonusScore = this.scoreCalculator.calculateBonusScore(turnsUsed);
        const baseScore = this.score;
        this.score += bonusScore;
        this.gameOver = true;
        this.isTyping = false;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;

        // Update the score display to show the final score with bonus
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.updateCurrentWordDisplay('');
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);

        const remainingTurnsLabel = turnsRemaining === 1 ? '1 remaining turn' : `${turnsRemaining} remaining turns`;
        this.uiManager.showMessage(`🎉 YOU WIN! All tiles connected in ${turnsUsed} turns. Base score: ${baseScore} + Bonus: ${bonusScore} (${remainingTurnsLabel}) = Final score: ${this.score}`, MESSAGE_TYPES.SUCCESS);
        this.uiManager.setButtonsEnabled(false, false);
    }

    endGame() {
        this.gameOver = true;
        this.isTyping = false;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.uiManager.updateCurrentWordDisplay('');
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        this.uiManager.showMessage(`💀 YOU LOSE! Failed to connect all tiles in ${GAME_CONFIG.MAX_TURNS} turns. Final Score: ${this.score}`, MESSAGE_TYPES.ERROR);
        this.uiManager.setButtonsEnabled(false, false);
    }

    newGame() {
        this.currentTurn = 1;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;
        this.gameOver = false;
        
        this.gridManager.reset();
        this.init();
        this.uiManager.showMessage('New game started! Click a cell to begin.', MESSAGE_TYPES.INFO);
    }

    handleOverlayClick(e) {
        // Close modal if clicking on overlay (not the modal content)
        if (e.target === this.uiManager.elements.modalOverlay) {
            this.uiManager.hideModal();
        }
    }
}
