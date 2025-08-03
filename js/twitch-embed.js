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
        
        this.urlManager = new URLManager(this._originalChannel);
        
        this._setupEventHandlers();
    }

    _setupEventHandlers() {
        this.streamStatus.onStatusChange(this._handleStatusChange.bind(this));
        this.urlManager.onChannelChange(this._handleURLChannelChange.bind(this));
        
        const debouncedResize = Utils.debounce(() => this.maintainAspectRatio(), 150);
        window.addEventListener('resize', debouncedResize);
        
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
        this.createVideoEmbed();
        
        if (this.showChat) {
            this.createChatEmbed();
        }
        
        setTimeout(() => this.maintainAspectRatio(), 0);
    }

    _setupLayout() {
        const container = document.querySelector('.container');
        if (!this.showChat) {
            container.classList.add('video-only');
        }
    }

    maintainAspectRatio() {
        const videoWrapper = document.querySelector('.video-wrapper');
        if (!videoWrapper) return;

        const isMobile = Utils.isMobile();
        
        if (isMobile) {
            videoWrapper.style.width = '';
            videoWrapper.style.height = '';
            return;
        }

        this._calculateDesktopAspectRatio(videoWrapper);
    }

    _calculateDesktopAspectRatio(videoWrapper) {
        const videoPanel = document.querySelector('.video-panel');
        if (!videoPanel) return;

        const { width: panelWidth, height: panelHeight } = videoPanel.getBoundingClientRect();
        if (panelWidth === 0 || panelHeight === 0) return;

        const panelAspectRatio = panelWidth / panelHeight;
        const targetAspectRatio = CONSTANTS.ASPECT_RATIO.TARGET;

        videoWrapper.style.width = '100%';
        videoWrapper.style.height = '100%';

        if (panelAspectRatio > targetAspectRatio) {
            const newWidth = panelHeight * targetAspectRatio;
            videoWrapper.style.width = `${newWidth}px`;
            videoWrapper.style.height = `${panelHeight}px`;
        } else {
            const newHeight = panelWidth / targetAspectRatio;
            videoWrapper.style.width = `${panelWidth}px`;
            videoWrapper.style.height = `${newHeight}px`;
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

        setTimeout(() => this._checkInitialStatus(), CONSTANTS.STREAM_STATUS.INITIAL_CHECK_DELAY);
    }

    _checkInitialStatus() {
        if (!this.player) return;
        
        try {
            if (this.player.getEnded()) {
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
                (newChannel) => this.changeChannel(newChannel),
                TWITCH_CONFIG.channelSwitcher
            );
        }
        this.channelSwitcher.updateCurrentChannel(this.config.channel);
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

    get currentChannel() {
        return this.config.channel;
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