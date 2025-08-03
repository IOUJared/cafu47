// js/utils.js

import { CONSTANTS } from './constants.js';

export const Utils = {
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

    validateTwitchChannel: (channel) => {
        const trimmed = Utils.normalizeChannel(channel);
        if (!/^[a-zA-Z0-9_]{4,25}$/.test(trimmed)) {
            return {
                valid: false,
                error: 'Channel name must be 4-25 characters (letters, numbers, underscores only).',
            };
        }
        return { valid: true, channel: trimmed };
    },
};