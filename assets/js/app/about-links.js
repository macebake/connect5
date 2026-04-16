const REPO_URL = 'https://github.com/macebake/connect5';
const AUTHOR_URL = 'https://macey.info';

export function appendAboutLinks(selector = '.modal-content') {
    const container = document.querySelector(selector);
    if (!container || container.querySelector('.about-links')) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'about-links';
    wrapper.innerHTML = `
        <a class="github-badge" href="${REPO_URL}" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.5.11-3.12 0 0 .98-.31 3.2 1.18a11.07 11.07 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.62.23 2.82.11 3.12.75.81 1.2 1.84 1.2 3.1 0 4.44-2.71 5.42-5.29 5.7.42.36.78 1.08.78 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/>
            </svg>
            <span>View on GitHub</span>
        </a>
        <p>by <a href="${AUTHOR_URL}" target="_blank" rel="noreferrer">macey</a></p>
    `;

    container.appendChild(wrapper);
}
