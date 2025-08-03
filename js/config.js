// Enhanced configuration with better organization and constants
const CONSTANTS = {
    MOBILE_BREAKPOINT: 768,
    ASPECT_RATIO: {
        TARGET: 16 / 9,
        PADDING: 56.25 // 16:9 as percentage
    },
    STREAM_STATUS: {
        CHECK_INTERVAL: 15000,
        MAX_CONSECUTIVE_CHECKS: 3,
        INITIAL_CHECK_DELAY: 5000
    },
    UI_DELAYS: {
        FOCUS_INPUT: 100,
        ORIENTATION_CHANGE: 100,
        SCROLL_TRICK: 500,
        SCROLL_RESET: 100
    },
    SPLITTER: {
        WIDTH: 8,
        HEIGHT: 8,
        TOUCH_DRAG_DISTANCE: 10
    }
};

const TWITCH_CONFIG = {
    channel: 'fukura____',
    video: {
        autoplay: true,
        quality: 'chunked'
    },
    chat: {
        darkMode: true
    },
    splitter: {
        minVideoWidth: 300,
        minChatWidth: 250,
        defaultChatWidth: 350,
        // Mobile settings
        minVideoHeight: 200,
        minChatHeight: 150,
        defaultVideoHeight: 60, // percentage
        // Mobile landscape minimums
        mobileLandscape: {
            minChatWidth: 150,
            minVideoWidth: 250,
            defaultChatWidth: 280
        }
    },
    mobile: {
        breakpoint: CONSTANTS.MOBILE_BREAKPOINT,
        hideChat: false,
        touchDragDistance: CONSTANTS.SPLITTER.TOUCH_DRAG_DISTANCE
    }
};

// Utility functions
const Utils = {
    isMobile: () => window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT,
    isLandscape: () => window.innerWidth > window.innerHeight,
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    normalizeChannel: (channel) => channel?.toLowerCase().trim() || '',
    
    createSVG: (path, size = 24) => {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">${path}</svg>`;
    }
};

// Check URL parameters
const URLParams = new URLSearchParams(window.location.search);
const SHOW_CHAT = !URLParams.has('nochat');
const IS_MOBILE = Utils.isMobile();

// Auto-hide chat on small screens unless explicitly shown
const EFFECTIVE_SHOW_CHAT = SHOW_CHAT && (!IS_MOBILE || !TWITCH_CONFIG.mobile.hideChat || URLParams.has('chat'));