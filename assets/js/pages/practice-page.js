import { buildAppUrl } from '../app/config.js';
import { Connect5Game } from '../core/Connect5Game.js';

document.addEventListener('DOMContentLoaded', () => {
    new Connect5Game();

    document.getElementById('dailyBtn')?.addEventListener('click', () => {
        window.location.href = buildAppUrl('pages/daily.html');
    });
});
