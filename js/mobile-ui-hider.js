export class MobileBrowserUIHider {
    constructor() {
        this.fullscreenButton = document.getElementById('fullscreen-btn');
        this.mainContainer = document.getElementById('main-container');
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (this.fullscreenButton && this.mainContainer && !this.isIOS) {
            this.setupEventListeners();
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