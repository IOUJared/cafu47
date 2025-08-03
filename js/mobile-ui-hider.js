export class MobileBrowserUIHider {
    constructor() {
        this.fullscreenButton = document.getElementById('fullscreen-btn');
        this.mainContainer = document.getElementById('main-container');
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (this.isIOS) {
            // Add a helper class to the body to create a scroll buffer
            document.body.classList.add('ios-scroll-helper');

            // Attempt to hide the UI on load
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 300);
        }

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
            // On iOS, scroll to hide the URL bar and then hide the button
            window.scrollTo(0, 1);
            this.fullscreenButton.style.display = 'none';
        } else {
            // For Android, use the Fullscreen API
            if (this.mainContainer.requestFullscreen) {
                this.mainContainer.requestFullscreen();
            } else if (this.mainContainer.webkitRequestFullscreen) {
                this.mainContainer.webkitRequestFullscreen();
            }
        }
    }
}