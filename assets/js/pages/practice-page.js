import { Connect5Game } from '../core/Connect5Game.js';

function showMessage(message, type) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

function clearForms() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('authMessage').style.display = 'none';
}

function showAuthModal() {
    const modal = document.getElementById('authModalOverlay');
    if (!modal) return;
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('authModalClose');
    const handleClose = () => {
        modal.style.display = 'none';
        clearForms();
    };

    closeBtn.onclick = handleClose;
    modal.onclick = (event) => {
        if (event.target === modal) handleClose();
    };

    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.onclick = () => {
            document.querySelectorAll('.auth-tab').forEach((item) => item.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
            document.getElementById('authModalTitle').textContent =
                tab.dataset.tab === 'login' ? 'Sign In' : 'Sign Up';
        };
    });

    document.getElementById('loginBtn').onclick = () => {
        showMessage('Authentication not available in practice mode. Go to daily mode to sign in.', 'info');
    };

    document.getElementById('signupBtn').onclick = () => {
        showMessage('Authentication not available in practice mode. Go to daily mode to sign up.', 'info');
    };

    document.getElementById('forgotPasswordBtn').onclick = () => {
        showMessage('Authentication not available in practice mode. Go to daily mode for password reset.', 'info');
    };
}

document.addEventListener('DOMContentLoaded', () => {
    new Connect5Game();

    document.getElementById('dailyBtn')?.addEventListener('click', () => {
        window.location.href = 'daily.html';
    });

    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });

    document.getElementById('profileBtn')?.addEventListener('click', () => {
        showAuthModal();
    });
});
