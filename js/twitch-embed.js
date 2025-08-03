class TwitchEmbed {
    constructor(config, showChat = true) {
        this.config = config;
        this.showChat = showChat;
        this.embed = null;
        this.player = null;
    }

    init() {
        this.setupLayout();
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
        // Update video size when window resizes or splitter moves
        const updateVideoSize = () => {
            this.maintainAspectRatio();
        };

        window.addEventListener('resize', updateVideoSize);
        
        // Watch for splitter changes
        const observer = new MutationObserver(updateVideoSize);
        const chatPanel = document.getElementById('chat-panel');
        observer.observe(chatPanel, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
    }

    maintainAspectRatio() {
        const videoPanel = document.querySelector('.video-panel');
        const videoWrapper = document.querySelector('.video-wrapper');
        
        if (!videoPanel || !videoWrapper) return;
        
        const panelRect = videoPanel.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        const panelAspectRatio = panelWidth / panelHeight;
        const targetAspectRatio = 16 / 9;
        
        if (panelAspectRatio > targetAspectRatio) {
            // Panel is wider than 16:9, fit by height
            const videoWidth = panelHeight * targetAspectRatio;
            videoWrapper.style.width = `${videoWidth}px`;
            videoWrapper.style.height = `${panelHeight}px`;
        } else {
            // Panel is taller than 16:9, fit by width
            const videoHeight = panelWidth / targetAspectRatio;
            videoWrapper.style.width = `${panelWidth}px`;
            videoWrapper.style.height = `${videoHeight}px`;
        }
    }

    createVideoEmbed() {
        this.embed = new Twitch.Embed("twitch-video", {
            width: "100%",
            height: "100%",
            channel: this.config.channel,
            layout: "video",
            autoplay: this.config.video.autoplay,
            parent: this.config.domains
        });

        this.embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
            this.player = this.embed.getPlayer();
            this.player.setQuality(this.config.video.quality);
            if (this.config.video.autoplay) {
                this.player.play();
            }
            // Maintain aspect ratio after video loads
            setTimeout(() => this.maintainAspectRatio(), 1000);
        });
    }

    createChatEmbed() {
        const chatFrame = document.getElementById('twitch-chat');
        const parentParams = this.config.domains.map(domain => `parent=${domain}`).join('&');
        const darkMode = this.config.chat.darkMode ? '&darkpopout' : '';
        
        chatFrame.src = `https://www.twitch.tv/embed/${this.config.channel}/chat?${parentParams}${darkMode}&migration=1`;
    }

    changeChannel(newChannel) {
        this.config.channel = newChannel;
        this.init();
    }
}