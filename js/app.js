// js/app.js

import { TWITCH_CONFIG } from './config.js';
import { Utils } from './utils.js';
import { TwitchEmbed } from './twitch-embed.js';
import { ResizableSplitter } from './splitter.js';
import { MobileBrowserUIHider } from './mobile-ui-hider.js';
import { ChatToggleButton } from './chat-toggle-button.js';

// Determine the initial state of the chat from the URL.
const URLParams = new URLSearchParams(window.location.search);
const isChatInitiallyVisible = !URLParams.has('nochat');

// Main application initialization logic
document.addEventListener('DOMContentLoaded', () => {
    const isMobile = Utils.isMobile();
    const container = document.querySelector('.container');

    // Set initial visibility state on the main container.
    if (!isChatInitiallyVisible) {
        container.classList.add('chat-hidden');
    }

    // Initialize the main Twitch embed component.
    const twitchEmbed = new TwitchEmbed(TWITCH_CONFIG, isChatInitiallyVisible);
    twitchEmbed.init();

    // Initialize the splitter only if chat is visible initially.
    const splitter = isChatInitiallyVisible ? new ResizableSplitter(TWITCH_CONFIG, twitchEmbed) : null;

    // Initialize the chat toggle button for all devices.
    new ChatToggleButton(twitchEmbed);

    // Initialize mobile-only UI features.
    if (isMobile) {
        new MobileBrowserUIHider();
    }

    // Make the main embed instance globally accessible for debugging purposes.
    window.twitchEmbed = twitchEmbed;
});
