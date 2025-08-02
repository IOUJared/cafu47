const TWITCH_CONFIG = {
    channel: 'fukura____',
    domains: [
        'cafu47.com',
        'www.cafu47.com',
        'localhost', 
        '127.0.0.1'
    ],
    video: {
        autoplay: false,
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
        defaultVideoHeight: 60 // percentage
    },
    mobile: {
        breakpoint: 768,
        hideChat: false, // Set to true to hide chat by default on mobile
        touchDragDistance: 10 // minimum pixels to register drag
    }
};

// Check URL parameters
const URLParams = new URLSearchParams(window.location.search);
const SHOW_CHAT = !URLParams.has('nochat');
const IS_MOBILE = window.innerWidth <= TWITCH_CONFIG.mobile.breakpoint;

// Auto-hide chat on small screens unless explicitly shown
const EFFECTIVE_SHOW_CHAT = SHOW_CHAT && (!IS_MOBILE || !TWITCH_CONFIG.mobile.hideChat || URLParams.has('chat'));