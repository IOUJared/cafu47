export class MobileBrowserUIHider {
    constructor() {
        this.fullscreenButton = document.getElementById('fullscreen-btn');
        this.mainContainer = document.getElementById('main-container');
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (this.fullscreenButton) {
            if (this.isIOS) {
                // Fullscreen API is not supported on iOS, so remove the button.
                this.fullscreenButton.remove();
            } else if (this.mainContainer) {
                // Setup for non-iOS (Android)
                this.setupEventListeners();
            }
        }
    }

    setupEventListeners() {
        this.fullscreenButton.addEventListener('click', () => {
            this.handleAndroidFullscreen();
        });
    }

    handleAndroidFullscreen() {
        if (this.mainContainer.requestFullscreen) {
            this.mainContainer.requestFullscreen();
        } else if (this.mainContainer.webkitRequestFullscreen) {
            this.mainContainer.webkitRequestFullscreen();
        }
    }
}