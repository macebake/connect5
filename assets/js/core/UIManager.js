import { MESSAGE_TYPES } from '../app/constants.js';

// UI management and DOM manipulation for Connect5
export class UIManager {
    constructor() {
        this.elements = {
            grid: document.getElementById('grid'),
            turn: document.getElementById('turn'),
            score: document.getElementById('score'),
            currentWord: document.getElementById('currentWord'),
            message: document.getElementById('message'),
            submitBtn: document.getElementById('submitBtn'),
            clearBtn: document.getElementById('clearBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            mobileInput: document.getElementById('mobileInput'),
            infoBtn: document.getElementById('infoBtn'),
            modalOverlay: document.getElementById('modalOverlay'),
            modalClose: document.getElementById('modalClose')
        };
    }

    updateStats(currentTurn, maxTurns, score) {
        const currentDisplayTurn = Math.min(currentTurn, maxTurns);
        this.elements.turn.textContent = `${currentDisplayTurn}/${maxTurns}`;
        
        // Add last turn styling and warning
        if (currentDisplayTurn === maxTurns) {
            this.elements.turn.classList.add('last-turn');
            this.showLastTurnWarning();
        } else {
            this.elements.turn.classList.remove('last-turn');
            this.hideLastTurnWarning();
        }
        
        this.elements.score.textContent = score;
    }

    showLastTurnWarning() {
        let warningEl = document.getElementById('lastTurnWarning');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'lastTurnWarning';
            warningEl.className = 'last-turn-warning';
            warningEl.textContent = 'LAST TURN';
            
            // Insert before grid container
            const gridContainer = document.querySelector('.grid-container');
            gridContainer.parentNode.insertBefore(warningEl, gridContainer);
        }
        warningEl.style.display = 'block';
    }

    hideLastTurnWarning() {
        const warningEl = document.getElementById('lastTurnWarning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }
    }

    showMessage(text, type = MESSAGE_TYPES.INFO) {
        this.elements.message.textContent = text;
        this.elements.message.className = `message ${type}`;
    }

    updateCurrentWordDisplay(wordStr) {
        this.elements.currentWord.textContent = wordStr || '';
    }

    setButtonsEnabled(submitEnabled, clearEnabled) {
        this.elements.submitBtn.disabled = !submitEnabled;
        this.elements.clearBtn.disabled = !clearEnabled;
    }

    focusMobileInput() {
        this.elements.mobileInput?.focus({ preventScroll: true });
    }

    clearMobileInput() {
        if (this.elements.mobileInput) {
            this.elements.mobileInput.value = '';
        }
    }

    syncMobileInput(value) {
        if (this.elements.mobileInput) {
            this.elements.mobileInput.value = value;
        }
    }

    showModal() {
        this.elements.modalOverlay.style.display = 'flex';
    }

    hideModal() {
        this.elements.modalOverlay.style.display = 'none';
    }

    clearGrid() {
        this.elements.grid.innerHTML = '';
    }
}
