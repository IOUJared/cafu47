// js/twitch-embed.js

import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';
import { URLManager } from './url-manager.js';
import { StreamStatusManager } from './stream-status.js';
import { ChannelSwitcher } from './channel-switcher.js';
import { TWITCH_CONFIG } from './config.js';

export class TwitchEmbed {
    constructor(config, showChat = true) {
        this.config = config;
        this.mainChannel = config.channel.toLowerCase().trim();
        this.showChat = showChat;
        this.embed = null;
        this.player = null;
        this.streamStatus = new StreamStatusManager();
        this.channelSwitcher = null;
        this.statusMonitorCleanup = null;
        this.isHosting = false;
        
        this.urlManager = new URLManager(this.mainChannel);
        
        this._initDOMElements();
        this._setupEventHandlers();
    }
    
    _initDOMElements() {
        this.hostingBanner = document.getElementById('hosting-banner');
        this.hostedChannelSpan = document.getElementById('hosted-channel');
        this.changeChannelBtn = document.getElementById('change-channel-btn');
    }

    _setupEventHandlers() {
        this.streamStatus.onStatusChange(this._handleStatusChange.bind(this));
        this.urlManager.onChannelChange(this._handleURLChannelChange.bind(this));
        
        const debouncedResize = Utils.debounce(() => this.maintainAspectRatio(), 150);
        window.addEventListener('resize', debouncedResize);
        
        if (this.changeChannelBtn) {
            this.changeChannelBtn.addEventListener('click', () => this.showChannelSwitcher());
        }
        
        const urlChannel = this.urlManager.getCurrentChannel();
        if (urlChannel !== this.mainChannel) {
            this.config.channel = urlChannel;
        }
    }

    async _handleStatusChange(status) {
        if (status === 'offline') {
            await this._handleOfflineState();
        } else {
            this.hideChannelSwitcher();
            this._updateHostingBanner(false);
        }
    }

    async _handleOfflineState() {
        if (!TWITCH_CONFIG.autohost.enabled) {
            this.showChannelSwitcher();
            return;
        }
        
        try {
            const hostChannel = TWITCH_CONFIG.autohost.host_channel;
            const response = await fetch(`/functions/get-live-streams?channel=${this.mainChannel}&host_channel=${hostChannel}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned an error: ${response.status}. Body: ${errorText}`);
            }
            
            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Failed to parse JSON response. Response was: ${responseText}`);
            }

            if (data && !data.mainChannelLive && data.hostChannelLive) {
                this.changeChannel(hostChannel, true);
            } else {
                this.showChannelSwitcher();
            }
        } catch (error) {
            console.error("Could not check for autohost:", error);
            this.showChannelSwitcher();
        }
    }

    _updateHostingBanner(isHosting, channel = '') {
        if (this.hostingBanner) {
            if (isHosting) {
                this.hostedChannelSpan.textContent = channel;
                this.hostingBanner.classList.remove('hidden');
            } else {
                this.hostingBanner.classList.add('hidden');
            }
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
        
        setTimeout(() => this.maintainAspectRatio(), 100); 
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
        } else {
            const newHeight = panelWidth / targetAspectRatio;
            videoWrapper.style.height = `${newHeight}px`;
        }
    }

    createVideoEmbed() {
        const videoContainer = document.getElementById('twitch-video');
        if (videoContainer) {
            videoContainer.innerHTML = '';
        }

        const allowedDomains = ["cafu47.com", "www.cafu47.com", "cafu47.pages.dev", "localhost"];

        this.embed = new Twitch.Embed("twitch-video", {
            width: "100%",
            height: "100%",
            channel: this.config.channel,
            layout: "video",
            autoplay: this.config.video.autoplay,
            parent: allowedDomains
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

            setTimeout(() => this._checkInitialStatus(), CONSTANTS.STREAM_STATUS.INITIAL_CHECK_DELAY);
        });

        this.embed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
            this.streamStatus.setOnline();
        });

        this.embed.addEventListener(Twitch.Player.OFFLINE, () => {
            this.streamStatus.setOffline();
        });
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
        const extensionParams = '&enable-frankerfacez=true&enable-bttv=true&enable-7tv=true';

        chatFrame.src = `https://www.twitch.tv/embed/${this.config.channel}/chat?parent=${currentDomain}${darkMode}${extensionParams}`;
    }

    async showChannelSwitcher() {
        if (!this.channelSwitcher) {
            this.channelSwitcher = new ChannelSwitcher(
                (newChannel) => this.changeChannel(newChannel, false),
                this.config.channel
            );
        }
        this.channelSwitcher.updateCurrentChannel(this.config.channel);
        await this.channelSwitcher.show();
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

    async changeChannel(newChannel, isAutohost = false) {
        const normalizedChannel = newChannel?.toLowerCase().trim() || '';
        
        if (!normalizedChannel || normalizedChannel === this.config.channel.toLowerCase()) {
            return Promise.resolve();
        }

        this.config.channel = normalizedChannel;
        
        if (normalizedChannel !== this.mainChannel) {
             this.urlManager.setChannel(normalizedChannel, true);
        } else {
            this.urlManager.setChannel(this.mainChannel, true);
        }
       
        this.recreateEmbed();
        this._updateHostingBanner(isAutohost, newChannel);

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
