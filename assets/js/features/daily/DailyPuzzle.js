import { Connect5Game } from '../../core/Connect5Game.js';
import { buildAppUrl } from '../../app/config.js';
import { MESSAGE_TYPES } from '../../app/constants.js';
import { DailyProgressStore } from './DailyProgressStore.js';
import { PuzzleGenerator } from './PuzzleGenerator.js';

export class DailyPuzzle extends Connect5Game {
    constructor() {
        super({ autoInit: false });

        this.puzzleDate = PuzzleGenerator.getCurrentDailyDate();
        this.puzzleEpoch = '2026-04-15';
        this.isDaily = true;
        this.gameCompleted = false;
        this.progressStore = new DailyProgressStore(this.puzzleDate);

        void this.init();
    }

    async init() {
        try {
            await this.loadDailyPuzzle();
            this.initializeDailyGame();
        } catch (error) {
            console.error('Error loading daily puzzle:', error);
            this.uiManager.showMessage('Today\'s puzzle is not available yet. Daily puzzles reset at 00:00 UTC.', MESSAGE_TYPES.ERROR);
        }
    }

    async loadDailyPuzzle() {
        const response = await fetch(buildAppUrl('assets/data/daily-puzzle.json'), { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to fetch daily puzzle (${response.status})`);
        }

        const puzzle = await response.json();
        if (puzzle.date !== this.puzzleDate || !Array.isArray(puzzle.startTiles)) {
            throw new Error(`Daily puzzle file is out of date for ${this.puzzleDate}`);
        }

        this.dailyPuzzleConfig = { startTiles: puzzle.startTiles };
    }

    initializeDailyGame() {
        this.placeDailyStartTiles();
        this.restoreSavedProgress();
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        this.attachEventListeners();
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.addDailyGameModeIndicator();
        this.removeNewGameButton();

        if (this.gameCompleted) {
            this.showCompletedState();
            this.addPostGameOptions();
            return;
        }

        this.uiManager.showMessage('Click an empty cell to start typing a word', MESSAGE_TYPES.INFO);
    }

    placeDailyStartTiles() {
        this.gridManager.reset();

        for (const tile of this.dailyPuzzleConfig.startTiles) {
            this.gridManager.grid[tile.row][tile.col] = tile.letter;
            this.gridManager.startTiles.push(`${tile.row}-${tile.col}`);
        }
    }

    addDailyGameModeIndicator() {
        const header = document.querySelector('.header h1');
        if (header && !header.textContent.includes('#')) {
            header.textContent = `Connect 5 #${this.getPuzzleNumber()}`;
        }

        const headerDiv = document.querySelector('.header');
        if (!headerDiv || headerDiv.querySelector('.daily-date')) {
            return;
        }

        const dateIndicator = document.createElement('div');
        dateIndicator.className = 'daily-date';
        const date = new Date(`${this.puzzleDate}T00:00:00Z`);
        dateIndicator.textContent = `Puzzle for ${date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })} · resets at 00:00 UTC`;
        headerDiv.appendChild(dateIndicator);
    }

    removeNewGameButton() {
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.style.display = 'none';
        }
    }

    getPuzzleNumber() {
        const currentDate = new Date(`${this.puzzleDate}T00:00:00Z`);
        const epochDate = new Date(`${this.puzzleEpoch}T00:00:00Z`);
        const dayNumber = Math.floor((currentDate - epochDate) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, dayNumber);
    }

    getTurnsUsed() {
        return this.gridManager.areAllTilesConnected() ? this.currentTurn - 1 : this.maxTurns;
    }

    getShareUrl() {
        return window.location.hostname === 'localhost'
            ? buildAppUrl('index.html')
            : 'https://connect5.co';
    }

    getShareText() {
        const dayNumber = this.getPuzzleNumber();
        const turnsUsed = this.getTurnsUsed();

        if (this.gridManager.areAllTilesConnected()) {
            return `I solved Connect 5 #${dayNumber} in ${turnsUsed} turns.\n${this.getShareUrl()}`;
        }

        return `I played Connect 5 #${dayNumber} in ${turnsUsed} turns.\n${this.getShareUrl()}`;
    }

    saveProgress(status = 'in_progress') {
        this.progressStore.save({
            status,
            score: this.score,
            currentTurn: this.currentTurn,
            grid: this.gridManager.grid,
            committedTiles: Array.from(this.gridManager.committedTiles),
            startTiles: this.gridManager.startTiles,
            turnsUsed: this.getTurnsUsed()
        });
    }

