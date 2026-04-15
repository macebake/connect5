import { Connect5Game } from '../../core/Connect5Game.js';
import { PuzzleGenerator } from './PuzzleGenerator.js';
import { AuthManager } from '../../services/AuthManager.js';
import { GameAPI } from '../../services/GameAPI.js';
import { MESSAGE_TYPES } from '../../app/constants.js';

export class DailyPuzzle extends Connect5Game {
    constructor() {
        super({ autoInit: false });

        this.authManager = new AuthManager();
        this.gameApi = GameAPI;
        this.puzzleDate = new Date().toISOString().split('T')[0];
        this.dailyAttempt = null;
        this.isDaily = true;

        // Override some parent properties
        this.gameStarted = false;
        this.gameCompleted = false;

        void this.init();
    }

    async init() {
        try {
            await this.authManager.ready;

            // Load today's puzzle
            await this.loadDailyPuzzle();

            // Check if user has already attempted today's puzzle (only if authenticated)
            if (this.authManager.isAuthenticated()) {
                await this.checkExistingAttempt();
            }

            // Initialize the game with the daily puzzle
            this.initializeDailyGame();

        } catch (error) {
            console.error('Error initializing daily puzzle:', error);
            this.uiManager.showMessage('Error loading daily puzzle. Please try again.', MESSAGE_TYPES.ERROR);
        }
    }

    async loadDailyPuzzle() {
        try {
            const puzzle = await GameAPI.getDailyPuzzle(this.puzzleDate);
            this.dailyPuzzleConfig = puzzle.puzzle_config;
        } catch (error) {
            console.error('Error loading daily puzzle:', error);
            // Fall back to client-side generation
            const generatedPuzzle = PuzzleGenerator.getTodaysPuzzle();
            this.dailyPuzzleConfig = { startTiles: generatedPuzzle.startTiles };
        }
    }

    async checkExistingAttempt() {
        const userId = this.authManager.getUser().id;
        this.dailyAttempt = await GameAPI.getDailyAttempt(userId, this.puzzleDate);

        if (this.dailyAttempt) {
            if (this.dailyAttempt.completed) {
                this.gameCompleted = true;
                this.showCompletedGameUI();
                return;
            }
            // User has started but not completed - allow them to continue
        }
    }

    initializeDailyGame() {
        if (this.gameCompleted) return;

        // Use the daily puzzle configuration
        this.placeDailyStartTiles();
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        this.attachEventListeners();
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);


