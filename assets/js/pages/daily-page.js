import { buildAppUrl } from '../app/config.js';
import { DailyPuzzle } from '../features/daily/DailyPuzzle.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new DailyPuzzle();

    document.getElementById('practiceBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/practice.html');
    });

    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        void game.showLeaderboardModal();
    });

    document.getElementById('profileBtn')?.addEventListener('click', () => {
        game.handleProfileClick();
    });
});
