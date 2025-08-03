import { Utils } from './utils.js';
import { CONSTANTS } from './constants.js';

export class ResizableSplitter {
    constructor(config, twitchEmbed) {
        this.config = config;
        this.twitchEmbed = twitchEmbed;
        this.state = {
            isResizing: false,
            isMobile: Utils.isMobile(),
            isLandscape: Utils.isLandscape(),
            animationFrameId: null
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
        
        splitter.addEventListener('mousedown', (e) => this._startResize(e));
        document.addEventListener('mousemove', (e) => this._resize(e));
        document.addEventListener('mouseup', () => this._stopResize());
        
        splitter.addEventListener('touchstart', (e) => this._startResize(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._resize(e), { passive: false });
        document.addEventListener('touchend', () => this._stopResize());
        
        document.addEventListener('selectstart', (e) => this._preventSelection(e));
        
        const debouncedResize = Utils.debounce(() => this._handleResize(), 100);
        window.addEventListener('resize', debouncedResize);
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this._handleResize(), CONSTANTS.UI_DELAYS.ORIENTATION_CHANGE);
        });
    }

    _handleResize() {
        const prevState = { ...this.state };
        this.state.isMobile = Utils.isMobile();
        this.state.isLandscape = Utils.isLandscape();
        
        if (prevState.isMobile !== this.state.isMobile || (this.state.isMobile && prevState.isLandscape !== this.state.isLandscape)) {
            this._resetLayout();
        }
        if (this.twitchEmbed) {
            this.twitchEmbed.maintainAspectRatio();
        }
    }

    _resetLayout() {
        const { chatPanel, videoPanel } = this.elements;
        videoPanel.style.flex = '';
        chatPanel.style.flex = '';
        chatPanel.style.width = '';
        videoPanel.style.height = '';
        chatPanel.style.height = '';
    }

    _startResize(e) {
        this.state.isResizing = true;
        document.body.classList.add('dragging');
        e.preventDefault();
    }

    _resize(e) {
        if (!this.state.isResizing) return;

        if (this.state.animationFrameId) {
            window.cancelAnimationFrame(this.state.animationFrameId);
        }

        this.state.animationFrameId = window.requestAnimationFrame(() => {
            const coords = this._getEventCoords(e);
            const { isMobile, isLandscape } = this.state;
            
            if (isMobile && !isLandscape) {
                this._resizeMobilePortrait(coords.y);
            } else {
                this._resizeHorizontal(coords.x);
            }

            if (this.twitchEmbed) {
                this.twitchEmbed.maintainAspectRatio();
            }
        });
        e.preventDefault();
    }

    _getEventCoords(e) {
        const touch = e.touches && e.touches[0];
        return {
            x: touch ? touch.clientX : e.clientX,
            y: touch ? touch.clientY : e.clientY
        };
    }

    _resizeMobilePortrait(clientY) {
        const { container, videoPanel, chatPanel } = this.elements;
        const rect = container.getBoundingClientRect();
        const splitterHeight = CONSTANTS.SPLITTER.HEIGHT;
        const mouseY = clientY - rect.top;

        const minVideo = this.config.splitter.minVideoHeight;
        const minChat = this.config.splitter.minChatHeight;

        let newVideoHeight = Math.max(minVideo, Math.min(mouseY, rect.height - minChat - splitterHeight));
        
        videoPanel.style.flex = `0 0 ${newVideoHeight}px`;
        chatPanel.style.flex = '1 1 auto';
    }

    _resizeHorizontal(clientX) {
        const { container, videoPanel, chatPanel } = this.elements;
        const rect = container.getBoundingClientRect();
        const splitterWidth = CONSTANTS.SPLITTER.WIDTH;
        
        const { isMobile, isLandscape } = this.state;
        const config = this.config.splitter;
        const minVideo = isMobile && isLandscape ? config.mobileLandscape.minVideoWidth : config.minVideoWidth;
        const minChat = isMobile && isLandscape ? config.mobileLandscape.minChatWidth : config.minChatWidth;

        let newChatWidth = rect.width - (clientX - rect.left) - (splitterWidth / 2);
        newChatWidth = Math.max(minChat, Math.min(newChatWidth, rect.width - minVideo - splitterWidth));

        videoPanel.style.flex = '1 1 auto';
        chatPanel.style.flex = `0 0 ${newChatWidth}px`;
    }

    _stopResize() {
        if (this.state.isResizing) {
            this.state.isResizing = false;
            document.body.classList.remove('dragging');

            if (this.state.animationFrameId) {
                window.cancelAnimationFrame(this.state.animationFrameId);
                this.state.animationFrameId = null;
            }

            if (this.twitchEmbed) {
                this.twitchEmbed.maintainAspectRatio();
            }
        }
    }

    _preventSelection(e) {
        if (this.state.isResizing) {
            e.preventDefault();
        }
    }
}