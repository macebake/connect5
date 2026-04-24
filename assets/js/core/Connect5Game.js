import { GAME_CONFIG, DIRECTIONS, MESSAGE_TYPES } from '../app/constants.js';
import { GridManager } from './GridManager.js';
import { WordValidator } from './WordValidator.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import { UIManager } from './UIManager.js';

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
        this.initialPuzzleState = null;

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
        this.captureInitialPuzzleState();
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
        this.attachEventListeners();
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.setButtonsEnabled(false, true);
        this.uiManager.showMessage('Click an empty cell to start typing a word', MESSAGE_TYPES.INFO);
    }

    attachEventListeners() {
        this.uiManager.elements.grid.addEventListener('click', this.handleCellClick.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.uiManager.elements.mobileInput?.addEventListener('input', this.handleMobileInput.bind(this));
        this.uiManager.elements.mobileInput?.addEventListener('keydown', this.handleMobileInputKeyDown.bind(this));
        this.uiManager.elements.submitBtn.addEventListener('click', this.submitWord.bind(this));
        this.uiManager.elements.clearBtn.addEventListener('click', this.resetPuzzle.bind(this));
        this.uiManager.elements.newGameBtn.addEventListener('click', this.newGame.bind(this));
        this.uiManager.elements.infoBtn.addEventListener('click', this.uiManager.showModal.bind(this.uiManager));
        this.uiManager.elements.modalClose.addEventListener('click', this.uiManager.hideModal.bind(this.uiManager));
        this.uiManager.elements.modalOverlay.addEventListener('click', this.handleOverlayClick.bind(this));
    }

    captureInitialPuzzleState() {
        this.initialPuzzleState = {
            grid: this.gridManager.grid.map((row) => [...row]),
            startTiles: [...this.gridManager.startTiles]
        };
    }

    handleCellClick(e) {
        if (!e.target.classList.contains('cell') || this.gameOver || this.currentTurn > this.maxTurns) {
            return;
        }

        const row = parseInt(e.target.dataset.row, 10);
        const col = parseInt(e.target.dataset.col, 10);

        if (this.isTyping) {
            if (row === this.startRow && col === this.startCol) {
                this.switchDirection();
                return;
            }

            if (!this.gridManager.grid[row][col]) {
                this.clearCurrentWord();
                this.startTyping(row, col);
                return;
            }

            if (!this.canTypeAt(row, col)) {
                return;
            }
        }

        if (this.gridManager.grid[row][col] && !this.gridManager.isPartOfCurrentWord(row, col, this.currentWord)) {
            return;
        }

        if (!this.isTyping) {
            this.startTyping(row, col);
        }
    }

    startTyping(row, col) {
        if (this.gameOver) {
            return;
        }

        if (this.gridManager.grid[row][col]) {
            this.uiManager.showMessage('Cannot start typing on an occupied cell!', MESSAGE_TYPES.ERROR);
            return;
        }

        this.isTyping = true;
        this.startRow = row;
        this.startCol = col;
        this.currentWord = [];
        this.currentDirection = DIRECTIONS.HORIZONTAL;

        this.uiManager.setButtonsEnabled(true, true);
        this.uiManager.showMessage('Type your word. Press Enter to submit or Reset to restart.', MESSAGE_TYPES.INFO);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        this.uiManager.focusMobileInput();
        document.body.classList.add('typing-active');
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    switchDirection() {
        if (this.currentWord.length > 0) {
            this.uiManager.showMessage('Cannot change direction after typing letters!', MESSAGE_TYPES.ERROR);
            return;
        }

        if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
            this.currentDirection = DIRECTIONS.VERTICAL;
            this.uiManager.showMessage('Direction changed to vertical. Type your word.', MESSAGE_TYPES.INFO);
        } else {
            this.currentDirection = DIRECTIONS.HORIZONTAL;
            this.uiManager.showMessage('Direction changed to horizontal. Type your word.', MESSAGE_TYPES.INFO);
        }

        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    handleKeyPress(e) {
        if (this.gameOver || !this.isTyping || e.target === this.uiManager.elements.mobileInput) {
            return;
        }

        if (e.key === 'Enter') {
            void this.submitWord();
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

    handleMobileInput(e) {
        if (this.gameOver || !this.isTyping) {
            return;
        }

        const nextValue = (e.target.value || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
        const currentValue = this.currentWord.map((tile) => tile.letter).join('');

        if (nextValue === currentValue) {
            return;
        }

        if (nextValue.startsWith(currentValue)) {
            for (const letter of nextValue.slice(currentValue.length)) {
                this.addLetter(letter);
            }
        } else if (currentValue.startsWith(nextValue)) {
            while (this.currentWord.length > nextValue.length) {
                this.removeLastLetter();
            }
        } else {
            this.clearCurrentWord(false);
            for (const letter of nextValue) {
                this.addLetter(letter);
            }
        }

        this.uiManager.syncMobileInput(this.currentWord.map((tile) => tile.letter).join(''));
    }

    handleMobileInputKeyDown(e) {
        if (this.gameOver || !this.isTyping) {
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            void this.submitWord();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.clearCurrentWord();
        }
    }

    handleArrowKey(key) {
        if (!this.isTyping) {
            return;
        }

        if (this.currentWord.length > 0) {
            this.uiManager.showMessage('Cannot move after typing letters! Reset if you want to restart.', MESSAGE_TYPES.ERROR);
            return;
        }

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
            default:
                return;
        }

        if (this.gridManager.grid[newRow][newCol]) {
            this.uiManager.showMessage('Cannot move to occupied cell!', MESSAGE_TYPES.ERROR);
            return;
        }

        this.startRow = newRow;
        this.startCol = newCol;

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            if (this.canExtendHorizontal(newRow, newCol)) {
                this.currentDirection = DIRECTIONS.HORIZONTAL;
            } else if (this.canExtendVertical(newRow, newCol)) {
                this.currentDirection = DIRECTIONS.VERTICAL;
            }
        } else if (this.canExtendVertical(newRow, newCol)) {
            this.currentDirection = DIRECTIONS.VERTICAL;
        } else if (this.canExtendHorizontal(newRow, newCol)) {
            this.currentDirection = DIRECTIONS.HORIZONTAL;
        }

        this.uiManager.showMessage('Use arrow keys to move, then type your word.', MESSAGE_TYPES.INFO);
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    canExtendHorizontal(row, col) {
        return col < GAME_CONFIG.GRID_SIZE - 1;
    }

    canExtendVertical(row, col) {
        return row < GAME_CONFIG.GRID_SIZE - 1;
    }

    addLetter(letter) {
        if (!this.isTyping) {
            return;
        }

        let nextRow;
        let nextCol;

        if (this.currentWord.length === 0) {
            nextRow = this.startRow;
            nextCol = this.startCol;
        } else {
            const lastLetter = this.currentWord[this.currentWord.length - 1];
            if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
                nextRow = lastLetter.row;
                nextCol = lastLetter.col + 1;
            } else {
                nextRow = lastLetter.row + 1;
                nextCol = lastLetter.col;
            }
        }

        if (nextRow >= GAME_CONFIG.GRID_SIZE || nextCol >= GAME_CONFIG.GRID_SIZE) {
            return;
        }

        if (this.gridManager.grid[nextRow][nextCol] && !this.gridManager.isPartOfCurrentWord(nextRow, nextCol, this.currentWord)) {
            if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
                nextCol += 1;
            } else {
                nextRow += 1;
            }
            if (nextRow >= GAME_CONFIG.GRID_SIZE || nextCol >= GAME_CONFIG.GRID_SIZE) {
                return;
            }
        }

        this.currentWord.push({
            row: nextRow,
            col: nextCol,
            letter,
            isNew: !this.gridManager.grid[nextRow][nextCol]
        });

        if (!this.gridManager.grid[nextRow][nextCol]) {
            this.gridManager.grid[nextRow][nextCol] = letter;
        }

        this.uiManager.updateCurrentWordDisplay(
            this.gridManager.getCompleteWord(this.currentWord, this.startRow, this.startCol, this.currentDirection)
        );
        this.uiManager.syncMobileInput(this.currentWord.map((tile) => tile.letter).join(''));
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    removeLastLetter() {
        if (this.currentWord.length === 0) {
            return;
        }

        const lastLetter = this.currentWord.pop();
        if (lastLetter.isNew) {
            this.gridManager.grid[lastLetter.row][lastLetter.col] = '';
        }

        this.uiManager.updateCurrentWordDisplay(
            this.gridManager.getCompleteWord(this.currentWord, this.startRow, this.startCol, this.currentDirection)
        );
        this.uiManager.syncMobileInput(this.currentWord.map((tile) => tile.letter).join(''));
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    clearCurrentWord(exitTypingMode = true) {
        for (const tile of this.currentWord) {
            if (tile.isNew) {
                this.gridManager.grid[tile.row][tile.col] = '';
            }
        }

        this.currentWord = [];

        if (exitTypingMode) {
            this.isTyping = false;
            this.currentDirection = null;
            this.startRow = null;
            this.startCol = null;
            this.uiManager.setButtonsEnabled(false, !this.gameOver);
            this.uiManager.showMessage('Word cleared. Click a cell to start a new word.', MESSAGE_TYPES.INFO);
            document.body.classList.remove('typing-active');
        }

        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    canTypeAt(row, col) {
        if (!this.isTyping) {
            return true;
        }
        if (this.gridManager.grid[row][col] && !this.gridManager.isPartOfCurrentWord(row, col, this.currentWord)) {
            return false;
        }

        if (this.currentDirection === DIRECTIONS.HORIZONTAL) {
            return row === this.startRow && col >= this.startCol;
        }
        if (this.currentDirection === DIRECTIONS.VERTICAL) {
            return col === this.startCol && row >= this.startRow;
        }
        return false;
    }

    async submitWord() {
        if (this.gameOver) {
            return;
        }

        const formedWords = this.gridManager.getAllFormedWords(this.currentWord);
        if (formedWords.length === 0) {
            this.uiManager.showMessage('No valid words formed!', MESSAGE_TYPES.ERROR);
            return;
        }

        if (!this.gridManager.isConnected(this.currentWord)) {
            this.uiManager.showMessage('Word must connect to existing letters!', MESSAGE_TYPES.ERROR);
            return;
        }

        const totalTurnScore = this.scoreCalculator.calculateTotalTurnScore(this.currentWord, formedWords);
        const turnSnapshot = {
            score: this.score,
            currentTurn: this.currentTurn,
            grid: this.gridManager.grid.map((row) => [...row]),
            committedTiles: new Set(this.gridManager.committedTiles)
        };
        this.score += totalTurnScore;

        for (const tile of this.currentWord) {
            if (tile.isNew) {
                this.gridManager.committedTiles.add(`${tile.row}-${tile.col}`);
            }
        }

        const submittedWords = formedWords.length === 1
            ? `Word "${formedWords[0]}" submitted!`
            : `Words "${formedWords.join(', ')}" submitted!`;

        this.currentWord = [];
        this.isTyping = false;
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;

        this.uiManager.setButtonsEnabled(false, true);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        document.body.classList.remove('typing-active');
        this.uiManager.showMessage(`${submittedWords} +${totalTurnScore} points`, MESSAGE_TYPES.SUCCESS);

        this.currentTurn += 1;
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );

        if (this.gridManager.areAllTilesConnected()) {
            const boardIsValid = await this.validateCompletedBoard();
            if (boardIsValid) {
                this.winGame();
            } else if (turnSnapshot.currentTurn >= this.maxTurns) {
                this.restoreTurnSnapshot(turnSnapshot);
                this.endGame();
            } else {
                this.restoreTurnSnapshot(turnSnapshot);
            }
        } else if (this.currentTurn > this.maxTurns) {
            this.endGame();
        }
    }

    restoreTurnSnapshot(snapshot) {
        this.score = snapshot.score;
        this.currentTurn = snapshot.currentTurn;
        this.gridManager.grid = snapshot.grid.map((row) => [...row]);
        this.gridManager.committedTiles = new Set(snapshot.committedTiles);
        this.currentWord = [];
        this.isTyping = false;
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;

        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        this.uiManager.setButtonsEnabled(false, true);
        document.body.classList.remove('typing-active');
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
    }

    async validateCompletedBoard() {
        const boardWords = this.gridManager.getAllWordsOnBoard();
        this.uiManager.showMessage('Checking final board...', MESSAGE_TYPES.INFO);

        for (const word of boardWords) {
            const isValid = await this.wordValidator.isValidWord(word);
            if (!isValid) {
                this.uiManager.showMessage(
                    `All tiles are connected, but the final board includes "${word}". Keep going.`,
                    MESSAGE_TYPES.ERROR
                );
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

        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        document.body.classList.remove('typing-active');
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );

        const remainingTurnsLabel = turnsRemaining === 1 ? '1 remaining turn' : `${turnsRemaining} remaining turns`;
        this.uiManager.showMessage(
            `🎉 YOU WIN! All tiles connected in ${turnsUsed} turns. Base score: ${baseScore} + Bonus: ${bonusScore} (${remainingTurnsLabel}) = Final score: ${this.score}`,
            MESSAGE_TYPES.SUCCESS
        );
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
        this.uiManager.clearMobileInput();
        document.body.classList.remove('typing-active');
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
        this.uiManager.showMessage(
            `💀 YOU LOSE! Failed to connect all tiles in ${GAME_CONFIG.MAX_TURNS} turns. Final Score: ${this.score}`,
            MESSAGE_TYPES.ERROR
        );
        this.uiManager.setButtonsEnabled(false, false);
    }

    resetPuzzle() {
        if (!this.initialPuzzleState) {
            return;
        }

        this.currentTurn = 1;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;
        this.gameOver = false;

        this.gridManager.grid = this.initialPuzzleState.grid.map((row) => [...row]);
        this.gridManager.startTiles = [...this.initialPuzzleState.startTiles];
        this.gridManager.committedTiles = new Set();

        this.uiManager.setButtonsEnabled(false, true);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.clearMobileInput();
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.showMessage('Puzzle reset. Click an empty cell to start again.', MESSAGE_TYPES.INFO);
        document.body.classList.remove('typing-active');
        this.gridManager.renderGrid(
            this.currentWord,
            this.isTyping,
            this.startRow,
            this.startCol,
            this.currentDirection
        );
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
        document.body.classList.remove('typing-active');
        this.uiManager.showMessage('New game started! Click a cell to begin.', MESSAGE_TYPES.INFO);
    }

    handleOverlayClick(e) {
        if (e.target === this.uiManager.elements.modalOverlay) {
            this.uiManager.hideModal();
        }
    }
}
