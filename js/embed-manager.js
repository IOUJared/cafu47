// js/embed-manager.js

import { CONSTANTS } from './constants.js';
import { Utils } from './utils.js';
import { URLManager } from './url-manager.js';
import { StreamStatusManager } from './stream-status.js';
import { ChannelSwitcher } from './channel-switcher.js';
import { TwitchEmbedHandler } from './twitch-embed-handler.js';
import { YouTubeEmbedHandler } from './youtube-embed-handler.js';
import { TWITCH_CONFIG } from './config.js';

export class EmbedManager {
    constructor(config, showChat = true) {
        this.config = config;
        this.mainChannel = config.channel.toLowerCase().trim();
        this.showChat = showChat;
        this.currentPlatform = 'twitch';
        this.currentId = this.mainChannel;
        
        // Platform handlers
        this.twitchHandler = null;
        this.youtubeHandler = null;
        this.activeHandler = null;
        
        this.streamStatus = new StreamStatusManager();
        this.channelSwitcher = null;
        this.isHostingFamily = false;
        
        this.urlManager = new URLManager(this.mainChannel);
        
        this._initDOMElements();
        this._setupEventHandlers();
        this._initHandlers();
    }
    
    _initDOMElements() {
        this.hostingBanner = document.getElementById('hosting-banner');
        this.hostedChannelSpan = document.getElementById('hosted-channel');
        this.changeChannelBtn = document.getElementById('change-channel-btn');
        this.videoContainer = document.getElementById('twitch-video');
        this.chatPanel = document.querySelector('.chat-panel');
    }

    _initHandlers() {
        this.twitchHandler = new TwitchEmbedHandler(this.config, this.videoContainer, this.streamStatus);
        this.youtubeHandler = new YouTubeEmbedHandler(this.config, this.videoContainer);
    }

    _setupEventHandlers() {
        this.streamStatus.onStatusChange(this._handleStatusChange.bind(this));
        this.urlManager.onChannelChange(this._handleURLChannelChange.bind(this));
        
        const debouncedResize = Utils.debounce(() => this.maintainAspectRatio(), 150);
        window.addEventListener('resize', debouncedResize);
        
        if (this.changeChannelBtn) {
            this.changeChannelBtn.addEventListener('click', () => {
                this._updateHostingBanner(false);
                this.showChannelSwitcher();
            });
        }
        
        const urlContent = this.urlManager.getContentFromHash();
        if (urlContent && (urlContent.id !== this.mainChannel || urlContent.platform !== 'twitch')) {
            this.currentId = urlContent.id;
            this.currentPlatform = urlContent.platform;
            if (urlContent.platform === 'twitch') {
                this.config.channel = urlContent.id;
            }
        }
    }

    async _handleStatusChange(status) {
        // Only handle Twitch stream status changes
        if (this.currentPlatform !== 'twitch') return;

        if (status === 'offline') {
            await this._handleOfflineState();
        } else {
            const currentChannel = this.config.channel.toLowerCase();
            
            if (this.isHostingFamily && currentChannel !== this.mainChannel.toLowerCase()) {
                await this._checkMainChannelAndSwitch();
            } else {
                this.hideChannelSwitcher();
                if (!this.isHostingFamily) {
                    this._updateHostingBanner(false);
                }
            }
        }
    }

