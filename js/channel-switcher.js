class ChannelSwitcher {
    constructor(onChannelChangeCallback, config) {
        this.onChannelChange = onChannelChangeCallback;
        this.config = config;
        this.isVisible = false;
        
        this._initDOMElements();
        if (!this.ui) {
            console.error('ChannelSwitcher UI not found in the DOM.');
            return;
        }

        this._setupEventListeners();
    }

    _initDOMElements() {
        this.ui = document.getElementById('stream-offline-ui');
        if (!this.ui) return;

        this.elements = {
            currentChannelSpan: this.ui.querySelector('.current-channel'),
            input: this.ui.querySelector('#new-channel-input'),
            button: this.ui.querySelector('#switch-channel-btn'),
            suggestionsContainer: this.ui.querySelector('.channel-suggestions .suggestions'),
            suggestionLabel: this.ui.querySelector('.suggestion-label'),
            inputGroup: this.ui.querySelector('.input-group'),
            btnText: this.ui.querySelector('.btn-text'),
            btnLoading: this.ui.querySelector('.btn-loading')
        };
    }

    async _loadLiveSuggestions() {
        if (!this.elements.suggestionsContainer || !this.config?.suggestions) {
            return;
        }

        this.elements.suggestionLabel.textContent = 'Finding live channels...';
        this.elements.suggestionsContainer.innerHTML = '';

        const staticChannels = this.config.suggestions.map(s => s.channel);
        
        try {
            // This is the correct endpoint path for a Cloudflare Function
            const apiEndpoint = '/get-live-streams';
            const response = await fetch(`${apiEndpoint}?channels=${staticChannels.join(',')}`);
            
            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.status})`);
            }
            
            const liveChannels = await response.json();

            if (liveChannels.length > 0) {
                this.elements.suggestionLabel.textContent = 'Online now:';
                this._populateButtons(liveChannels);
            } else {
                this.elements.suggestionLabel.textContent = 'No suggested channels are live. Try one of these:';
                this._populateButtons(this.config.suggestions); // Fallback to static list
            }

        } catch (error) {
            console.error('Failed to load live channels:', error);
            this.elements.suggestionLabel.textContent = 'Could not find live channels. Try one of these:';
            this._populateButtons(this.config.suggestions); // Fallback to static list on error
        }
    }

    _populateButtons(channels) {
        this.elements.suggestionsContainer.innerHTML = '';
        channels.forEach(({ channel, label }) => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.dataset.channel = channel;
            btn.textContent = label;
            this.elements.suggestionsContainer.appendChild(btn);
        });
    }

    _setupEventListeners() {
        if (!this.ui) return;

        const switchChannel = async (channelName = null) => {
            const rawChannel = channelName || this.elements.input.value;
            if (!rawChannel) return;

            const validation = Utils.validateTwitchChannel(rawChannel);
            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }

            const newChannel = validation.channel;
            const currentShownChannel = this.elements.currentChannelSpan.textContent.toLowerCase();
            if (newChannel === currentShownChannel) return;

            this.setLoading(true);

            try {
                await this.onChannelChange(newChannel);
            } catch (error) {
                console.error('Failed to switch channel:', error);
                this.showError('Could not switch to that channel. Please try again.');
                this.setLoading(false);
            }
        };

        this.elements.button.addEventListener('click', () => switchChannel());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                switchChannel();
            }
        });

        this.elements.suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.suggestion-btn')) {
                const channel = e.target.dataset.channel;
                this.elements.input.value = channel;
                switchChannel(channel);
            }
        });

        this.elements.input.addEventListener('input', () => this.clearError());
    }

    setLoading(loading) {
        if (!this.ui) return;
        this.elements.button.disabled = loading;
        this.elements.input.disabled = loading;
        
        this.elements.btnText.style.display = loading ? 'none' : 'inline';
        this.elements.btnLoading.style.display = loading ? 'inline-flex' : 'none';
    }

    showError(message) {
        if (!this.ui) return;
        this.clearError();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        this.elements.inputGroup.appendChild(errorDiv);
        this.elements.input.focus();
    }

    clearError() {
        if (!this.ui) return;
        const existingError = this.elements.inputGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    async show() {
        if (this.isVisible || !this.ui) return;

        this.ui.style.display = 'flex';
        document.body.classList.add('offline-ui-active');
        this.isVisible = true;

        await this._loadLiveSuggestions();

        setTimeout(() => {
            if (this.elements.input) this.elements.input.focus();
        }, CONSTANTS.UI_DELAYS.FOCUS_INPUT);
    }

    hide() {
        if (!this.isVisible || !this.ui) return;
        
        this.ui.style.display = 'none';
        document.body.classList.remove('offline-ui-active');
        this.isVisible = false;
        
        this.setLoading(false);
        this.clearError();
        this.elements.input.value = '';
    }

    updateCurrentChannel(channel) {
        if (this.elements.currentChannelSpan) {
            this.elements.currentChannelSpan.textContent = channel;
        }
    }

    destroy() {
        this.hide();
    }
}