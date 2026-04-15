// Word validation with dictionary API and caching
export class WordValidator {
    constructor() {
        this.cache = new Map();
    }

    async isValidWord(word) {
        const upperWord = word.toUpperCase();
        
        // Check cache first
        if (this.cache.has(upperWord)) {
            return this.cache.get(upperWord);
        }
        
        try {
            // Use Dictionary API - this is a free API that covers most English words
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${upperWord.toLowerCase()}`);
            const isValid = response.ok;
            
            // Cache the result
            this.cache.set(upperWord, isValid);
            return isValid;
            
        } catch (error) {
            console.warn('Dictionary API error:', error);
            // Fallback: accept words 2+ letters for now
            const isValid = word.length >= 2;
            this.cache.set(upperWord, isValid);
            return isValid;
        }
    }
}