    restoreSavedProgress() {
        const savedState = this.progressStore.load();
        if (!savedState) {
            return;
        }

        if (Array.isArray(savedState.grid)) {
            this.gridManager.grid = savedState.grid.map((row) => [...row]);
        }

        if (Array.isArray(savedState.committedTiles)) {
            this.gridManager.committedTiles = new Set(savedState.committedTiles);
        }

        if (Array.isArray(savedState.startTiles)) {
            this.gridManager.startTiles = [...savedState.startTiles];
        }

        this.score = typeof savedState.score === 'number' ? savedState.score : 0;
        this.currentTurn = typeof savedState.currentTurn === 'number' ? savedState.currentTurn : 1;

        if (savedState.status === 'won' || savedState.status === 'lost') {
            this.gameCompleted = true;
            this.gameOver = true;
            this.savedResultStatus = savedState.status;
            this.savedTurnsUsed = savedState.turnsUsed ?? this.getTurnsUsed();
        }
    }

    showCompletedState() {
        const turnsUsed = this.savedTurnsUsed ?? this.getTurnsUsed();

        if (this.savedResultStatus === 'won') {
            this.uiManager.showMessage(
                `Today's puzzle is already completed on this device. Final score: ${this.score} | Turns used: ${turnsUsed}/${this.maxTurns}`,
                MESSAGE_TYPES.SUCCESS
            );
        } else {
            this.uiManager.showMessage(
                `Today's puzzle is already finished on this device. Final score: ${this.score} | Turns used: ${turnsUsed}/${this.maxTurns}`,
                MESSAGE_TYPES.ERROR
            );
        }

        this.uiManager.setButtonsEnabled(false, false);
        this.uiManager.updateCurrentWordDisplay('');
    }

    async copyShareResult() {
        const shareField = document.getElementById('shareResultText');
        const shareText = shareField?.value || this.getShareText();

        try {
            await navigator.clipboard.writeText(shareText);
            this.uiManager.showMessage('Result copied to clipboard.', MESSAGE_TYPES.SUCCESS);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.uiManager.showMessage('Result copied to clipboard.', MESSAGE_TYPES.SUCCESS);
        }
    }

    addPostGameOptions() {
        const controls = document.querySelector('.controls');
        if (!controls) {
            return;
        }

        controls.innerHTML = '';

        const sharePanel = document.createElement('div');
        sharePanel.className = 'share-result-panel';

        const shareLabel = document.createElement('label');
        shareLabel.className = 'share-result-label';
        shareLabel.setAttribute('for', 'shareResultText');
        shareLabel.textContent = 'Shareable result';
        sharePanel.appendChild(shareLabel);

        const shareField = document.createElement('textarea');
        shareField.id = 'shareResultText';
        shareField.className = 'share-result-box';
        shareField.readOnly = true;
        shareField.rows = 3;
        shareField.value = this.getShareText();
        shareField.addEventListener('focus', () => {
            shareField.select();
        });
        shareField.addEventListener('click', () => {
            shareField.select();
        });
        sharePanel.appendChild(shareField);

        controls.appendChild(sharePanel);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'submit-btn';
        copyBtn.textContent = 'Copy Shareable Result';
        copyBtn.addEventListener('click', () => {
            void this.copyShareResult();
        });
        controls.appendChild(copyBtn);

        const homeBtn = document.createElement('button');
        homeBtn.className = 'new-game-btn';
        homeBtn.textContent = 'Back to Home';
        homeBtn.addEventListener('click', () => {
            window.location.href = buildAppUrl('index.html');
        });
        controls.appendChild(homeBtn);

        shareField.focus();
        shareField.select();
    }

    async submitWord() {
        if (this.gameCompleted) {
            return;
        }

        const previousTurn = this.currentTurn;
        const previousScore = this.score;
        const previousGameOver = this.gameOver;

        await super.submitWord();

        const progressed =
            this.currentTurn !== previousTurn ||
            this.score !== previousScore ||
            this.gameOver !== previousGameOver;

        if (!progressed) {
            return;
        }

        if (this.gameCompleted) {
            return;
        }

        this.saveProgress('in_progress');
    }

    winGame() {
        super.winGame();
        this.gameCompleted = true;
        this.savedResultStatus = 'won';
        this.savedTurnsUsed = this.getTurnsUsed();
        this.saveProgress('won');
        setTimeout(() => {
            this.addPostGameOptions();
        }, 800);
    }

    endGame() {
        super.endGame();
        this.gameCompleted = true;
        this.savedResultStatus = 'lost';
        this.savedTurnsUsed = this.getTurnsUsed();
        this.saveProgress('lost');
        setTimeout(() => {
            this.addPostGameOptions();
        }, 800);
    }

    newGame() {
        this.uiManager.showMessage('New games are not allowed in daily mode.', MESSAGE_TYPES.ERROR);
    }
}
