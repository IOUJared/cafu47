// js/youtube-embed-handler.js

export class YouTubeEmbedHandler {
    constructor(config, container) {
        this.config = config;
        this.container = container;
        this.player = null;
        this.isReady = false;
        this.onReadyCallbacks = [];
        this.onStateChangeCallbacks = [];
        this.playerDiv = null;
    }

    async init(videoId) {
        if (!this.container) {
            throw new Error('Video container not found');
        }

        if (!videoId || !this.isValidVideoId(videoId)) {
            throw new Error('Invalid YouTube video ID');
        }

        // Load YouTube API if not already loaded
        await this.loadYouTubeAPI();
        
        return new Promise((resolve, reject) => {
            this.createPlayer(videoId, resolve, reject);
        });
    }

    loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }

            // Set up the callback for when API is ready
            window.onYouTubeIframeAPIReady = resolve;

            // Load the API script if not already loaded
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                // Script is loaded but API might not be ready
                if (window.YT && window.YT.loaded) {
                    resolve();
                } else {
                    setTimeout(() => {
                        if (window.YT && window.YT.Player) {
                            resolve();
                        } else {
                            reject(new Error('YouTube API failed to load'));
                        }
                    }, 3000);
                }
            }
        });
    }

    createPlayer(videoId, resolve, reject) {
        try {
            // Clear container
            this.container.innerHTML = '';

            // Create player div
            this.playerDiv = document.createElement('div');
            this.playerDiv.id = `youtube-player-${Date.now()}`;
            this.container.appendChild(this.playerDiv);

            const playerVars = {
                autoplay: this.config.video.autoplay ? 1 : 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                fs: 1,
                cc_load_policy: 0,
                iv_load_policy: 3,
                autohide: 0,
                origin: window.location.origin
            };

            this.player = new window.YT.Player(this.playerDiv.id, {
                width: '100%',
                height: '100%',
                videoId: videoId,
                playerVars: playerVars,
                events: {
                    onReady: (event) => {
                        this.isReady = true;
                        console.log('YouTube player ready');
                        this.onReadyCallbacks.forEach(callback => callback(event));
                        resolve(this.player);
                    },
                    onStateChange: (event) => {
                        this.onStateChangeCallbacks.forEach(callback => callback(event));
                        this._handleStateChange(event);
                    },
                    onError: (event) => {
                        console.error('YouTube player error:', event.data);
                        const errorMessages = {
                            2: 'Invalid video ID',
                            5: 'HTML5 player error',
                            100: 'Video not found or private',
                            101: 'Video not allowed to be played in embedded players',
                            150: 'Video not allowed to be played in embedded players'
                        };
                        const message = errorMessages[event.data] || `YouTube player error: ${event.data}`;
                        reject(new Error(message));
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    }

    _handleStateChange(event) {
        const state = event.data;
        const states = window.YT.PlayerState;
        
        switch (state) {
            case states.ENDED:
                console.log('YouTube video ended');
                break;
            case states.PLAYING:
                console.log('YouTube video playing');
                break;
            case states.PAUSED:
                console.log('YouTube video paused');
                break;
            case states.BUFFERING:
                console.log('YouTube video buffering');
                break;
            case states.CUED:
                console.log('YouTube video cued');
                break;
            default:
                console.log('YouTube video state:', state);
        }
    }

    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this.onReadyCallbacks.push(callback);
        }
    }

    onStateChange(callback) {
        this.onStateChangeCallbacks.push(callback);
    }

    play() {
        if (this.player && this.isReady) {
            this.player.playVideo();
        }
    }

    pause() {
        if (this.player && this.isReady) {
            this.player.pauseVideo();
        }
    }

    getCurrentTime() {
        if (this.player && this.isReady) {
            try {
                return this.player.getCurrentTime();
            } catch (error) {
                console.warn('Could not get current time:', error);
            }
        }
        return 0;
    }

    getDuration() {
        if (this.player && this.isReady) {
            try {
                return this.player.getDuration();
            } catch (error) {
                console.warn('Could not get duration:', error);
            }
        }
        return 0;
    }

    getPlayerState() {
        if (this.player && this.isReady) {
            try {
                return this.player.getPlayerState();
            } catch (error) {
                console.warn('Could not get player state:', error);
            }
        }
        return -1;
    }

    isPaused() {
        return this.getPlayerState() === window.YT.PlayerState.PAUSED;
    }

    isEnded() {
        return this.getPlayerState() === window.YT.PlayerState.ENDED;
    }

    isPlaying() {
        return this.getPlayerState() === window.YT.PlayerState.PLAYING;
    }

    destroy() {
        if (this.player) {
            try {
                this.player.destroy();
            } catch (error) {
                console.warn('Error destroying YouTube player:', error);
            }
            this.player = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.isReady = false;
        this.onReadyCallbacks = [];
        this.onStateChangeCallbacks = [];
        this.playerDiv = null;
    }

    extractVideoId(url) {
        // Handle various YouTube URL formats
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // If it's already just a video ID
        if (this.isValidVideoId(url)) {
            return url;
        }

        return null;
    }

    isValidVideoId(videoId) {
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    }
}