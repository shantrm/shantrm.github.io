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
        return false;
    }

    const lowerUsername = username.toLowerCase().trim();

    // Check if entire username is a profanity word
    for (const word of PROFANITY_WORDS) {
        const cleanWord = word.toLowerCase().trim();
        if (lowerUsername === cleanWord) {
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
            return true;
        }
    }

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
        // Query the table directly to include speed and skin columns
        const response = await fetch(`${SUPABASE_URL}/rest/v1/highscores?select=username,score,speed,skin&order=score.desc&limit=${limit}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
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
 * Convert hex color code to color name
 * @param {string} hexColor - Hex color code (e.g., '#FF0000')
 * @returns {string} Color name (e.g., 'RED') or original value if not recognized
 */
function hexToColorName(hexColor) {
    // Handle special values
    const colorStr = String(hexColor).trim();
    if (colorStr.toUpperCase() === 'RAINBOW') {
        return 'RAINBOW';
    }
    if (colorStr.toUpperCase() === 'HACKER') {
        return 'HACKER';
    }
    if (colorStr.toUpperCase() === 'SPEED') {
        return 'SPEED';
    }
    if (colorStr.toUpperCase() === 'NINJA') {
        return 'NINJA';
    }

    const colorMap = {
        '#FF0000': 'RED',
        '#FFA500': 'ORANGE',
        '#E1FF00': 'YELLOW',
        '#00FF00': 'GREEN',
        '#0000FF': 'BLUE',
        '#FF00FF': 'PURPLE',
        '#800080': 'DARK_PURPLE',
        '#000000': 'BLACK',
        '#C8C8C8': 'GRAY',
        '#FFFFFF': 'WHITE',
        '#008000': 'DARKGREEN'
    };

    // If it's already a color name, return as is
    const colorNames = Object.values(colorMap);
    if (colorNames.includes(colorStr.toUpperCase())) {
        return colorStr.toUpperCase();
    }

    // Convert hex to uppercase for comparison and map to color name
    const upperHex = colorStr.toUpperCase();
    return colorMap[upperHex] || colorStr; // Return mapped name or original if not found
}

/**
 * Submit a score to the database
 * @param {string} username - Username (will be validated server-side)
 * @param {number} score - Score value (will be validated server-side)
 * @param {number} speed - Speed value (optional, will be saved if provided)
 * @param {string} skin - Skin/color value (optional, will be saved if provided)
 * @returns {Promise<Object>} Response object with success status and updated scores
 */
async function submitScore(username, score, speed = null, skin = null) {
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

        // Prepare the request body
        const requestBody = {
            username: username.trim(),
            score: Math.floor(score) // Ensure integer
        };

        // Add speed if provided
        if (speed !== null && speed !== undefined) {
            requestBody.speed = Math.floor(speed);
        }

        // Add skin if provided (convert hex code to color name)
        if (skin !== null && skin !== undefined) {
            const skinValue = skin.toString();
            requestBody.skin = hexToColorName(skinValue);
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/highscores`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(requestBody)
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

