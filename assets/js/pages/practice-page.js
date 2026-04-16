import { buildAppUrl } from '../app/config.js';
import { appendAboutLinks } from '../app/about-links.js';
import { Connect5Game } from '../core/Connect5Game.js';

document.addEventListener('DOMContentLoaded', () => {
    appendAboutLinks();
    new Connect5Game();

    document.getElementById('dailyBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('index.html');
    });
});
