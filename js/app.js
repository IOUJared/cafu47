// js/app.js

import { TWITCH_CONFIG } from './config.js';
import { Utils } from './utils.js';
import { TwitchEmbed } from './twitch-embed.js';
import { ResizableSplitter } from './splitter.js';

// Determine if chat should be shown based on URL parameters and mobile settings
const URLParams = new URLSearchParams(window.location.search);
const showChatParam = !URLParams.has('nochat');
const isMobile = Utils.isMobile();
const effectiveShowChat = showChatParam && (!isMobile || !TWITCH_CONFIG.mobile.hideChat || URLParams.has('chat'));

// Main application initialization logic
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main Twitch embed component
    const twitchEmbed = new TwitchEmbed(TWITCH_CONFIG, effectiveShowChat);
    twitchEmbed.init();

    // Only initialize the splitter if the chat panel is visible
    if (effectiveShowChat) {
        new ResizableSplitter(TWITCH_CONFIG, twitchEmbed);
    }

    // Add a specific class for mobile layouts where chat is hidden
    if (isMobile && !effectiveShowChat) {
        document.querySelector('.container')?.classList.add('mobile-hide-chat');
    }

    // Make the main embed instance globally accessible for debugging purposes
    window.twitchEmbed = twitchEmbed;
});