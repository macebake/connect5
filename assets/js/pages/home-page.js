import { AuthManager } from '../services/AuthManager.js';
import { GameAPI } from '../services/GameAPI.js';

class HomePage {
    constructor() {
        this.authManager = new AuthManager();
        this.currentUser = null;

        this.initializeApp();
        this.attachEventListeners();
    }

    async initializeApp() {
        // Show loading state
        this.showLoading(true);

        // Listen for auth state changes
        this.authManager.onAuthStateChange((event, session) => {
            this.handleAuthStateChange(event, session);
        });

        await this.authManager.ready;
        this.currentUser = this.authManager.getUser();
        this.applyRequestedTab();

        // Hide loading and show appropriate content
        this.showLoading(false);
        this.updateUI();

        // Load user data if authenticated
        if (this.currentUser) {
            await this.loadUserData();
        }
    }

    handleAuthStateChange(event, session) {
        this.currentUser = session?.user || null;
        this.updateUI();

        if (event === 'SIGNED_IN') {
            this.loadUserData();
        }
    }

    updateUI() {
        const landingPage = document.getElementById('landingPage');
        const userDashboard = document.getElementById('userDashboard');

        if (this.currentUser) {
            landingPage.style.display = 'none';
            userDashboard.style.display = 'block';

            const profile = this.authManager.getProfile();
            if (profile) {
                document.getElementById('usernameDisplay').textContent = profile.username;
            }
        } else {
            landingPage.style.display = 'block';
            userDashboard.style.display = 'none';
        }
    }

    applyRequestedTab() {
        const requestedTab = new URLSearchParams(window.location.search).get('tab');
        if (requestedTab === 'login' || requestedTab === 'register') {
            this.switchTab(requestedTab);
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // Load user stats
            const stats = await GameAPI.getUserStats(this.currentUser.id);
            this.displayUserStats(stats);

            // Check daily puzzle status
            await this.checkDailyStatus();
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    displayUserStats(stats) {
        document.getElementById('totalGames').textContent = stats.totalGames;
        document.getElementById('winRate').textContent = `${stats.winRate}%`;
        document.getElementById('avgScore').textContent = stats.averageScore;
        document.getElementById('leaderboardCount').textContent = stats.leaderboard_appearances;
    }

    async checkDailyStatus() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const attempt = await GameAPI.getDailyAttempt(this.currentUser.id, today);
            const dailyStatus = document.getElementById('dailyStatus');
            const dailyBtn = document.getElementById('dailyPuzzleBtn');

            if (attempt) {
                if (attempt.completed) {
                    dailyStatus.innerHTML = `<p class="completed">Today's puzzle completed! Score: ${attempt.score}</p>`;
                    dailyBtn.textContent = 'View Today\'s Result';
                    dailyBtn.disabled = false;
                } else {
                    dailyStatus.innerHTML = '<p>Resume today\'s puzzle</p>';
                    dailyBtn.textContent = 'Continue Daily Puzzle';
                }
            } else {
                dailyStatus.innerHTML = '<p>Ready to play today\'s puzzle!</p>';
                dailyBtn.textContent = 'Play Daily Puzzle';
            }
        } catch (error) {
            console.error('Error checking daily status:', error);
        }
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            this.handleRegister(e);
        });

        // Navigation buttons
        document.getElementById('signOutBtn')?.addEventListener('click', () => {
            this.handleSignOut();
        });

        document.getElementById('profileBtn')?.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });

        document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });

        // Game mode buttons
        document.getElementById('playDailyBtn')?.addEventListener('click', () => {
            window.location.href = 'daily.html';
        });

        document.getElementById('playPracticeBtn')?.addEventListener('click', () => {
            window.location.href = 'practice.html';
        });

        document.getElementById('dailyPuzzleBtn')?.addEventListener('click', () => {
            window.location.href = 'daily.html';
        });

        document.getElementById('practiceModeBtn')?.addEventListener('click', () => {
            window.location.href = 'practice.html';
        });

        // Modal handling
        document.getElementById('modalClose')?.addEventListener('click', () => {
            document.getElementById('modalOverlay').style.display = 'none';
        });

        document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                document.getElementById('modalOverlay').style.display = 'none';
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`)?.classList.add('active');

        // Clear any messages
        this.hideAuthMessage();
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        try {
            const result = await this.authManager.signIn(email, password);

            if (result.success) {
                this.showAuthMessage('Welcome back!', 'success');
                // UI will update automatically via auth state change
            } else {
                this.showAuthMessage(result.error, 'error');
            }
        } catch (error) {
            this.showAuthMessage('Sign in failed. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Basic validation
        if (username.length < 3) {
            this.showAuthMessage('Username must be at least 3 characters long.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        try {
            const result = await this.authManager.signUp(username, email, password);

            if (result.success) {
                this.showAuthMessage('Account created! Please check your email to verify your account.', 'success');
                // Switch to login tab
                this.switchTab('login');
            } else {
                this.showAuthMessage(result.error, 'error');
            }
        } catch (error) {
            this.showAuthMessage('Account creation failed. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    }

    async handleSignOut() {
        try {
            await this.authManager.signOut();
            this.showAuthMessage('Successfully signed out!', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    showAuthMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.hideAuthMessage();
            }, 3000);
        }
    }

    hideAuthMessage() {
        const messageEl = document.getElementById('authMessage');
        messageEl.style.display = 'none';
    }

    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const content = document.querySelectorAll('.page-content');

        if (show) {
            loading.style.display = 'flex';
            content.forEach(el => el.style.display = 'none');
        } else {
            loading.style.display = 'none';
            // Content visibility will be handled by updateUI()
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});
