export class DailyProgressStore {
    constructor(puzzleDate) {
        this.puzzleDate = puzzleDate;
        this.storageKey = `connect5:daily:${puzzleDate}`;
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Failed to read daily progress from localStorage:', error);
            return null;
        }
    }

    save(payload) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                puzzleDate: this.puzzleDate,
                ...payload
            }));
        } catch (error) {
            console.warn('Failed to save daily progress to localStorage:', error);
        }
    }
}
