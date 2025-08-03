export class MobileBrowserUIHider {
    constructor() {
        this.fullscreenButton = document.getElementById('fullscreen-btn');
        this.mainContainer = document.getElementById('main-container');

        if (this.fullscreenButton && this.mainContainer) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.fullscreenButton.addEventListener('click', () => {
            this.enterFullscreen();
        });

        // Also add a fallback for initial scroll hide
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 300);
    }

    enterFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (this.mainContainer.requestFullscreen) {
                this.mainContainer.requestFullscreen();
            } else if (this.mainContainer.webkitRequestFullscreen) { /* Safari */
                this.mainContainer.webkitRequestFullscreen();
            }
        }
    }
}