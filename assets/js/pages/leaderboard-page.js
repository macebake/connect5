import { buildAppUrl } from '../app/config.js';
import { LeaderboardManager } from '../features/leaderboard/LeaderboardManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const leaderboard = new LeaderboardManager();
    await leaderboard.init();

    document.getElementById('dailyBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/daily.html');
    });

    window.addEventListener('beforeunload', () => {
        leaderboard.destroy();
    });
});
