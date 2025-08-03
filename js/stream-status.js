class StreamStatusManager {
    constructor() {
        this.isOnline = true;
        this.onStatusChangeCallbacks = [];
    }

    onStatusChange(callback) {
        this.onStatusChangeCallbacks.push(callback);
    }

    setOnline() {
        if (!this.isOnline) {
            this.isOnline = true;
            this.notifyStatusChange('online');
        }
    }

    setOffline() {
        if (this.isOnline) {
            this.isOnline = false;
            this.notifyStatusChange('offline');
        }
    }

    notifyStatusChange(status) {
        this.onStatusChangeCallbacks.forEach(callback => callback(status));
    }

    async checkStreamStatus(channel) {
        try {
            // Simple check using fetch to see if channel exists
            // This is a basic implementation - you could enhance with actual Twitch API
            const response = await fetch(`https://www.twitch.tv/${channel}`, { 
                method: 'HEAD',
                mode: 'no-cors' 
            });
            return true; // Assume online if we can reach the page
        } catch (error) {
            console.log('Could not check stream status, assuming online');
            return true;
        }
    }

    // Monitor stream status through player events
    monitorPlayer(player) {
        if (!player) return;

        // Check if stream appears to be offline
        const checkOfflineStatus = () => {
            try {
                const isPaused = player.isPaused();
                const hasEnded = player.getEnded();
                const quality = player.getQuality();
                
                // If video is paused, ended, and no quality options, likely offline
                if (isPaused && hasEnded && (!quality || quality === 'auto')) {
                    this.setOffline();
                } else {
                    this.setOnline();
                }
            } catch (error) {
                // If we can't get player state, assume online
                console.log('Could not check player status');
            }
        };

        // Check status periodically
        const statusInterval = setInterval(checkOfflineStatus, 10000); // Check every 10 seconds

        // Return cleanup function
        return () => clearInterval(statusInterval);
    }
}