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
    }

    setupLayout() {
        const container = document.querySelector('.container');
        if (!this.showChat) {
            container.classList.add('video-only');
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
        });
    }

    createChatEmbed() {
        const chatFrame = document.getElementById('twitch-chat');
        const parentParams = this.config.domains.map(domain => `parent=${domain}`).join('&');
        const darkMode = this.config.chat.darkMode ? '&darkpopout' : '';
        
        chatFrame.src = `https://www.twitch.tv/embed/${this.config.channel}/chat?${parentParams}${darkMode}`;
    }

    changeChannel(newChannel) {
        this.config.channel = newChannel;
        this.init();
    }
}