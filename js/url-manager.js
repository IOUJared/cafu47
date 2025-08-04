// js/url-manager.js - Updated to support both Twitch and YouTube

import { Utils } from './utils.js';

export class URLManager {
    constructor(defaultChannel) {
        this.defaultChannel = defaultChannel.toLowerCase();
        this.currentChannel = this.defaultChannel;
        this.currentPlatform = 'twitch'; // Default platform
        this.onChannelChangeCallbacks = [];
        
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
        
        this.initFromURL();
    }

    onChannelChange(callback) {
        this.onChannelChangeCallbacks.push(callback);
    }

    initFromURL() {
        const contentFromHash = this.getContentFromHash();
        if (contentFromHash && (contentFromHash.id !== this.defaultChannel || contentFromHash.platform !== 'twitch')) {
            this.currentChannel = contentFromHash.id;
            this.currentPlatform = contentFromHash.platform;
            this.notifyChannelChange(contentFromHash.id, contentFromHash.platform, false);
        }
    }

    getContentFromHash() {
        const hash = window.location.hash;
        const twitchPrefix = '#twitch/';
        const youtubePrefix = '#youtube/';
        
        if (hash.startsWith(twitchPrefix)) {
            let channelPart = hash.substring(twitchPrefix.length);
            const queryIndex = channelPart.indexOf('?');
            if (queryIndex !== -1) {
                channelPart = channelPart.substring(0, queryIndex);
            }
            const channel = Utils.normalizeChannel(channelPart);
            return channel ? { platform: 'twitch', id: channel } : null;
        } else if (hash.startsWith(youtubePrefix)) {
            let videoPart = hash.substring(youtubePrefix.length);
            const queryIndex = videoPart.indexOf('?');
            if (queryIndex !== -1) {
                videoPart = videoPart.substring(0, queryIndex);
            }
            const videoId = videoPart.trim();
            return videoId ? { platform: 'youtube', id: videoId } : null;
        }
        
        return null;
    }

    updateURL(id, platform = 'twitch') {
        if (platform === 'twitch') {
            const normalizedChannel = Utils.normalizeChannel(id);
            
            if (normalizedChannel === this.defaultChannel && platform === 'twitch') {
                if (window.location.hash) {
                    history.pushState(null, null, window.location.pathname + window.location.search);
                }
            } else {
                const newHash = `#twitch/${normalizedChannel}`;
                if (window.location.hash !== newHash) {
                    history.pushState(null, null, newHash);
                }
            }
            
            this.currentChannel = normalizedChannel;
        } else if (platform === 'youtube') {
            const newHash = `#youtube/${id}`;
            if (window.location.hash !== newHash) {
                history.pushState(null, null, newHash);
            }
            this.currentChannel = id;
        }
        
        this.currentPlatform = platform;
    }

    handleHashChange() {
        const contentFromHash = this.getContentFromHash();
        
        if (!contentFromHash) {
            if (this.currentChannel !== this.defaultChannel || this.currentPlatform !== 'twitch') {
                this.currentChannel = this.defaultChannel;
                this.currentPlatform = 'twitch';
                this.notifyChannelChange(this.defaultChannel, 'twitch', false);
            }
        } else if (contentFromHash.id !== this.currentChannel || contentFromHash.platform !== this.currentPlatform) {
            this.currentChannel = contentFromHash.id;
            this.currentPlatform = contentFromHash.platform;
            this.notifyChannelChange(contentFromHash.id, contentFromHash.platform, false);
        }
    }

    setChannel(id, platform = 'twitch', updateURL = true) {
        const normalizedId = platform === 'twitch' ? Utils.normalizeChannel(id) : id;
        
        if (normalizedId === this.currentChannel && platform === this.currentPlatform) {
            return;
        }
        
        this.currentChannel = normalizedId;
        this.currentPlatform = platform;
        
        if (updateURL) {
            this.updateURL(normalizedId, platform);
        }
        
        this.notifyChannelChange(normalizedId, platform, updateURL);
    }

    notifyChannelChange(id, platform, fromURLUpdate) {
        this.onChannelChangeCallbacks.forEach(callback => {
            callback(id, platform, fromURLUpdate);
        });
    }

    getCurrentChannel() {
        return this.currentChannel;
    }

    getCurrentPlatform() {
        return this.currentPlatform;
    }
}