import { buildAppUrl } from '../app/config.js';
import { appendAboutLinks } from '../app/about-links.js';

document.addEventListener('DOMContentLoaded', () => {
    appendAboutLinks();

    document.getElementById('playDailyBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/daily.html');
    });

    document.getElementById('playPracticeBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/practice.html');
    });

    document.getElementById('infoBtn')?.addEventListener('click', () => {
        document.getElementById('modalOverlay').style.display = 'flex';
    });

    document.getElementById('modalClose')?.addEventListener('click', () => {
        document.getElementById('modalOverlay').style.display = 'none';
    });

    document.getElementById('modalOverlay')?.addEventListener('click', (event) => {
        if (event.target.id === 'modalOverlay') {
            document.getElementById('modalOverlay').style.display = 'none';
        }
    });
});
