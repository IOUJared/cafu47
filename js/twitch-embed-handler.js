// js/twitch-embed-handler.js

import { CONSTANTS } from './constants.js';

export class TwitchEmbedHandler {
    constructor(config, container, streamStatus) {
        this.config = config;
        this.container = container;
        this.streamStatus = streamStatus;
        this.embed = null;
        this.player = null;
        this.statusMonitorCleanup = null;
    }

    async init() {
        if (!this.container) {
            throw new Error('Video container not found');
        }

        // Clear container
        this.container.innerHTML = '';
        
        const allowedDomains = ["cafu47.com", "www.cafu47.com", "cafu47.pages.dev", "localhost"];
        
        return new Promise((resolve, reject) => {
            try {
                this.embed = new Twitch.Embed("twitch-video", {
                    width: "100%",
                    height: "100%",
                    channel: this.config.channel,
                    layout: "video",
                    autoplay: this.config.video.autoplay,
                    parent: allowedDomains
                });
                
                this._setupVideoEvents(resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    _setupVideoEvents(resolve, reject) {
        this.embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            try {
                this.player = this.embed.getPlayer();
                this.player.setQuality(this.config.video.quality);
                
                if (this.config.video.autoplay) {
                    this.player.play();
                }
                
                this.streamStatus.setOnline();
                
                // Clean up any existing status monitor
                if (this.statusMonitorCleanup) {
                    this.statusMonitorCleanup();
                }
                
                // Start monitoring the player
                this.statusMonitorCleanup = this.streamStatus.monitorPlayer(this.player);
                
                // Check initial status after a delay
                setTimeout(() => this._checkInitialStatus(), CONSTANTS.STREAM_STATUS.INITIAL_CHECK_DELAY);
                
                resolve(this.player);
            } catch (error) {
                reject(error);
            }
        });

        this.embed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
            this.streamStatus.setOnline();
        });

        this.embed.addEventListener(Twitch.Player.OFFLINE, () => {
            this.streamStatus.setOffline();
        });

        // Handle embed errors
        this.embed.addEventListener(Twitch.Player.READY, () => {
            console.log('Twitch player ready');
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

    createChat() {
        const chatFrame = document.getElementById('twitch-chat');
        if (!chatFrame) {
            console.warn('Chat frame not found');
            return;
        }
        
        const currentDomain = window.location.hostname;
        const darkMode = this.config.chat.darkMode ? '&darkpopout' : '';
        const extParams = '&enable-frankerfacez=true&enable-bttv=true&enable-7tv=true';
        
        chatFrame.src = `https://www.twitch.tv/embed/${this.config.channel}/chat?parent=${currentDomain}${darkMode}${extParams}`;
    }

    play() {
        if (this.player) {
            this.player.play();
        }
    }

    pause() {
        if (this.player) {
            this.player.pause();
        }
    }

    getCurrentTime() {
        if (this.player) {
            try {
                return this.player.getCurrentTime();
            } catch (error) {
                console.warn('Could not get current time:', error);
            }
        }
        return 0;
    }

    getDuration() {
        if (this.player) {
            try {
                return this.player.getDuration();
            } catch (error) {
                console.warn('Could not get duration:', error);
            }
        }
        return 0;
    }

    isPaused() {
        if (this.player) {
            try {
                return this.player.isPaused();
            } catch (error) {
                console.warn('Could not check if paused:', error);
            }
        }
        return false;
    }

    getEnded() {
        if (this.player) {
            try {
                return this.player.getEnded();
            } catch (error) {
                console.warn('Could not check if ended:', error);
            }
        }
        return false;
    }

    setQuality(quality) {
        if (this.player) {
            try {
                this.player.setQuality(quality);
            } catch (error) {
                console.warn('Could not set quality:', error);
            }
        }
    }

    destroy() {
        // Clean up status monitoring
        if (this.statusMonitorCleanup) {
            this.statusMonitorCleanup();
            this.statusMonitorCleanup = null;
        }

        // Clean up player reference
        this.player = null;
        
        // Twitch embed doesn't have a destroy method, so we clear the container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.embed = null;
    }
}