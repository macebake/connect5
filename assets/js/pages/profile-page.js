import { buildAppUrl } from '../app/config.js';
import { AuthManager } from '../services/AuthManager.js';
import { GameAPI } from '../services/GameAPI.js';

class ProfilePage {
    constructor() {
        this.authManager = new AuthManager();
        this.userStats = null;
        this.leaderboardHistory = [];
    }

    async init() {
        await this.authManager.ready;

        if (!this.authManager.isAuthenticated()) {
            window.location.href = buildAppUrl('index.html?tab=login');
            return;
        }

        await this.loadProfile();
        this.attachEventListeners();
    }

    async loadProfile() {
        try {
            const user = this.authManager.getUser();
            const profile = this.authManager.getProfile();

            if (!user || !profile) {
                throw new Error('User data not available');
            }

            const [stats, history] = await Promise.all([
                GameAPI.getUserStats(user.id),
                GameAPI.getUserLeaderboardHistory(user.id)
            ]);

            this.userStats = stats;
            this.leaderboardHistory = history;
            this.renderProfile();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile data. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    renderProfile() {
        const profile = this.authManager.getProfile();

        document.getElementById('userUsername').textContent = profile.username;
        document.getElementById('joinDate').textContent = new Date(profile.created_at).toLocaleDateString();
        document.getElementById('totalDailyGames').textContent = this.userStats.total_daily_games;
        document.getElementById('totalPracticeGames').textContent = this.userStats.total_practice_games;
        document.getElementById('winRate').textContent = `${this.userStats.winRate}%`;
        document.getElementById('averageScore').textContent = this.userStats.averageScore.toLocaleString();
        document.getElementById('leaderboardAppearances').textContent = this.userStats.leaderboard_appearances;

        this.renderAchievements();
        this.renderLeaderboardHistory();
        document.getElementById('profileContent').style.display = 'block';
    }

    renderAchievements() {
        const firstPlaces = this.leaderboardHistory.filter((entry) => entry.rank === 1).length;
        const secondPlaces = this.leaderboardHistory.filter((entry) => entry.rank === 2).length;
        const thirdPlaces = this.leaderboardHistory.filter((entry) => entry.rank === 3).length;

        document.getElementById('firstPlaces').textContent = firstPlaces;
        document.getElementById('secondPlaces').textContent = secondPlaces;
        document.getElementById('thirdPlaces').textContent = thirdPlaces;

        const bestScore = Math.max(...this.leaderboardHistory.map((entry) => entry.score), 0);
        const bestRank = Math.min(...this.leaderboardHistory.map((entry) => entry.rank), Infinity);
        const bestRankText = bestRank === Infinity ? 'None yet' : `#${bestRank}`;

        document.getElementById('bestAchievements').innerHTML = `
            <div class="best-item">
                <div class="best-label">Highest Score on Leaderboard</div>
                <div class="best-value">${bestScore.toLocaleString()}</div>
            </div>
            <div class="best-item">
                <div class="best-label">Best Daily Rank</div>
                <div class="best-value">${bestRankText}</div>
            </div>
            <div class="best-item">
                <div class="best-label">Total Games Played</div>
                <div class="best-value">${this.userStats.totalGames}</div>
            </div>
        `;
    }

    renderLeaderboardHistory() {
        const container = document.getElementById('leaderboardHistoryList');

        if (this.leaderboardHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <p>No leaderboard appearances yet.</p>
                    <p>Complete daily puzzles to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }

        const historyHTML = this.leaderboardHistory
            .sort((left, right) => new Date(right.puzzle_date) - new Date(left.puzzle_date))
            .map((entry) => `
                <div class="history-entry">
                    <div class="history-date">
                        ${new Date(entry.puzzle_date).toLocaleDateString()}
                    </div>
                    <div class="history-rank ${this.getRankClass(entry.rank)}">
                        ${this.getRankIcon(entry.rank)} #${entry.rank}
                    </div>
                    <div class="history-score">
                        ${entry.score.toLocaleString()} pts
                    </div>
                </div>
            `).join('');

        container.innerHTML = historyHTML;
    }

    getRankIcon(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            case 4:
            case 5: return '🏅';
            default: return '🏆';
        }
    }

    getRankClass(rank) {
        if (rank <= 3) return 'top-three';
        if (rank <= 5) return 'top-five';
        return 'top-ten';
    }

    attachEventListeners() {
        document.getElementById('homeBtn')?.addEventListener('click', () => {
            window.location.href = buildAppUrl('index.html');
        });

        document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
            window.location.href = buildAppUrl('pages/leaderboard.html');
        });

        document.getElementById('playDailyBtn')?.addEventListener('click', () => {
            window.location.href = buildAppUrl('pages/daily.html');
        });

        document.querySelectorAll('.history-tab').forEach((tab) => {
            tab.addEventListener('click', (event) => {
                this.switchTab(event.target.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.history-tab').forEach((tab) => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        document.querySelectorAll('.history-content').forEach((content) => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`)?.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showError(message) {
        const messageEl = document.getElementById('profileMessage');
        messageEl.textContent = message;
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = new ProfilePage();
    void page.init();
});
