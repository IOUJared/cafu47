export class MobileBrowserUIHider {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isAndroid = /Android/.test(navigator.userAgent);

        if (this.isIOS || this.isAndroid) {
            this.setupViewport();
            this.setupEventListeners();
            // Initial hide attempt
            this.hideUI();
        }
    }

    setupViewport() {
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100);
        });
    }

    hideUI() {
        // This is a common trick to hide the address bar on mobile browsers
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 200);
    }

    setupEventListeners() {
        // Attempt to hide the UI on the first touch interaction
        document.addEventListener('touchstart', () => this.hideUI(), { once: true });
        
        // Also hide on orientation change
        window.addEventListener('orientationchange', () => this.hideUI());
    }
}