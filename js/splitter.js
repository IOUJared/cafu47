class ResizableSplitter {
    constructor(config) {
        this.config = config;
        this.isResizing = false;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.splitter = document.getElementById('splitter');
        this.chatPanel = document.getElementById('chat-panel');
        this.container = document.querySelector('.container');
    }

    bindEvents() {
        this.splitter.addEventListener('mousedown', (e) => this.startResize(e));
        document.addEventListener('mousemove', (e) => this.resize(e));
        document.addEventListener('mouseup', () => this.stopResize());
        document.addEventListener('selectstart', (e) => this.preventSelection(e));
    }

    startResize(e) {
        this.isResizing = true;
        document.body.classList.add('dragging');
        e.preventDefault();
    }

    resize(e) {
        if (!this.isResizing) return;

        const containerRect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
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
    const twitchEmbed = new TwitchEmbed(TWITCH_CONFIG, SHOW_CHAT);
    
    twitchEmbed.init();
    
    // Only initialize splitter if chat is shown
    if (SHOW_CHAT) {
        const splitter = new ResizableSplitter(TWITCH_CONFIG);
    }
});