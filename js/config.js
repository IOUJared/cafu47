// js/config.js

export const TWITCH_CONFIG = {
    channel: 'fukura____',
    autohost: {
        enabled: true,
        host_channel: 'fuslie'
    },
    video: {
        autoplay: true,
        quality: 'chunked',
    },
    chat: {
        darkMode: true,
    },
    splitter: {
        minVideoWidth: 300,
        minChatWidth: 250,
        defaultChatWidth: 350,
        minVideoHeight: 200,
        minChatHeight: 150,
        mobileLandscape: {
            minChatWidth: 150,
            minVideoWidth: 250,
            defaultChatWidth: 280,
        },
    },
    mobile: {
        hideChat: false,
    },
};
