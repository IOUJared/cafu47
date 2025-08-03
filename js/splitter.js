class ResizableSplitter {
    constructor(config) {
        this.config = config;
        this.state = {
            isResizing: false,
            isMobile: Utils.isMobile(),
            isLandscape: Utils.isLandscape(),
            startX: 0,
            startY: 0
        };
        
        this._initElements();
        this._bindEvents();
        this._handleResize();
    }

    _initElements() {
        this.elements = {
            splitter: document.getElementById('splitter'),
            chatPanel: document.getElementById('chat-panel'),
            videoPanel: document.querySelector('.video-panel'),
            container: document.querySelector('.container')
        };
    }

    _bindEvents() {
        const { splitter } = this.elements;
        
        // Mouse events
        splitter.addEventListener('mousedown', (e) => this._startResize(e));
        document.addEventListener('mousemove', (e) => this._resize(e));
        document.addEventListener('mouseup', () => this._stopResize());
        
        // Touch events
        splitter.addEventListener('touchstart', (e) => this._startResize(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._resize(e), { passive: false });
        document.addEventListener('touchend', () => this._stopResize());
        
        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => this._preventSelection(e));
        
        // Handle window resize
        const debouncedResize = Utils.debounce(() => this._handleResize(), 100);
        window.addEventListener('resize', debouncedResize);
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this._handleResize(), CONSTANTS.UI_DELAYS.ORIENTATION_CHANGE);
        });
    }

    _handleResize() {
        const prevState = { ...this.state };
        
        this.state.isMobile = Utils.isMobile();
        this.state.isLandscape = Utils.isLandscape();
        
        // Reset layout if device type or orientation changed
        if (this._shouldResetLayout(prevState)) {
            this._resetLayout();
        }
    }

    _shouldResetLayout(prevState) {
        return prevState.isMobile !== this.state.isMobile || 
               (this.state.isMobile && prevState.isLandscape !== this.state.isLandscape);
    }

    _resetLayout() {
        const { chatPanel, videoPanel } = this.elements;
        const { isMobile, isLandscape } = this.state;
        
        if (isMobile) {
            if (isLandscape) {
                // Mobile landscape - horizontal layout
                this._resetToHorizontal();
                chatPanel.style.width = this.config.splitter.mobileLandscape.defaultChatWidth + 'px';
            } else {
                // Mobile portrait - vertical layout
                this._resetToVertical();
            }
        } else {
            // Desktop - horizontal layout
            this._resetToHorizontal();
            chatPanel.style.width = this.config.splitter.defaultChatWidth + 'px';
        }
    }

    _resetToHorizontal() {
        const { chatPanel, videoPanel } = this.elements;
        chatPanel.style.height = '';
        videoPanel.style.height = '';
    }

    _resetToVertical() {
        const { chatPanel, videoPanel } = this.elements;
        chatPanel.style.width = '';
        chatPanel.style.height = '';
        videoPanel.style.height = '';
    }

    _startResize(e) {
        this.state.isResizing = true;
        document.body.classList.add('dragging');
        
        const coords = this._getEventCoords(e);
        this.state.startX = coords.x;
        this.state.startY = coords.y;
        
        e.preventDefault();
    }

    _resize(e) {
        if (!this.state.isResizing) return;
        
        const coords = this._getEventCoords(e);
        const { isMobile, isLandscape } = this.state;
        
        if (isMobile && !isLandscape) {
            this._resizeMobilePortrait(coords.y);
        } else {
            this._resizeHorizontal(coords.x);
        }
        
        e.preventDefault();
    }

    _getEventCoords(e) {
        if (e.type.startsWith('touch')) {
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
        return { x: e.clientX, y: e.clientY };
    }

    _resizeMobilePortrait(clientY) {
        const { container, videoPanel, chatPanel } = this.elements;
        const containerRect = container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const splitterHeight = CONSTANTS.SPLITTER.HEIGHT;
        
        const mouseY = clientY - containerRect.top;
        const constraints = this._getVerticalConstraints(containerHeight, splitterHeight);
        
        const newVideoHeight = Math.max(
            constraints.minVideoHeight, 
            Math.min(constraints.maxVideoHeight, mouseY)
        );
        
        const videoHeightPercent = (newVideoHeight / containerHeight) * 100;
        const chatHeightPercent = ((containerHeight - newVideoHeight - splitterHeight) / containerHeight) * 100;
        
        videoPanel.style.height = videoHeightPercent + '%';
        chatPanel.style.height = chatHeightPercent + '%';
    }

    _getVerticalConstraints(containerHeight, splitterHeight) {
        return {
            minVideoHeight: this.config.splitter.minVideoHeight,
            minChatHeight: this.config.splitter.minChatHeight,
            maxVideoHeight: containerHeight - this.config.splitter.minChatHeight - splitterHeight
        };
    }

    _resizeHorizontal(clientX) {
        const { container, chatPanel } = this.elements;
        const containerRect = container.getBoundingClientRect();
        const mouseX = clientX - containerRect.left;
        const containerWidth = containerRect.width;
        const splitterWidth = CONSTANTS.SPLITTER.WIDTH;
        
        const constraints = this._getHorizontalConstraints(containerWidth, splitterWidth);
        let newChatWidth = containerWidth - mouseX - splitterWidth;
        
        newChatWidth = Math.max(
            constraints.minChatWidth,
            Math.min(constraints.maxChatWidth, newChatWidth)
        );
        
        chatPanel.style.width = newChatWidth + 'px';
    }

    _getHorizontalConstraints(containerWidth, splitterWidth) {
        const { isMobile, isLandscape } = this.state;
        const config = this.config.splitter;
        
        if (isMobile && isLandscape) {
            return {
                minChatWidth: config.mobileLandscape.minChatWidth,
                minVideoWidth: config.mobileLandscape.minVideoWidth,
                maxChatWidth: containerWidth - config.mobileLandscape.minVideoWidth - splitterWidth
            };
        }
        
        return {
            minChatWidth: config.minChatWidth,
            minVideoWidth: config.minVideoWidth,
            maxChatWidth: containerWidth - config.minVideoWidth - splitterWidth
        };
    }

    _stopResize() {
        if (this.state.isResizing) {
            this.state.isResizing = false;
            document.body.classList.remove('dragging');
        }
    }

    _preventSelection(e) {
        if (this.state.isResizing) {
            e.preventDefault();
        }
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