        this.addDailyGameModeIndicator();
        this.removeNewGameButton();
    }

    placeDailyStartTiles() {
        // Clear the grid first
        this.gridManager.reset();

        // Place the daily puzzle tiles
        const startTiles = this.dailyPuzzleConfig.startTiles;

        for (const tile of startTiles) {
            this.gridManager.grid[tile.row][tile.col] = tile.letter;
            this.gridManager.startTiles.push(`${tile.row}-${tile.col}`);
        }
    }

    addDailyGameModeIndicator() {
        // Add visual indicator that this is daily mode
        const header = document.querySelector('.header h1');
        if (header && !header.textContent.includes('#')) {
            const date = new Date(this.puzzleDate);
            const dayNumber = Math.floor((date - new Date('2024-01-01')) / (1000 * 60 * 60 * 24)) + 1;
            header.textContent = `Connect 5 #${dayNumber}`;
        }

        // Add date indicator
        const dateIndicator = document.createElement('div');
        dateIndicator.className = 'daily-date';
        const date = new Date(this.puzzleDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        dateIndicator.textContent = `Puzzle for ${formattedDate}`;

        const headerDiv = document.querySelector('.header');
        if (headerDiv && !headerDiv.querySelector('.daily-date')) {
            headerDiv.appendChild(dateIndicator);
        }

    }

    removeNewGameButton() {
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.style.display = 'none';
        }
    }

    showCompletedGameUI() {
        // Show completed game state
        this.removeNewGameButton();
        this.addDailyGameModeIndicator();

        // Disable all interaction
        this.uiManager.setButtonsEnabled(false, false);

        // Show completion message
        const attempt = this.dailyAttempt;
        if (attempt.completed) {
            this.uiManager.showMessage(
                `Daily puzzle completed! Score: ${attempt.score} | Turns used: ${attempt.turns_used}/${this.maxTurns}`,
                MESSAGE_TYPES.SUCCESS
            );
        }

        // Add sharing and navigation options
        this.addPostGameOptions();
    }

    addPostGameOptions() {
        const controls = document.querySelector('.controls');
        if (!controls) return;

        // Clear existing controls
        controls.innerHTML = '';

        // Add share button
        const shareBtn = document.createElement('button');
        shareBtn.className = 'submit-btn';
        shareBtn.textContent = 'Share Result';
        shareBtn.addEventListener('click', () => this.shareResult());
        controls.appendChild(shareBtn);

        if (this.authManager.isAuthenticated()) {
            // Authenticated users see leaderboard button
            const leaderboardBtn = document.createElement('button');
            leaderboardBtn.className = 'clear-btn';
            leaderboardBtn.textContent = 'View Leaderboard';
            leaderboardBtn.addEventListener('click', () => {
                window.location.href = 'leaderboard.html';
            });
            controls.appendChild(leaderboardBtn);
        } else {
            // Non-authenticated users see sign in button
            const signInBtn = document.createElement('button');
            signInBtn.className = 'clear-btn';
            signInBtn.textContent = 'Sign In to Save Score';
            signInBtn.addEventListener('click', () => {
                window.location.href = 'index.html?tab=login';
            });
            controls.appendChild(signInBtn);
        }

        // Add home button
        const homeBtn = document.createElement('button');
        homeBtn.className = 'new-game-btn';
        homeBtn.textContent = 'Back to Home';
        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        controls.appendChild(homeBtn);
    }

    async shareResult() {
        // For non-authenticated users, use current game state
        let score, turnsUsed, completed;

        if (this.dailyAttempt) {
            // Authenticated user with saved attempt
            score = this.dailyAttempt.score;
            turnsUsed = this.dailyAttempt.turns_used;
            completed = this.dailyAttempt.completed;
        } else {
            // Non-authenticated user, use current game state
            score = this.score;
            turnsUsed = this.gameCompleted ? (this.currentTurn - 1) : this.maxTurns;
            completed = this.gridManager.areAllTilesConnected();
        }

        const profile = this.authManager.getProfile();
        const username = profile?.username || 'Anonymous';
        const date = new Date(this.puzzleDate);
        const dayNumber = Math.floor((date - new Date('2024-01-01')) / (1000 * 60 * 60 * 24)) + 1;

        const status = completed ? 'Victory! 🎉' : 'Incomplete 💀';
        const starRating = this.getStarRating(turnsUsed, completed);

        const shareText = `Connect 5 - Day ${dayNumber} 🎯
Score: ${score} points
Turns: ${turnsUsed}/6 ${starRating}
Status: ${status}

        Play today: ${new URL('daily.html', window.location.href).toString()}
#Connect5Daily`;

        try {
            await navigator.clipboard.writeText(shareText);
            this.uiManager.showMessage('Result copied to clipboard!', MESSAGE_TYPES.SUCCESS);
        } catch (error) {
            console.error('Error copying to clipboard:', error);

            // Fallback: show text in a modal or alert
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                this.uiManager.showMessage('Result copied to clipboard!', MESSAGE_TYPES.SUCCESS);
            } catch (fallbackError) {
                alert(`Share your result:\n\n${shareText}`);
            }

            document.body.removeChild(textArea);
        }
    }

    getStarRating(turnsUsed, completed) {
        if (!completed) return '';

        const starsCount = Math.max(0, this.maxTurns - turnsUsed + 1);
        return '⭐'.repeat(Math.min(starsCount, 5));
    }

    async winGame() {
        // Call parent win logic first
        super.winGame();

        // Save the daily attempt if authenticated
        if (this.authManager.isAuthenticated()) {
            await this.saveDailyAttempt(true);
        }

        // Update UI for completed state
        this.gameCompleted = true;
        setTimeout(() => {
            this.addPostGameOptions();
        }, 2000); // Give time to see the win message
    }

    async endGame() {
        // Call parent end logic first
        super.endGame();

        // Save the daily attempt as incomplete if authenticated
        if (this.authManager.isAuthenticated()) {
            await this.saveDailyAttempt(false);
        }

        // Update UI for completed state
        this.gameCompleted = true;
        setTimeout(() => {
            this.addPostGameOptions();
        }, 2000); // Give time to see the loss message
    }

    async saveDailyAttempt(completed) {
        if (!this.authManager.isAuthenticated()) return;

        try {
            const userId = this.authManager.getUser().id;
            const turnsUsed = completed ? this.currentTurn - 1 : this.maxTurns;

            await GameAPI.submitDailyAttempt(
                userId,
                this.puzzleDate,
                this.score,
                completed,
                turnsUsed
            );

            this.dailyAttempt = {
                user_id: userId,
                puzzle_date: this.puzzleDate,
                score: this.score,
                completed: completed,
                turns_used: turnsUsed
            };

        } catch (error) {
            console.error('Error saving daily attempt:', error);
        }
    }

    // Override attachEventListeners to add reset button
    attachEventListeners() {
        super.attachEventListeners();

        // Add reset button listener
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetPuzzle.bind(this));
        }
    }

    resetPuzzle() {
        // Clear all user progress and reset to initial state
        this.currentTurn = 1;
        this.score = 0;
        this.currentWord = [];
        this.currentDirection = null;
        this.startRow = null;
        this.startCol = null;
        this.isTyping = false;

        // Reset grid to original daily puzzle state
        this.gridManager.reset();
        this.placeDailyStartTiles();

        // Update UI
        this.gridManager.renderGrid(this.currentWord, this.isTyping, this.startRow, this.startCol, this.currentDirection);
        this.uiManager.updateStats(this.currentTurn, this.maxTurns, this.score);
        this.uiManager.setButtonsEnabled(false, false);
        this.uiManager.updateCurrentWordDisplay('');
        this.uiManager.showMessage('Puzzle reset! Click an empty cell to start typing a word', MESSAGE_TYPES.INFO);
    }

    // Override new game to prevent it in daily mode
    newGame() {
        this.uiManager.showMessage('New games are not allowed in daily mode!', MESSAGE_TYPES.ERROR);
    }

    async showLeaderboardModal() {
        const modal = document.getElementById('leaderboardModalOverlay');
        const content = document.getElementById('leaderboardContent');
        const signUpPrompt = document.getElementById('signUpPrompt');

        if (!modal) return;

        // Show modal
        modal.style.display = 'flex';

        // Add close handler
        const closeBtn = document.getElementById('leaderboardModalClose');
        const handleClose = () => {
            modal.style.display = 'none';
            closeBtn.removeEventListener('click', handleClose);
            modal.removeEventListener('click', handleOverlayClick);
        };

        const handleOverlayClick = (e) => {
            if (e.target === modal) handleClose();
        };

        closeBtn.addEventListener('click', handleClose);
        modal.addEventListener('click', handleOverlayClick);

        try {
            // Load leaderboard data
            const leaderboard = await GameAPI.getDailyLeaderboard(this.puzzleDate);

            // Show leaderboard
            content.innerHTML = this.renderLeaderboard(leaderboard);

            // Show sign up prompt if not authenticated
            if (!this.authManager.isAuthenticated()) {
                signUpPrompt.style.display = 'block';
            } else {
                signUpPrompt.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            content.innerHTML = '<div class="message error">Failed to load leaderboard</div>';
        }
    }

    renderLeaderboard(leaderboard) {
        if (!leaderboard || leaderboard.length === 0) {
            return '<div class="message">No scores yet for today\'s puzzle!</div>';
        }

        let html = '<div class="leaderboard-list">';

        leaderboard.slice(0, 10).forEach((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = this.authManager.isAuthenticated() &&
                                 entry.user_id === this.authManager.getProfile()?.id;

            html += `
                <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}">
                    <div class="entry-rank">
                        <span class="rank-number">${rank}</span>
                    </div>
                    <div class="entry-info">
                        <div class="entry-username">${entry.username || 'Anonymous'}</div>
                        <div class="entry-time">${new Date(entry.completedAt).toLocaleTimeString()}</div>
                    </div>
                    <div class="entry-score">
                        <div class="score-value">${entry.score}</div>
                        <div class="score-turns">${entry.turnsUsed}/6 turns</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    handleProfileClick() {
        if (this.authManager.isAuthenticated()) {
            window.location.href = 'profile.html';
        } else {
            this.showAuthModal();
        }
    }

    showAuthModal() {
        const modal = document.getElementById('authModalOverlay');
        if (!modal) return;

        // Show modal
        modal.style.display = 'flex';

        // Set up tab switching
        this.setupAuthTabs();

        // Set up form handlers
        this.setupAuthForms();

        // Add close handler
        const closeBtn = document.getElementById('authModalClose');
        const handleClose = () => {
            modal.style.display = 'none';
            this.clearAuthForms();
            closeBtn.removeEventListener('click', handleClose);
            modal.removeEventListener('click', handleOverlayClick);
        };

        const handleOverlayClick = (e) => {
            if (e.target === modal) handleClose();
        };

        closeBtn.addEventListener('click', handleClose);
        modal.addEventListener('click', handleOverlayClick);
    }

    setupAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs and forms
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));

                // Add active to clicked tab and corresponding form
                tab.classList.add('active');
                const targetForm = document.getElementById(tab.dataset.tab + 'Form');
                if (targetForm) {
                    targetForm.classList.add('active');
                }

                // Update modal title
                const title = document.getElementById('authModalTitle');
                title.textContent = tab.dataset.tab === 'login' ? 'Sign In' : 'Sign Up';
            });
        });
    }

    setupAuthForms() {
        // Login form
        document.getElementById('loginBtn').addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await this.handleLogin(email, password);
        });

        // Signup form
        document.getElementById('signupBtn').addEventListener('click', async () => {
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            await this.handleSignup(username, email, password);
        });

        // Forgot password
        document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            if (!email) {
                this.showAuthMessage('Please enter your email address first', 'error');
                return;
            }
            await this.handleForgotPassword(email);
        });
    }

    async handleLogin(email, password) {
        try {
            const { data, error } = await this.authManager.signIn(email, password);
            if (error) throw error;

            this.showAuthMessage('Successfully signed in!', 'success');
            setTimeout(() => {
                document.getElementById('authModalOverlay').style.display = 'none';
                window.location.reload(); // Refresh to show authenticated state
            }, 1000);
        } catch (error) {
            this.showAuthMessage(error.message || 'Failed to sign in', 'error');
        }
    }

    async handleSignup(username, email, password) {
        try {
            const { data, error } = await this.authManager.signUp(username, email, password);
            if (error) throw error;

            this.showAuthMessage('Account created! Please check your email to verify.', 'success');
            setTimeout(() => {
                document.getElementById('authModalOverlay').style.display = 'none';
            }, 2000);
        } catch (error) {
            this.showAuthMessage(error.message || 'Failed to create account', 'error');
        }
    }

    async handleForgotPassword(email) {
        try {
            const { success, error } = await this.authManager.resetPassword(email);
            if (!success) throw new Error(error);

            this.showAuthMessage('Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            this.showAuthMessage(error.message || 'Failed to send reset email', 'error');
        }
    }

    showAuthMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
    }

    clearAuthForms() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('authMessage').style.display = 'none';
    }
}
