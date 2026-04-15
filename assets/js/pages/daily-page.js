import { buildAppUrl } from '../app/config.js';
import { DailyPuzzle } from '../features/daily/DailyPuzzle.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new DailyPuzzle();

    document.getElementById('homeBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('index.html');
    });

    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        void game.showLeaderboardModal();
    });
});
