import { Utils } from './utils.js';

export class URLManager {
    constructor(defaultChannel) {
        this.defaultChannel = defaultChannel.toLowerCase();
        this.currentChannel = this.defaultChannel;
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
        const channelFromHash = this.getChannelFromHash();
        if (channelFromHash && channelFromHash !== this.defaultChannel) {
            this.currentChannel = channelFromHash;
            this.notifyChannelChange(channelFromHash, false);
        }
    }

    getChannelFromHash() {
        const hash = window.location.hash;
        const twitchPrefix = '#twitch/';
        
        if (hash.startsWith(twitchPrefix)) {
            // Get the part of the hash after the prefix
            let channelPart = hash.substring(twitchPrefix.length);

            // **FIX:** Find if a query string is attached to the hash and remove it
            const queryIndex = channelPart.indexOf('?');
            if (queryIndex !== -1) {
                channelPart = channelPart.substring(0, queryIndex);
            }

            const channel = Utils.normalizeChannel(channelPart);
            return channel || null;
        }
        
        return null;
    }

    updateURL(channel) {
        const normalizedChannel = Utils.normalizeChannel(channel);
        
        if (normalizedChannel === this.defaultChannel) {
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
    }

    handleHashChange() {
        const channelFromHash = this.getChannelFromHash();
        
        if (!channelFromHash) {
            if (this.currentChannel !== this.defaultChannel) {
                this.currentChannel = this.defaultChannel;
                this.notifyChannelChange(this.defaultChannel, false);
            }
        } else if (channelFromהash !== this.currentChannel) {
            this.currentChannel = channelFromHash;
            this.notifyChannelChange(channelFromHash, false);
        }
    }

    setChannel(channel, updateURL = true) {
        const normalizedChannel = Utils.normalizeChannel(channel);
        
        if (normalizedChannel === this.currentChannel) {
            return;
        }
        
        this.currentChannel = normalizedChannel;
        
        if (updateURL) {
            this.updateURL(normalizedChannel);
        }
        
        this.notifyChannelChange(normalizedChannel, updateURL);
    }

    notifyChannelChange(channel, fromURLUpdate) {
        this.onChannelChangeCallbacks.forEach(callback => {
            callback(channel, fromURLUpdate);
        });
    }

    getCurrentChannel() {
        return this.currentChannel;
    }
}
