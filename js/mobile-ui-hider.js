export class MobileBrowserUIHider {
    constructor() {
        this.fullscreenButton = document.getElementById('fullscreen-btn');
        this.mainContainer = document.getElementById('main-container');
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (this.fullscreenButton && this.mainContainer) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.fullscreenButton.addEventListener('click', () => {
            this.handleMobileAction();
        });
    }

    handleMobileAction() {
        if (this.isIOS) {
            // iOS does not support the Fullscreen API.
            // We will scroll to hide the URL bar and then hide the button.
            window.scrollTo(0, 1);
            this.fullscreenButton.style.display = 'none';
        } else {
            // For Android and other supported browsers, use the Fullscreen API.
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (this.mainContainer.requestFullscreen) {
                    this.mainContainer.requestFullscreen();
                } else if (this.mainContainer.webkitRequestFullscreen) { /* Safari */
                    this.mainContainer.webkitRequestFullscreen();
                }
            }
        }
    }
}