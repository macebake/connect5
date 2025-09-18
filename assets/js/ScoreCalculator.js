import { LETTER_VALUES, GAME_CONFIG } from './constants.js';

// Scoring logic for Connect5
export class ScoreCalculator {
    
    calculateWordScore(word) {
        let score = 0;
        for (const letter of word) {
            score += LETTER_VALUES[letter] || 0;
        }
        return score;
    }

    calculateCurrentWordScore(currentWordArray) {
        let score = 0;
        for (const w of currentWordArray) {
            const letter = w.letter;
            score += LETTER_VALUES[letter] || 0;
        }
        return score;
    }

    calculateIntersectionWordsScore(intersectionWords) {
        let totalScore = 0;
        for (const word of intersectionWords) {
            totalScore += this.calculateWordScore(word);
        }
        return totalScore;
    }

    calculateBonusScore(turnsUsed) {
        const turnsRemaining = GAME_CONFIG.MAX_TURNS - turnsUsed;
        return turnsRemaining * GAME_CONFIG.BONUS_POINTS_PER_TURN;
    }

    calculateTotalTurnScore(mainWordArray, intersectionWords) {
        const mainScore = this.calculateCurrentWordScore(mainWordArray);
        const intersectionScore = this.calculateIntersectionWordsScore(intersectionWords);
        return mainScore + intersectionScore;
    }
}