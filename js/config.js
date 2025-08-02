const TWITCH_CONFIG = {
    channel: 'fukura____',
    domains: ['cafu47.com', 'localhost', '127.0.0.1'],
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
        defaultChatWidth: 350
    }
};

// Check URL parameters
const URLParams = new URLSearchParams(window.location.search);
const SHOW_CHAT = !URLParams.has('nochat');