    async _checkMainChannelAndSwitch() {
        try {
            const response = await fetch(`/functions/get-live-streams?channel=${this.mainChannel}`);
            
            if (!response.ok) {
                console.error('Failed to check main channel status:', response.status, response.statusText);
                return;
            }
            
            const responseText = await response.text();
            if (!responseText.trim()) {
                console.error('Empty response from server');
                return;
            }
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                return;
            }
            
            if (data.mainChannelLive) {
                this.changeChannel(this.mainChannel, 'twitch', false);
            }
        } catch (error) {
            console.error('Error checking main channel status:', error);
        }
    }

    async _handleOfflineState() {
        const currentChannel = this.config.channel.toLowerCase();
        
        if (currentChannel !== this.mainChannel.toLowerCase() && !this.isHostingFamily) {
            this.showChannelSwitcher();
            return;
        }

        try {
            const familyQuery = TWITCH_CONFIG.fuFamily.join(',');
            const response = await fetch(`/functions/get-live-streams?channel=${this.mainChannel}&family=${familyQuery}`);
            
            if (!response.ok) {
                console.error('Server error:', response.status, response.statusText);
                this.showChannelSwitcher();
                return;
            }
            
            const responseText = await response.text();
            
            if (!responseText.trim()) {
                console.error('Empty response from server');
                this.showChannelSwitcher();
                return;
            }
            
            if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                console.error('Server returned HTML instead of JSON - function may not be deployed');
                this.showChannelSwitcher();
                return;
            }
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                this.showChannelSwitcher();
                return;
            }

            if (data.liveFamilyMember) {
                this.changeChannel(data.liveFamilyMember.channel, 'twitch', true, data.liveFamilyMember.displayName);
            } else {
                this.showChannelSwitcher();
            }
        } catch (error) {
            console.error("Could not check for auto-host:", error);
            this.showChannelSwitcher();
        }
    }

    _updateHostingBanner(isHosting, channelDisplayName = '') {
        if (this.hostingBanner) {
            if (isHosting) {
                this.hostedChannelSpan.textContent = channelDisplayName;
                this.hostingBanner.classList.remove('hidden');
            } else {
                this.hostingBanner.classList.add('hidden');
            }
        }
    }

    _handleURLChannelChange(id, platform, fromURLUpdate) {
        if (fromURLUpdate === false) {
            const isFamilyMember = platform === 'twitch' && TWITCH_CONFIG.fuFamily.some(fam => 
                fam.toLowerCase() === id.toLowerCase()
            );
            this.changeChannel(id, platform, isFamilyMember);
        }
    }

    init() {
        const urlContent = this.urlManager.getContentFromHash();
        if (urlContent && urlContent.platform === 'youtube') {
            this.currentPlatform = 'youtube';
            this.currentId = urlContent.id;
            this._switchToYouTube(urlContent.id);
        } else {
            this._switchToTwitch();
        }
        
        setTimeout(() => this.maintainAspectRatio(), 100);
    }

    async _switchToTwitch() {
        this.currentPlatform = 'twitch';
        
        // Clean up YouTube handler
        if (this.activeHandler === this.youtubeHandler) {
            this.youtubeHandler.destroy();
        }
        
        // Show chat panel for Twitch
        if (this.chatPanel) {
            this.chatPanel.style.display = '';
        }
        
        // Initialize Twitch embed
        await this.twitchHandler.init();
        this.activeHandler = this.twitchHandler;
        
        // Create chat if needed
        if (this.showChat) {
            this.twitchHandler.createChat();
        }
        
        this.maintainAspectRatio();
    }

    async _switchToYouTube(videoId) {
        this.currentPlatform = 'youtube';
        
        // Clean up Twitch handler
        if (this.activeHandler === this.twitchHandler) {
            this.twitchHandler.destroy();
        }
        
        // Hide chat panel for YouTube
        if (this.chatPanel) {
            this.chatPanel.style.display = 'none';
        }
        
        // Initialize YouTube embed
        try {
            await this.youtubeHandler.init(videoId);
            this.activeHandler = this.youtubeHandler;
            this.maintainAspectRatio();
        } catch (error) {
            console.error('Failed to initialize YouTube embed:', error);
            this.showChannelSwitcher();
        }
    }

    maintainAspectRatio() {
        const videoWrapper = document.querySelector('.video-wrapper');
        if (!videoWrapper) return;
        if (Utils.isMobile()) {
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
            videoWrapper.style.width = `${panelHeight * targetAspectRatio}px`;
        } else {
            videoWrapper.style.height = `${panelWidth / targetAspectRatio}px`;
        }
    }

    async showChannelSwitcher() {
        if (!this.channelSwitcher) {
            this.channelSwitcher = new ChannelSwitcher(
                (newChannel, platform) => this.changeChannel(newChannel, platform || 'twitch', false),
                this.currentPlatform === 'twitch' ? this.config.channel : this.currentId
            );
        }
        
        const displayId = this.currentPlatform === 'twitch' ? this.config.channel : this.currentId;
        this.channelSwitcher.updateCurrentChannel(displayId, this.currentPlatform);
        await this.channelSwitcher.show();
    }

    hideChannelSwitcher() {
        if (this.channelSwitcher) this.channelSwitcher.hide();
    }

    async changeChannel(newId, platform = 'twitch', isAutohost = false, displayName = null) {
        const normalizedId = platform === 'twitch' ? newId?.toLowerCase().trim() : newId;
        
        if (!normalizedId || (normalizedId === this.currentId && platform === this.currentPlatform)) return;
        
        // Validate YouTube video ID if it's a YouTube URL
        if (platform === 'youtube') {
            const videoId = this.youtubeHandler.extractVideoId(normalizedId);
            if (!videoId || !this.youtubeHandler.isValidVideoId(videoId)) {
                console.error('Invalid YouTube video ID or URL:', normalizedId);
                if (this.channelSwitcher) {
                    this.channelSwitcher.showError('Invalid YouTube video ID or URL');
                }
                return;
            }
            this.currentId = videoId;
        } else {
            // Check if this is a family member for Twitch
            const isFamilyMember = TWITCH_CONFIG.fuFamily.some(fam => 
                fam.toLowerCase() === normalizedId.toLowerCase()
            );
            
            this.config.channel = normalizedId;
            this.currentId = normalizedId;
            this.isHostingFamily = isFamilyMember && isAutohost;
        }
        
        this.currentPlatform = platform;
        
        // Update URL
        this.urlManager.setChannel(this.currentId, platform, true);
        
        // Switch to appropriate platform
        if (platform === 'youtube') {
            await this._switchToYouTube(this.currentId);
        } else {
            await this._switchToTwitch();
        }
        
        // Show hosting banner if we're auto-hosting a family member
        if (this.isHostingFamily) {
            const bannerName = displayName || newId;
            this._updateHostingBanner(true, bannerName);
        } else {
            this._updateHostingBanner(false);
        }
        
        // Update channel switcher if open
        if (this.channelSwitcher) {
            const displayId = this.currentPlatform === 'twitch' ? this.config.channel : this.currentId;
            this.channelSwitcher.updateCurrentChannel(displayId, this.currentPlatform);
            this.hideChannelSwitcher();
        }
    }

    // Legacy method name for backward compatibility
    recreateEmbed() {
        if (this.currentPlatform === 'youtube') {
            this._switchToYouTube(this.currentId);
        } else {
            this._switchToTwitch();
        }
    }
}