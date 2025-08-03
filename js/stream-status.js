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
            console.log('Stream status: ONLINE');
            this.isOnline = true;
            this.notifyStatusChange('online');
        }
    }

    setOffline() {
        if (this.isOnline) {
            console.log('Stream status: OFFLINE');
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

        let consecutiveOfflineChecks = 0;
        const maxConsecutiveChecks = 3; // Require 3 consecutive offline checks before hiding UI

        // Check if stream appears to be offline
        const checkOfflineStatus = () => {
            try {
                const isPaused = player.isPaused();
                const hasEnded = player.getEnded();
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                
                // Multiple indicators that stream is offline
                const seemsOffline = isPaused && hasEnded;
                const noProgress = currentTime === 0 && duration === 0;
                const stalled = isPaused && currentTime > 0 && hasEnded;
                
                if (seemsOffline || noProgress || stalled) {
                    consecutiveOfflineChecks++;
                    console.log(`Offline check ${consecutiveOfflineChecks}/${maxConsecutiveChecks}`);
                    
                    // Only set offline after multiple consecutive checks
                    if (consecutiveOfflineChecks >= maxConsecutiveChecks) {
                        this.setOffline();
                    }
                } else {
                    // Reset counter if stream seems online
                    consecutiveOfflineChecks = 0;
                    this.setOnline();
                }
            } catch (error) {
                // If we can't get player state, don't change status
                console.log('Could not check player status:', error);
                consecutiveOfflineChecks = 0;
            }
        };

        // Check status less frequently to avoid false positives
        const statusInterval = setInterval(checkOfflineStatus, 15000); // Check every 15 seconds

        // Return cleanup function
        return () => clearInterval(statusInterval);
    }
}