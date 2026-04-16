import { buildAppUrl } from '../app/config.js';
import { appendAboutLinks } from '../app/about-links.js';
import { DailyPuzzle } from '../features/daily/DailyPuzzle.js';

document.addEventListener('DOMContentLoaded', () => {
    appendAboutLinks();
    new DailyPuzzle();

    document.getElementById('practiceBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/practice.html');
    });
});
