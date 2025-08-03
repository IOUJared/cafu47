export class URLManager {
    constructor(defaultChannel) {
        this.defaultChannel = defaultChannel.toLowerCase();
        this.currentChannel = this.defaultChannel;
        this.onChannelChangeCallbacks = [];
        
        // Listen for hash changes (back/forward navigation)
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
        
        // Initialize from current URL
        this.initFromURL();
    }

    onChannelChange(callback) {
        this.onChannelChangeCallbacks.push(callback);
    }

    initFromURL() {
        const channelFromHash = this.getChannelFromHash();
        if (channelFromHash && channelFromHash !== this.defaultChannel) {
            this.currentChannel = channelFromHash;
            // Notify listeners about the initial channel from URL
            this.notifyChannelChange(channelFromHash, false); // false = don't update URL
        }
    }

    getChannelFromHash() {
        const hash = window.location.hash;
        const twitchPrefix = '#twitch/';
        
        if (hash.startsWith(twitchPrefix)) {
            const channel = hash.substring(twitchPrefix.length).toLowerCase().trim();
            return channel || null;
        }
        
        return null;
    }

    updateURL(channel) {
        const normalizedChannel = channel.toLowerCase();
        
        if (normalizedChannel === this.defaultChannel) {
            // Remove hash for default channel
            if (window.location.hash) {
                history.pushState(null, null, window.location.pathname + window.location.search);
            }
        } else {
            // Set hash for non-default channels
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
            // Hash was removed, switch to default channel
            if (this.currentChannel !== this.defaultChannel) {
                this.currentChannel = this.defaultChannel;
                this.notifyChannelChange(this.defaultChannel, false);
            }
        } else if (channelFromHash !== this.currentChannel) {
            // Hash changed to different channel
            this.currentChannel = channelFromHash;
            this.notifyChannelChange(channelFromHash, false);
        }
    }

    setChannel(channel, updateURL = true) {
        const normalizedChannel = channel.toLowerCase();
        
        if (normalizedChannel === this.currentChannel) {
            return; // No change needed
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

    getDefaultChannel() {
        return this.defaultChannel;
    }

    isDefaultChannel(channel = null) {
        const checkChannel = channel || this.currentChannel;
        return checkChannel.toLowerCase() === this.defaultChannel;
    }

    // Get a clean URL without the hash (useful for sharing)
    getCleanURL() {
        return window.location.origin + window.location.pathname + window.location.search;
    }

    // Get the full URL with current channel hash
    getCurrentURL() {
        if (this.isDefaultChannel()) {
            return this.getCleanURL();
        }
        return this.getCleanURL() + `#twitch/${this.currentChannel}`;
    }
}