class ResizableSplitter {
    constructor(config) {
        this.config = config;
        this.isResizing = false;
        this.isMobile = window.innerWidth <= config.mobile.breakpoint;
        this.startY = 0;
        this.startX = 0;
        this.initElements();
        this.bindEvents();
        this.handleResize();
    }

    initElements() {
        this.splitter = document.getElementById('splitter');
        this.chatPanel = document.getElementById('chat-panel');
        this.videoPanel = document.querySelector('.video-panel');
        this.container = document.querySelector('.container');
    }

    bindEvents() {
        // Mouse events
        this.splitter.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('mouseup', () => this.stopResize());
        
        // Touch events for mobile
        this.splitter.addEventListener('touchstart', (e) => this.startResize(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.resize(e), { passive: false });
        document.addEventListener('touchend', () => this.stopResize());
        
        document.addEventListener('selectstart', (e) => this.preventSelection(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= this.config.mobile.breakpoint;
        
        // If switching between mobile/desktop, reset layout
        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.chatPanel.style.width = '';
                this.chatPanel.style.height = '';
                this.videoPanel.style.height = '';
            } else {
                this.chatPanel.style.height = '';
                this.videoPanel.style.height = '';
                this.chatPanel.style.width = this.config.splitter.defaultChatWidth + 'px';
            }
        }
    }

    startResize(e) {
        this.isResizing = true;
        document.body.classList.add('dragging');
        
        if (e.type === 'touchstart') {
            this.startY = e.touches[0].clientY;
            this.startX = e.touches[0].clientX;
        } else {
            this.startY = e.clientY;
            this.startX = e.clientX;
        }
        
        e.preventDefault();
    }

    resize(e) {
        if (!this.isResizing) return;

        let clientY, clientX;
        if (e.type === 'touchmove') {
            clientY = e.touches[0].clientY;
            clientX = e.touches[0].clientX;
        } else {
            clientY = e.clientY;
            clientX = e.clientX;
        }

        if (this.isMobile) {
            this.resizeMobile(clientY);
        } else {
            this.resizeDesktop(clientX);
        }
        
        e.preventDefault();
    }

    resizeMobile(clientY) {
        const containerRect = this.container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const splitterHeight = 8;
        
        const mouseY = clientY - containerRect.top;
        let newVideoHeight = mouseY;
        
        const minVideoHeight = this.config.splitter.minVideoHeight;
        const minChatHeight = this.config.splitter.minChatHeight;
        const maxVideoHeight = containerHeight - minChatHeight - splitterHeight;
        
        newVideoHeight = Math.max(minVideoHeight, Math.min(maxVideoHeight, newVideoHeight));
        
        const videoHeightPercent = (newVideoHeight / containerHeight) * 100;
        const chatHeightPercent = ((containerHeight - newVideoHeight - splitterHeight) / containerHeight) * 100;
        
        this.videoPanel.style.height = videoHeightPercent + '%';
        this.chatPanel.style.height = chatHeightPercent + '%';
    }

    resizeDesktop(clientX) {
        const containerRect = this.container.getBoundingClientRect();
        const mouseX = clientX - containerRect.left;
        const containerWidth = containerRect.width;
        const splitterWidth = 8;
        
        let newChatWidth = containerWidth - mouseX - splitterWidth;
        
        const minChatWidth = this.config.splitter.minChatWidth;
        const maxChatWidth = containerWidth - this.config.splitter.minVideoWidth - splitterWidth;
        
        newChatWidth = Math.max(minChatWidth, Math.min(maxChatWidth, newChatWidth));
        this.chatPanel.style.width = newChatWidth + 'px';
    }

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            document.body.classList.remove('dragging');
        }
    }

    preventSelection(e) {
        if (this.isResizing) e.preventDefault();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const twitchEmbed = new TwitchEmbed(TWITCH_CONFIG, EFFECTIVE_SHOW_CHAT);
    
    twitchEmbed.init();
    
    // Only initialize splitter if chat is shown
    if (EFFECTIVE_SHOW_CHAT) {
        const splitter = new ResizableSplitter(TWITCH_CONFIG);
    }
    
    // Add mobile class for CSS targeting
    if (IS_MOBILE && TWITCH_CONFIG.mobile.hideChat && !URLParams.has('chat')) {
        document.querySelector('.container').classList.add('mobile-hide-chat');
    }
});