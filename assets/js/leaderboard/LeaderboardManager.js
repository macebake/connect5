import { GameAPI } from '../api/gameApi.js';
import { AuthManager } from '../auth/AuthManager.js';

export class LeaderboardManager {
    constructor() {
        this.authManager = new AuthManager();
        this.currentDailyLeaderboard = [];
        this.currentAllTimeLeaderboard = [];
        this.userRank = null;
        this.refreshInterval = null;
    }

    async init() {
        await this.authManager.ready;
        await this.loadLeaderboards();
        this.renderLeaderboards();
        this.attachEventListeners();
        this.startAutoRefresh();
    }

    async loadLeaderboards() {
        try {
            // Load daily and all-time leaderboards in parallel
            const [dailyBoard, allTimeBoard] = await Promise.all([
                GameAPI.getDailyLeaderboard(),
                GameAPI.getAllTimeLeaderboard()
            ]);

            this.currentDailyLeaderboard = dailyBoard || [];
            this.currentAllTimeLeaderboard = allTimeBoard || [];

            // Calculate user's current rank if authenticated
            if (this.authManager.isAuthenticated()) {
                await this.calculateUserRank();
            }

        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.showError('Failed to load leaderboards. Please try again.');
        }
    }

    async calculateUserRank() {
        const user = this.authManager.getUser();
        if (!user) return;

        const profile = this.authManager.getProfile();
        if (!profile) return;

        // Find user's rank in daily leaderboard
        const userInDaily = this.currentDailyLeaderboard.find(
            entry => entry.username === profile.username
        );

        this.userRank = {
            daily: userInDaily ? userInDaily.rank : null,
            allTime: null // Will be calculated from all-time leaderboard
        };

        // Find user's rank in all-time leaderboard
        const userInAllTime = this.currentAllTimeLeaderboard.find(
            entry => entry.username === profile.username
        );

        this.userRank.allTime = userInAllTime ? userInAllTime.rank : null;
    }

    renderLeaderboards() {
        this.renderDailyLeaderboard();
        this.renderAllTimeLeaderboard();
        this.renderUserStats();
    }

    renderDailyLeaderboard() {
        const container = document.getElementById('dailyLeaderboard');
        if (!container) return;

        if (this.currentDailyLeaderboard.length === 0) {
            container.innerHTML = `
                <div class="empty-leaderboard">
                    <p>No completed puzzles yet today.</p>
                    <p>Be the first to complete today's challenge!</p>
                </div>
            `;
            return;
        }

        const today = new Date().toLocaleDateString();
        const leaderboardHTML = `
            <div class="leaderboard-header">
                <h3>Today's Top 10</h3>
                <p class="leaderboard-date">${today}</p>
            </div>
            <div class="leaderboard-list">
                ${this.currentDailyLeaderboard.map(entry => this.renderLeaderboardEntry(entry, 'daily')).join('')}
            </div>
        `;

        container.innerHTML = leaderboardHTML;
    }

    renderAllTimeLeaderboard() {
        const container = document.getElementById('allTimeLeaderboard');
        if (!container) return;

        if (this.currentAllTimeLeaderboard.length === 0) {
            container.innerHTML = `
                <div class="empty-leaderboard">
                    <p>No leaderboard appearances yet.</p>
                </div>
            `;
            return;
        }

        const leaderboardHTML = `
            <div class="leaderboard-header">
                <h3>All-Time Champions</h3>
                <p class="leaderboard-subtitle">Most leaderboard appearances</p>
            </div>
            <div class="leaderboard-list">
                ${this.currentAllTimeLeaderboard.map(entry => this.renderAllTimeEntry(entry)).join('')}
            </div>
        `;

        container.innerHTML = leaderboardHTML;
    }

    renderLeaderboardEntry(entry, type = 'daily') {
        const isCurrentUser = this.authManager.getProfile()?.username === entry.username;
        const rankIcon = this.getRankIcon(entry.rank);

        let timeInfo = '';
        if (type === 'daily' && entry.completedAt) {
            const time = new Date(entry.completedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            timeInfo = `<div class="entry-time">${time}</div>`;
        }

        return `
            <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}" data-rank="${entry.rank}">
                <div class="entry-rank">
                    ${rankIcon}
                    <span class="rank-number">${entry.rank}</span>
                </div>
                <div class="entry-info">
                    <div class="entry-username">${this.escapeHtml(entry.username)}</div>
                    ${timeInfo}
                </div>
                <div class="entry-score">
                    <div class="score-value">${entry.score.toLocaleString()}</div>
                    ${type === 'daily' && entry.turnsUsed ?
                        `<div class="score-turns">${entry.turnsUsed}/6 turns</div>` :
                        ''
                    }
                </div>
            </div>
        `;
    }

    renderAllTimeEntry(entry) {
        const isCurrentUser = this.authManager.getProfile()?.username === entry.username;
        const rankIcon = this.getRankIcon(entry.rank);

        return `
            <div class="leaderboard-entry ${isCurrentUser ? 'current-user' : ''}" data-rank="${entry.rank}">
                <div class="entry-rank">
                    ${rankIcon}
                    <span class="rank-number">${entry.rank}</span>
                </div>
                <div class="entry-info">
                    <div class="entry-username">${this.escapeHtml(entry.username)}</div>
                </div>
                <div class="entry-score">
                    <div class="score-value">${entry.leaderboardAppearances}</div>
                    <div class="score-turns">appearances</div>
                </div>
            </div>
        `;
    }

    renderUserStats() {
        const container = document.getElementById('userStats');
        if (!container || !this.authManager.isAuthenticated()) {
            if (container) container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const profile = this.authManager.getProfile();

        const dailyRankText = this.userRank?.daily ?
            `#${this.userRank.daily} today` :
            'Not ranked today';

        const allTimeRankText = this.userRank?.allTime ?
            `#${this.userRank.allTime} all-time` :
            'No all-time rank';

        container.innerHTML = `
            <div class="user-stats-header">
                <h3>Your Rankings</h3>
                <p>Welcome, ${this.escapeHtml(profile?.username || 'Player')}!</p>
            </div>
            <div class="user-rank-display">
                <div class="rank-item daily">
                    <div class="rank-label">Daily Rank</div>
                    <div class="rank-value ${this.userRank?.daily ? 'ranked' : 'unranked'}">
                        ${dailyRankText}
                    </div>
                </div>
                <div class="rank-item all-time">
                    <div class="rank-label">All-Time Rank</div>
                    <div class="rank-value ${this.userRank?.allTime ? 'ranked' : 'unranked'}">
                        ${allTimeRankText}
                    </div>
                </div>
            </div>
        `;
    }

    getRankIcon(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            case 4:
            case 5: return '🏅';
            default: return '';
        }
    }

    attachEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshLeaderboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Tab switching
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        const dailyBtn = document.getElementById('dailyBtn');
        if (dailyBtn) {
            dailyBtn.addEventListener('click', () => {
                window.location.href = 'daily.html';
            });
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update content visibility
        document.querySelectorAll('.leaderboard-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Content`)?.classList.add('active');
    }

    async refresh() {
        const refreshBtn = document.getElementById('refreshLeaderboard');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            await this.loadLeaderboards();
            this.renderLeaderboards();
            this.showSuccess('Leaderboards updated!');
        } catch (error) {
            this.showError('Failed to refresh leaderboards.');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadLeaderboards().then(() => {
                this.renderLeaderboards();
            }).catch(error => {
                console.error('Auto-refresh error:', error);
            });
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('leaderboardMessage');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.stopAutoRefresh();
    }
}
