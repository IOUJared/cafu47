/**
 * Manages the button for toggling chat visibility without a page reload.
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
    }

    /**
     * Updates the button's position based on chat visibility
     */
    updateButtonPosition() {
        const isChatHidden = this.container.classList.contains('chat-hidden');
        
        // Remove button from current parent
        if (this.button.parentNode) {
            this.button.remove();
        }
        
        // Add button to appropriate parent
        if (isChatHidden) {
            // Chat is hidden, put button on video panel (top-right)
            this.videoPanel.appendChild(this.button);
        } else {
            // Chat is visible, put button on chat panel (top-left)
            this.chatPanel.appendChild(this.button);
        }
    }

    /**
     * Updates the button's icon and ARIA label based on chat visibility.
     */
    updateIcon() {
        const isChatHidden = this.container.classList.contains('chat-hidden');
        const showIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6V6h12v8z"/></svg>`;
        const hideIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 21.9L2.1 2.1.69 3.51l2.32 2.32C2.33 6.23 2 6.96 2 8v10c0 1.1.9 2 2 2h11.17l2.32 2.31.12.12L21.9 21.9zM8 18H6v-2h2v2zm-2-4H4v-2h2v2zm-2-4H2V8h2v2zm4 4h2v-2H8v2zm4 0h3.17l-2-2H12v2zm4-4h-2l-2-2h4v2zm-4-4H8.83l2 2H14v-2zm4 0V8h-2V6h2zM22 6V4c0-1.1-.9-2-2-2H7.17l2 2H20v10h-1.17l2 2H20c1.1 0 2-.9 2-2V6z"/></svg>`;
        
        this.button.innerHTML = isChatHidden ? showIcon : hideIcon;
        this.button.setAttribute('aria-label', isChatHidden ? 'Show Chat' : 'Hide Chat');
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