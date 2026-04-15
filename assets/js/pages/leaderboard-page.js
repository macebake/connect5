import { LeaderboardManager } from '../features/leaderboard/LeaderboardManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const leaderboard = new LeaderboardManager();
    await leaderboard.init();

    document.getElementById('dailyBtn')?.addEventListener('click', () => {
        window.location.href = 'daily.html';
    });

    window.addEventListener('beforeunload', () => {
        leaderboard.destroy();
    });
});
