import { buildAppUrl } from '../app/config.js';
import { supabaseClient } from '../services/supabase-client.js';

const resetForm = document.getElementById('resetForm');
const resetBtn = document.getElementById('resetBtn');
const messageEl = document.getElementById('resetMessage');

resetBtn.disabled = true;

function showMessage(message, type) {
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

async function initializeReset() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
            resetBtn.disabled = false;
            showMessage('Enter your new password below.', 'info');
        }
    });

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        showMessage('This reset link is invalid or expired. Request a new one from the sign-in screen.', 'error');
        return;
    }

    resetBtn.disabled = false;
    showMessage('Enter your new password below.', 'info');
}

resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters long.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = 'Updating...';

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showMessage('Password updated. Redirecting to sign in...', 'success');
        setTimeout(() => {
            window.location.href = buildAppUrl('index.html?tab=login');
        }, 1500);
    } catch (error) {
        showMessage(error.message || 'Failed to update your password.', 'error');
        resetBtn.disabled = false;
        resetBtn.textContent = 'Update Password';
    }
});

void initializeReset();
