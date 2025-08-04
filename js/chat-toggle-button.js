/**
 * Manages the button for toggling chat visibility with Twitch-style design.
 * Updated to use more subtle icons and positioning that blends with Twitch's UI.
 */
export class ChatToggleButton {
    constructor(twitchEmbed) {
        this.twitchEmbed = twitchEmbed;
        this.button = document.getElementById('toggle-chat-btn');
        this.container = document.getElementById('main-container');
        this.videoPanel = document.querySelector('.video-panel');
        this.chatPanel = document.querySelector('.chat-panel');
        
        if (this.button) {
            this.init();
        }
    }

    /**
     * Initializes the button, sets its initial icon, and adds event listeners.
     */
    init() {
        this.updateIcon();
        this.updateButtonPosition();
        this.button.addEventListener('click', () => this.toggleChat());
        
        // Add hover delay for better UX
        let hoverTimeout;
        this.button.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            this.button.style.opacity = '1';
        });
        
        this.button.addEventListener('mouseleave', () => {
            hoverTimeout = setTimeout(() => {
                if (!this.button.matches(':hover')) {
                    this.button.style.opacity = '0.7';
                }
            }, 200);
        });
    }

    /**
     * Updates the button's position based on chat visibility.
     */
    updateButtonPosition() {
        const isChatHidden = this.container.classList.contains('chat-hidden');
        const isMobile = window.innerWidth <= 768;
        
        // On mobile, button stays fixed positioned
        if (isMobile) {
            return;
        }
        
        // Move button to appropriate parent
        if (isChatHidden) {
            // Chat is hidden, button goes in video panel (top-right)
            if (this.button.parentNode !== this.videoPanel) {
                this.videoPanel.appendChild(this.button);
            }
        } else {
            // Chat is visible, button goes in chat panel (top-right, subtle)
            if (this.button.parentNode !== this.chatPanel) {
                this.chatPanel.appendChild(this.button);
            }
        }
    }

    /**
     * Updates the button's icon and ARIA label based on chat visibility.
     * Uses more subtle, Twitch-style icons.
     */
    updateIcon() {
        const isChatHidden = this.container.classList.contains('chat-hidden');
        
        // More subtle, Twitch-style icons
        const showChatIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-3l-3 3-3-3H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v10h3l2 2 2-2h9V6H4z"/>
                <path d="M7 9h2v2H7V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9z"/>
            </svg>
        `;
        
        const hideChatIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                <path d="M8 11h8v2H8v-2z"/>
            </svg>
        `;
        
        // Even more subtle - use simple chevron/arrow icons
        const showIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
        `;
        
        const hideIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
            </svg>
        `;
        
        this.button.innerHTML = isChatHidden ? showIcon : hideIcon;
        this.button.setAttribute('aria-label', isChatHidden ? 'Show Chat' : 'Hide Chat');
        this.button.setAttribute('title', isChatHidden ? 'Show Chat' : 'Hide Chat');
    }

    /**
     * Toggles chat visibility, updates the URL, and resizes the video.
     */
    toggleChat() {
        this.container.classList.toggle('chat-hidden');
        this.updateIcon();
        this.updateButtonPosition();
        
        const url = new URL(window.location);
        if (this.container.classList.contains('chat-hidden')) {
            url.searchParams.set('nochat', 'true');
        } else {
            url.searchParams.delete('nochat');
        }
        history.pushState({}, '', url);

        requestAnimationFrame(() => {
            if (this.twitchEmbed) {
                this.twitchEmbed.maintainAspectRatio();
            }
        });
    }
}