// js/app.js - Updated to use the new EmbedManager

import { TWITCH_CONFIG } from './config.js';
import { Utils } from './utils.js';
import { EmbedManager } from './embed-manager.js';
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

    // Initialize the main embed manager component.
    const embedManager = new EmbedManager(TWITCH_CONFIG, isChatInitiallyVisible);
    embedManager.init();

    // Initialize the splitter only if chat is visible initially.
    const splitter = isChatInitiallyVisible ? new ResizableSplitter(TWITCH_CONFIG, embedManager) : null;

    // Initialize the chat toggle button for all devices.
    new ChatToggleButton(embedManager);

    // Initialize mobile-only UI features.
    if (isMobile) {
        new MobileBrowserUIHider();
    }

    // Make the main embed instance globally accessible for debugging purposes.
    window.embedManager = embedManager;
});