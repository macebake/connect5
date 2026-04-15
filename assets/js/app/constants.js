// Connect5 Game Constants
export const LETTER_VALUES = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10
};

export const GAME_CONFIG = {
    GRID_SIZE: 10,
    MAX_TURNS: 6,
    START_TILES_COUNT: 5,
    MIN_WORD_LENGTH: 2,
    BONUS_POINTS_PER_TURN: 10
};

export const TILE_LETTERS = 'AAEEIIOOUURRLLLNNNSSTTDDGGBBCCMMPPFFHHVVWWYYKJXQZ';

export const MESSAGE_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    ERROR: 'error'
};

export const DIRECTIONS = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};
