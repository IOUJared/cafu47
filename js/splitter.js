class ResizableSplitter {
    constructor(config) {
        this.config = config;
        this.isResizing = false;
        this.isMobile = window.innerWidth <= config.mobile.breakpoint;
        this.isLandscape = window.innerWidth > window.innerHeight;
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
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }

    handleResize() {
        const wasMobile = this.isMobile;
        const wasLandscape = this.isLandscape;
        
        this.isMobile = window.innerWidth <= this.config.mobile.breakpoint;
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        // If switching between mobile/desktop or portrait/landscape, reset layout
        if (wasMobile !== this.isMobile || (this.isMobile && wasLandscape !== this.isLandscape)) {
            this.resetLayout();
        }
    }

    resetLayout() {
        if (this.isMobile) {
            if (this.isLandscape) {
                // Mobile landscape - side by side like desktop
                this.chatPanel.style.height = '';
                this.videoPanel.style.height = '';
                this.chatPanel.style.width = '280px';
            } else {
                // Mobile portrait - stacked
                this.chatPanel.style.width = '';
                this.chatPanel.style.height = '';
                this.videoPanel.style.height = '';
            }
        } else {
            // Desktop - side by side
            this.chatPanel.style.height = '';
            this.videoPanel.style.height = '';
            this.chatPanel.style.width = this.config.splitter.defaultChatWidth + 'px';
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

        if (this.isMobile && !this.isLandscape) {
            // Mobile portrait - vertical resize
            this.resizeMobilePortrait(clientY);
        } else {
            // Desktop or mobile landscape - horizontal resize
            this.resizeHorizontal(clientX);
        }
        
        e.preventDefault();
    }

    resizeMobilePortrait(clientY) {
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

    resizeHorizontal(clientX) {
        const containerRect = this.container.getBoundingClientRect();
        const mouseX = clientX - containerRect.left;
        const containerWidth = containerRect.width;
        const splitterWidth = 8;
        
        let newChatWidth = containerWidth - mouseX - splitterWidth;
        
        // Adjust minimum widths for mobile landscape
        const minChatWidth = this.isMobile && this.isLandscape ? 150 : this.config.splitter.minChatWidth;
        const minVideoWidth = this.isMobile && this.isLandscape ? 250 : this.config.splitter.minVideoWidth;
        const maxChatWidth = containerWidth - minVideoWidth - splitterWidth;
        
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