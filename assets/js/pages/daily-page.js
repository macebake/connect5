import { buildAppUrl } from '../app/config.js';
import { DailyPuzzle } from '../features/daily/DailyPuzzle.js';

document.addEventListener('DOMContentLoaded', () => {
    new DailyPuzzle();

    document.getElementById('practiceBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/practice.html');
    });
});
