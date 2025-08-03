class TwitchEmbed {
    constructor(config, showChat = true) {
        this.config = config;
        this.originalChannel = config.channel.toLowerCase(); // Store original channel
        this.showChat = showChat;
        this.embed = null;
        this.player = null;
        this.streamStatus = new StreamStatusManager();
        this.channelSwitcher = null;
        this.statusMonitorCleanup = null;
        
        // Initialize URL manager
        this.urlManager = new URLManager(this.originalChannel);
        
        this.setupStatusHandling();
        this.setupURLHandling();
    }

    setupStatusHandling() {
        this.streamStatus.onStatusChange((status) => {
            if (status === 'offline') {
                this.showChannelSwitcher();
            } else {
                this.hideChannelSwitcher();
            }
        });
    }

    setupURLHandling() {
        // Listen for URL-driven channel changes (back/forward navigation)
        this.urlManager.onChannelChange((channel, fromURLUpdate) => {
            if (fromURLUpdate === false) {
                // This change came from URL navigation, update the embed
                this.config.channel = channel;
                this.recreateEmbed();
            }
        });

        // Check if we should start with a different channel from URL
        const urlChannel = this.urlManager.getCurrentChannel();
        if (urlChannel !== this.originalChannel) {
            this.config.channel = urlChannel;
        }
    }

    init() {
        this.setupLayout();
        this.maintainAspectRatio();
        this.createVideoEmbed();
        if (this.showChat) {
            this.createChatEmbed();
        }
        this.setupAspectRatioMaintenance();
    }

    setupLayout() {
        const container = document.querySelector('.container');
        if (!this.showChat) {
            container.classList.add('video-only');
        }
    }

    setupAspectRatioMaintenance() {
        const updateVideoSize = () => {
            this.maintainAspectRatio();
        };

        window.addEventListener('resize', updateVideoSize);

        const observer = new MutationObserver(updateVideoSize);
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            observer.observe(chatPanel, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    }

    maintainAspectRatio() {
        const videoWrapper = document.querySelector('.video-wrapper');
        if (!videoWrapper) return;

        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            videoWrapper.style.width = '';
            videoWrapper.style.height = '';
            return;
        }

        const videoPanel = document.querySelector('.video-panel');
        if (!videoPanel) return;

        const panelRect = videoPanel.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        const panelAspectRatio = panelWidth / panelHeight;
        const targetAspectRatio = 16 / 9;

        if (panelAspectRatio > targetAspectRatio) {
            const videoWidth = panelHeight * targetAspectRatio;
            videoWrapper.style.width = `${videoWidth}px`;
            videoWrapper.style.height = `${panelHeight}px`;
        } else {
            const videoHeight = panelWidth / targetAspectRatio;
            videoWrapper.style.width = `${panelWidth}px`;
            videoWrapper.style.height = `${videoHeight}px`;
        }
    }

    createVideoEmbed() {
        // Clear existing embed
        const videoContainer = document.getElementById('twitch-video');
        if (videoContainer) {
            videoContainer.innerHTML = '';
        }

        this.embed = new Twitch.Embed("twitch-video", {
            width: "100%",
            height: "100%",
            channel: this.config.channel,
            layout: "video",
            autoplay: this.config.video.autoplay,
            parent: [window.location.hostname]
        });

        this.embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            this.player = this.embed.getPlayer();
            this.player.setQuality(this.config.video.quality);
            
            if (this.config.video.autoplay) {
                this.player.play();
            }

            this.maintainAspectRatio();
            this.streamStatus.setOnline();

            // Start monitoring stream status
            if (this.statusMonitorCleanup) {
                this.statusMonitorCleanup();
            }
            this.statusMonitorCleanup = this.streamStatus.monitorPlayer(this.player);
        });

        this.embed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
            this.streamStatus.setOnline();
        });

        this.embed.addEventListener(Twitch.Player.OFFLINE, () => {
            this.streamStatus.setOffline();
        });

        // Initial offline check after embed loads
        setTimeout(() => {
            if (this.player) {
                try {
                    const isPaused = this.player.isPaused();
                    const hasEnded = this.player.getEnded();
                    
                    if (isPaused && hasEnded) {
                        this.streamStatus.setOffline();
                    }
                } catch (error) {
                    console.log('Could not check initial stream status');
                }
            }
        }, 5000);
    }

    createChatEmbed() {
        const chatFrame = document.getElementById('twitch-chat');
        if (!chatFrame) return;

        const currentDomain = window.location.hostname;
        const darkMode = this.config.chat.darkMode ? '&darkpopout' : '';
        
        chatFrame.src = `https://www.twitch.tv/embed/${this.config.channel}/chat?parent=${currentDomain}${darkMode}&migration=1`;
    }

    showChannelSwitcher() {
        if (!this.channelSwitcher) {
            this.channelSwitcher = new ChannelSwitcher(
                this.config.channel,
                (newChannel) => this.changeChannel(newChannel)
            );
        }
        this.channelSwitcher.show();
    }

    hideChannelSwitcher() {
        if (this.channelSwitcher) {
            this.channelSwitcher.hide();
        }
    }

    recreateEmbed() {
        // Recreate video embed
        this.createVideoEmbed();

        // Update chat
        if (this.showChat) {
            this.createChatEmbed();
        }

        // Update channel switcher if it exists
        if (this.channelSwitcher) {
            this.channelSwitcher.updateCurrentChannel(this.config.channel);
        }

        // Hide the switcher
        this.hideChannelSwitcher();
    }

    async changeChannel(newChannel) {
        if (!newChannel || newChannel.toLowerCase() === this.config.channel.toLowerCase()) {
            return;
        }

        const normalizedChannel = newChannel.toLowerCase();

        // Update config
        this.config.channel = normalizedChannel;

        // Update URL (this will automatically update the hash)
        this.urlManager.setChannel(normalizedChannel, true);

        // Recreate the embed
        this.recreateEmbed();

        return Promise.resolve();
    }

    getCurrentChannel() {
        return this.config.channel;
    }

    getOriginalChannel() {
        return this.originalChannel;
    }

    isOnOriginalChannel() {
        return this.config.channel.toLowerCase() === this.originalChannel;
    }

    getCurrentURL() {
        return this.urlManager.getCurrentURL();
    }

    destroy() {
        // Clean up status monitoring
        if (this.statusMonitorCleanup) {
            this.statusMonitorCleanup();
        }

        // Clean up channel switcher
        if (this.channelSwitcher) {
            this.channelSwitcher.destroy();
        }

        // Clean up embed
        if (this.embed) {
            this.embed = null;
        }

        this.player = null;
    }
}