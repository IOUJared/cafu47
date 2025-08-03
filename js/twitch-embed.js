class TwitchEmbed {
    constructor(config, showChat = true) {
        this.config = config;
        this._originalChannel = config.channel.toLowerCase().trim();
        this.showChat = showChat;
        this.embed = null;
        this.player = null;
        this.streamStatus = new StreamStatusManager();
        this.channelSwitcher = null;
        this.statusMonitorCleanup = null;
        
        // Initialize URL manager
        this.urlManager = new URLManager(this._originalChannel);
        
        this._setupEventHandlers();
    }

    _setupEventHandlers() {
        this.streamStatus.onStatusChange(this._handleStatusChange.bind(this));
        this.urlManager.onChannelChange(this._handleURLChannelChange.bind(this));
        
        // Setup responsive handlers with debouncing
        const debouncedResize = Utils.debounce(() => this.maintainAspectRatio(), 100);
        window.addEventListener('resize', debouncedResize);
        
        // Initial channel from URL
        const urlChannel = this.urlManager.getCurrentChannel();
        if (urlChannel !== this._originalChannel) {
            this.config.channel = urlChannel;
        }
    }

    _handleStatusChange(status) {
        if (status === 'offline') {
            this.showChannelSwitcher();
        } else {
            this.hideChannelSwitcher();
        }
    }

    _handleURLChannelChange(channel, fromURLUpdate) {
        if (fromURLUpdate === false) {
            this.config.channel = channel;
            this.recreateEmbed();
        }
    }

    init() {
        this._setupLayout();
        this.maintainAspectRatio();
        this.createVideoEmbed();
        
        if (this.showChat) {
            this.createChatEmbed();
        }
        
        this._setupAspectRatioMaintenance();
    }

    _setupLayout() {
        const container = document.querySelector('.container');
        if (!this.showChat) {
            container.classList.add('video-only');
        }
    }

    _setupAspectRatioMaintenance() {
        const updateVideoSize = Utils.debounce(() => this.maintainAspectRatio(), 50);
        
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

        const isMobile = Utils.isMobile();
        const isLandscape = Utils.isLandscape();
        
        // Mobile: let CSS handle aspect ratios
        if (isMobile) {
            videoWrapper.style.width = '';
            videoWrapper.style.height = '';
            return;
        }

        // Desktop: calculate aspect ratio dynamically
        this._calculateDesktopAspectRatio(videoWrapper);
    }

    _calculateDesktopAspectRatio(videoWrapper) {
        const videoPanel = document.querySelector('.video-panel');
        if (!videoPanel) return;

        const { width: panelWidth, height: panelHeight } = videoPanel.getBoundingClientRect();
        const panelAspectRatio = panelWidth / panelHeight;
        const targetAspectRatio = CONSTANTS.ASPECT_RATIO.TARGET;

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

        this._setupVideoEvents();
    }

    _setupVideoEvents() {
        this.embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            this.player = this.embed.getPlayer();
            this.player.setQuality(this.config.video.quality);
            
            if (this.config.video.autoplay) {
                this.player.play();
            }

            this.maintainAspectRatio();
            this.streamStatus.setOnline();

            // Start monitoring
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

        // Initial status check
        setTimeout(() => this._checkInitialStatus(), CONSTANTS.STREAM_STATUS.INITIAL_CHECK_DELAY);
    }

    _checkInitialStatus() {
        if (!this.player) return;
        
        try {
            const isPaused = this.player.isPaused();
            const hasEnded = this.player.getEnded();
            
            if (isPaused && hasEnded) {
                this.streamStatus.setOffline();
            }
        } catch (error) {
            console.log('Could not check initial stream status:', error);
        }
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
        this.createVideoEmbed();

        if (this.showChat) {
            this.createChatEmbed();
        }

        if (this.channelSwitcher) {
            this.channelSwitcher.updateCurrentChannel(this.config.channel);
        }

        this.hideChannelSwitcher();
    }

    async changeChannel(newChannel) {
        const normalizedChannel = newChannel?.toLowerCase().trim() || '';
        
        if (!normalizedChannel || normalizedChannel === this.config.channel.toLowerCase()) {
            return Promise.resolve();
        }

        this.config.channel = normalizedChannel;
        this.urlManager.setChannel(normalizedChannel, true);
        this.recreateEmbed();

        return Promise.resolve();
    }

    // Getters for cleaner API
    get currentChannel() {
        return this.config.channel;
    }

    get originalChannel() {
        return this._originalChannel;
    }

    get isOnOriginalChannel() {
        return this.config.channel.toLowerCase() === this._originalChannel;
    }

    get currentURL() {
        return this.urlManager.getCurrentURL();
    }

    destroy() {
        if (this.statusMonitorCleanup) {
            this.statusMonitorCleanup();
        }

        if (this.channelSwitcher) {
            this.channelSwitcher.destroy();
        }

        this.embed = null;
        this.player = null;
    }
}