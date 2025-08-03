class ChannelSwitcher {
    constructor(currentChannel, onChannelChange) {
        this.currentChannel = currentChannel;
        this.onChannelChange = onChannelChange;
        this.ui = null;
        this.isVisible = false;
    }

    createUI() {
        if (this.ui) return this.ui;

        this.ui = document.createElement('div');
        this.ui.className = 'stream-offline-ui';
        this.ui.innerHTML = `
            <div class="offline-content">
                <div class="offline-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <h2>Stream is Offline</h2>
                <p>The channel "<span class="current-channel">${this.currentChannel}</span>" is currently offline.</p>
                <div class="channel-switcher">
                    <label for="new-channel">Watch another channel:</label>
                    <div class="input-group">
                        <input type="text" id="new-channel" placeholder="Enter channel name" autocomplete="off" />
                        <button id="switch-channel-btn" type="button">
                            <span class="btn-text">Watch</span>
                            <span class="btn-loading" style="display: none;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
                                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                                    </path>
                                </svg>
                            </span>
                        </button>
                    </div>
                    <div class="channel-suggestions">
                        <span class="suggestion-label">Popular channels:</span>
                        <div class="suggestions">
                            <button class="suggestion-btn" data-channel="xqc">xQc</button>
                            <button class="suggestion-btn" data-channel="shroud">Shroud</button>
                            <button class="suggestion-btn" data-channel="pokimane">Pokimane</button>
                            <button class="suggestion-btn" data-channel="sodapoppin">Sodapoppin</button>
                        </div>
                    </div>
                    <div class="url-info">
                        <small>💡 URL will update to reflect the current channel</small>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        return this.ui;
    }

    setupEventListeners() {
        const input = this.ui.querySelector('#new-channel');
        const button = this.ui.querySelector('#switch-channel-btn');
        const suggestions = this.ui.querySelectorAll('.suggestion-btn');

        const switchChannel = async (channelName = null) => {
            const newChannel = channelName || input.value.trim().toLowerCase();
            if (!newChannel || newChannel === this.currentChannel) return;

            // Show loading state
            this.setLoading(true);

            try {
                await this.onChannelChange(newChannel);
                this.currentChannel = newChannel;
            } catch (error) {
                console.error('Failed to switch channel:', error);
                this.showError('Failed to switch channel. Please try again.');
            } finally {
                this.setLoading(false);
            }
        };

        // Main input and button
        button.addEventListener('click', () => switchChannel());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                switchChannel();
            }
        });

        // Suggestion buttons
        suggestions.forEach(btn => {
            btn.addEventListener('click', () => {
                const channel = btn.dataset.channel;
                input.value = channel;
                switchChannel(channel);
            });
        });

        // Clear error on input
        input.addEventListener('input', () => {
            this.clearError();
        });
    }

    setLoading(loading) {
        const button = this.ui.querySelector('#switch-channel-btn');
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        const input = this.ui.querySelector('#new-channel');

        button.disabled = loading;
        input.disabled = loading;
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    showError(message) {
        this.clearError();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const inputGroup = this.ui.querySelector('.input-group');
        inputGroup.appendChild(errorDiv);
    }

    clearError() {
        const existingError = this.ui.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    show() {
        if (this.isVisible) return;

        // Always append to body for full viewport coverage
        this.createUI();
        document.body.appendChild(this.ui);
        document.body.classList.add('offline-ui-active');
        this.isVisible = true;

        // Focus input after a short delay
        setTimeout(() => {
            const input = this.ui.querySelector('#new-channel');
            if (input) input.focus();
        }, 100);
    }

    hide() {
        if (!this.isVisible || !this.ui) return;

        this.ui.remove();
        document.body.classList.remove('offline-ui-active');
        this.isVisible = false;
        this.clearError();
    }

    updateCurrentChannel(channel) {
        this.currentChannel = channel;
        if (this.ui) {
            const channelSpan = this.ui.querySelector('.current-channel');
            if (channelSpan) {
                channelSpan.textContent = channel;
            }
        }
    }

    destroy() {
        this.hide();
        this.ui = null;
    }
}