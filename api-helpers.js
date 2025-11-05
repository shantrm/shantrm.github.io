// API Helper Functions for Snake Game Highscores
// This file contains functions to interact with Supabase

// Load config (with fallback if not loaded)
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

// Initialize config when SUPABASE_CONFIG is available
function initSupabaseConfig() {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG) {
        SUPABASE_URL = SUPABASE_CONFIG.url || '';
        SUPABASE_KEY = SUPABASE_CONFIG.anonKey || '';
    } else {
        console.error('SUPABASE_CONFIG is not defined. Make sure config.js is loaded before api-helpers.js');
    }
}

// Try to initialize immediately if config is already loaded
// Also handle the case where config.js might not exist (e.g., on GitHub Pages if not deployed)
(function () {
    if (typeof SUPABASE_CONFIG !== 'undefined') {
        initSupabaseConfig();
    } else {
        // Wait a bit for config.js to load (if it exists)
        setTimeout(() => {
            if (typeof SUPABASE_CONFIG !== 'undefined') {
                initSupabaseConfig();
            } else {
                console.warn('config.js not found. Supabase features will be disabled. Make sure config.js exists with your Supabase credentials.');
            }
        }, 100);
    }
})();

// Profanity wordlist - loaded from profanity.txt
let PROFANITY_WORDS = [];
let profanityLoaded = false;

/**
 * Load profanity wordlist from file (call this once on page load)
 * @returns {Promise<void>}
 */
async function loadProfanityWords() {
    if (profanityLoaded) return; // Already loaded

    try {
        const response = await fetch('profanity.txt');
        if (!response.ok) {
            throw new Error('Failed to load profanity wordlist');
        }
        const text = await response.text();
        // Split by newlines and filter out empty lines
        PROFANITY_WORDS = text.split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line.length > 0);
        profanityLoaded = true;
    } catch (error) {
        console.error('Error loading profanity wordlist:', error);
        // Fallback to empty array if file can't be loaded
        PROFANITY_WORDS = [];
    }
}

/**
 * Check if a username contains profanity (synchronous check against loaded wordlist)
 * @param {string} username - Username to check
 * @returns {boolean} - True if contains profanity, false otherwise
 */
function containsProfanity(username) {
    if (PROFANITY_WORDS.length === 0) {
        // Wordlist not loaded yet, skip check
        console.log(`[Profanity Check] "${username}" - Wordlist not loaded, returning false`);
        return false;
    }

    const lowerUsername = username.toLowerCase().trim();
    console.log(`[Profanity Check] Checking username: "${username}" (normalized: "${lowerUsername}")`);

    // Check if entire username is a profanity word
    for (const word of PROFANITY_WORDS) {
        const cleanWord = word.toLowerCase().trim();
        if (lowerUsername === cleanWord) {
            console.log(`[Profanity Check] MATCH FOUND: Entire username matches profanity word: "${cleanWord}"`);
            return true;
        }
    }

    // Check for profanity words as separate words (with word boundaries)
    // This prevents "ass" from matching "class" or "pass"
    for (const word of PROFANITY_WORDS) {
        const cleanWord = word.toLowerCase().trim();

        // Skip very short words (less than 3 chars) to reduce false positives
        if (cleanWord.length < 3) {
            continue;
        }

        // Escape special regex characters
        const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Check for whole word match with word boundaries
        // This ensures the profanity word appears as a complete word, not embedded
        const wordRegex = new RegExp('\\b' + escapedWord + '\\b', 'i');

        if (wordRegex.test(lowerUsername)) {
            console.log(`[Profanity Check] MATCH FOUND: Username contains profanity word: "${cleanWord}" (matched in: "${lowerUsername}")`);
            return true;
        }
    }

    console.log(`[Profanity Check] No profanity found in: "${username}"`);
    return false;
}

/**
 * Get top scores from the database
 * @param {number} limit - Number of scores to return (default: 50)
 * @returns {Promise<Array>} Array of score objects with username, score, rank, etc.
 */
async function getTopScores(limit = 50) {
    // Ensure config is initialized
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        initSupabaseConfig();
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase configuration not available. Please check config.js');
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_top_scores`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit_count: limit })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch scores: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching scores:', error);
        throw error;
    }
}

/**
 * Submit a score to the database
 * @param {string} username - Username (will be validated server-side)
 * @param {number} score - Score value (will be validated server-side)
 * @returns {Promise<Object>} Response object with success status and updated scores
 */
async function submitScore(username, score) {
    // Ensure config is initialized
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        initSupabaseConfig();
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase configuration not available. Please check config.js');
    }

    try {
        // Basic client-side validation (server will also validate)
        if (!username || username.trim().length === 0) {
            throw new Error('Username is required');
        }

        if (username.trim().length > 20) {
            throw new Error('Username must be 20 characters or less');
        }

        // Check for profanity (synchronous check)
        if (containsProfanity(username)) {
            throw new Error('Username contains inappropriate content. Please choose a different username.');
        }

        if (typeof score !== 'number' || score < 0) {
            throw new Error('Score must be a non-negative number');
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/highscores`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                username: username.trim(),
                score: Math.floor(score) // Ensure integer
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to submit score: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch (e) {
                errorMessage = errorText;
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Get updated top scores after submission
        const topScores = await getTopScores(50);

        return {
            success: true,
            inserted: data,
            topScores: topScores
        };
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

// Export functions (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getTopScores, submitScore };
}

