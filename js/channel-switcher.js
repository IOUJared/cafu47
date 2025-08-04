// js/channel-switcher.js - Updated to support both Twitch and YouTube

import { Utils } from './utils.js';
import { CONSTANTS } from './constants.js';

export class ChannelSwitcher {
    constructor(onChannelChangeCallback, mainChannel) {
        this.onChannelChange = onChannelChangeCallback;
        this.mainChannel = mainChannel;
        this.currentPlatform = 'twitch';
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
        if (!this.elements.suggestionsContainer) return;

        this.elements.suggestionLabel.textContent = 'Finding related live channels...';
        this.elements.suggestionsContainer.innerHTML = '';
        
        try {
            const apiEndpoint = '/functions/get-live-streams';
            const response = await fetch(`${apiEndpoint}?channel=${this.mainChannel}`);
            
            if (!response.ok) {
                console.error('Server error:', response.status, response.statusText);
                this.elements.suggestionLabel.textContent = 'Could not load related live channels.';
                return;
            }
            
            const responseText = await response.text();

            if (!responseText.trim()) {
                console.error('Empty response from server');
                this.elements.suggestionLabel.textContent = 'Could not load related live channels.';
                return;
            }
            
            // Check if response looks like HTML (common when function isn't found)
            if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                console.error('Server returned HTML instead of JSON - function may not be deployed');
                console.error('Response preview:', responseText.substring(0, 100) + '...');
                this.elements.suggestionLabel.textContent = 'API not available - function may not be deployed.';
                return;
            }
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                console.error('Response was:', responseText.substring(0, 200) + '...');
                this.elements.suggestionLabel.textContent = 'Could not load related live channels.';
                return;
            }
            
            const liveChannels = data.suggestions;

            if (liveChannels && liveChannels.length > 0) {
                this.elements.suggestionLabel.textContent = 'Related live channels:';
                this._populateButtons(liveChannels);
            } else {
                this.elements.suggestionLabel.textContent = 'Could not find related live channels.';
            }

        } catch (error) {
            console.error('Failed to load live channels:', error);
            this.elements.suggestionLabel.textContent = 'Could not load related live channels.';
        }
    }

    _populateButtons(channels) {
        this.elements.suggestionsContainer.innerHTML = '';
        channels.forEach(({ channel, label }) => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.dataset.channel = channel;
            btn.dataset.platform = 'twitch';
            btn.textContent = label;
            this.elements.suggestionsContainer.appendChild(btn);
        });
    }

    _setupEventListeners() {
        if (!this.ui) return;

        const switchChannel = async (channelName = null, platform = 'twitch') => {
            const rawChannel = channelName || this.elements.input.value;
            if (!rawChannel) return;

            // Detect platform from input
            const detectedPlatform = this._detectPlatform(rawChannel);
            const finalPlatform = platform || detectedPlatform;

            let validation;
            if (finalPlatform === 'youtube') {
                validation = this._validateYouTubeInput(rawChannel);
            } else {
                validation = Utils.validateTwitchChannel(rawChannel);
            }

            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }

            const newChannel = validation.channel || validation.videoId;
            const currentShownChannel = this.elements.currentChannelSpan.textContent.toLowerCase();
            
            // Don't switch if it's the same content and platform
            if (newChannel === currentShownChannel && finalPlatform === this.currentPlatform) return;

            this.setLoading(true);

            try {
                await this.onChannelChange(newChannel, finalPlatform);
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
                const platform = e.target.dataset.platform || 'twitch';
                this.elements.input.value = channel;
                switchChannel(channel, platform);
            }
        });

        this.elements.input.addEventListener('input', () => {
            this.clearError();
            this._updateInputPlaceholder();
        });
    }

    _detectPlatform(input) {
        // YouTube URL patterns
        const youtubePatterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/
        ];

        for (const pattern of youtubePatterns) {
            if (pattern.test(input)) {
                return 'youtube';
            }
        }

        // Check if it looks like a YouTube video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
            return 'youtube';
        }

        return 'twitch';
    }

    _validateYouTubeInput(input) {
        const trimmed = input.trim();
        
        // Try to extract video ID from URL
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match && match[1]) {
                const videoId = match[1];
                if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                    return { valid: true, videoId };
                }
            }
        }

        // Check if it's already a valid video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
            return { valid: true, videoId: trimmed };
        }

        return {
            valid: false,
            error: 'Please enter a valid YouTube URL or video ID (11 characters).'
        };
    }

    _updateInputPlaceholder() {
        const input = this.elements.input;
        const value = input.value.trim();
        
        if (value === '') {
            input.placeholder = 'Enter Twitch channel or YouTube URL';
        } else if (this._detectPlatform(value) === 'youtube') {
            input.placeholder = 'YouTube video detected';
        } else {
            input.placeholder = 'Twitch channel detected';
        }
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

        // Only load Twitch suggestions if current platform is Twitch
        if (this.currentPlatform === 'twitch') {
            await this._loadLiveSuggestions();
        } else {
            this.elements.suggestionLabel.textContent = 'Popular channels:';
            this._populateButtons([
                { channel: 'fuslie', label: 'fuslie' },
                { channel: 'pokimane', label: 'pokimane' },
                { channel: 'sykkuno', label: 'sykkuno' },
                { channel: 'valkyrae', label: 'valkyrae' },
                { channel: 'disguisedtoast', label: 'DisguisedToast' }
            ]);
        }

        setTimeout(() => {
            if (this.elements.input) {
                this.elements.input.focus();
                this._updateInputPlaceholder();
            }
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
        this.elements.input.placeholder = 'Enter Twitch channel or YouTube URL';
    }

    updateCurrentChannel(channel, platform = 'twitch') {
        if (this.elements.currentChannelSpan) {
            if (platform === 'youtube') {
                this.elements.currentChannelSpan.textContent = `YouTube: ${channel}`;
            } else {
                this.elements.currentChannelSpan.textContent = channel;
            }
        }
        this.currentPlatform = platform;
    }

    destroy() {
        this.hide();
    }
}