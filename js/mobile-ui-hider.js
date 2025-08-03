// Add this to a new file: js/mobile-ui-hider.js
// Or add to the end of your existing js/config.js

class MobileBrowserUIHider {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        
        this.init();
    }
    
    init() {
        if (this.isIOS || this.isAndroid) {
            this.setupViewportHandler();
            this.setupScrollHandler();
            this.setupOrientationHandler();
            this.triggerUIHide();
        }
    }
    
    // Force iOS Safari to hide the address bar
    triggerUIHide() {
        // Scroll slightly to trigger Safari UI hide
        setTimeout(() => {
            window.scrollTo(0, 1);
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }, 500);
        
        // Additional trigger on user interaction
        document.addEventListener('touchstart', () => {
            this.hideUI();
        }, { once: true });
        
        document.addEventListener('click', () => {
            this.hideUI();
        }, { once: true });
    }
    
    hideUI() {
        // iOS Safari specific
        if (this.isIOS && this.isSafari) {
            // Request fullscreen if supported
            const container = document.querySelector('.container');
            if (container && container.requestFullscreen) {
                container.requestFullscreen().catch(() => {
                    // Fallback: scroll trick
                    window.scrollTo(0, 1);
                    setTimeout(() => window.scrollTo(0, 0), 0);
                });
            } else {
                // Scroll trick for older Safari
                window.scrollTo(0, 1);
                setTimeout(() => window.scrollTo(0, 0), 0);
            }
        }
        
        // Android Chrome
        if (this.isAndroid) {
            // Request fullscreen
            const container = document.querySelector('.container');
            if (container && container.requestFullscreen) {
                container.requestFullscreen();
            }
        }
    }
    
    setupViewportHandler() {
        // Update CSS custom properties when viewport changes
        const updateViewport = () => {
            const vh = window.innerHeight * 0.01;
            const vw = window.innerWidth * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--vw', `${vw}px`);
        };
        
        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateViewport, 100);
        });
    }
    
    setupScrollHandler() {
        // Prevent any scrolling that might show browser UI
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const isScrollingUp = currentY > startY;
            const isScrollingDown = currentY < startY;
            
            // Prevent overscroll that shows browser UI
            if ((isScrollingUp && window.pageYOffset <= 0) || 
                (isScrollingDown && window.pageYOffset >= document.body.scrollHeight - window.innerHeight)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    setupOrientationHandler() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.triggerUIHide();
                
                // Force recalculation of viewport
                const container = document.querySelector('.container');
                if (container) {
                    container.style.height = window.innerHeight + 'px';
                    container.style.width = window.innerWidth + 'px';
                }
            }, 200);
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        screen.orientation?.addEventListener('change', handleOrientationChange);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MobileBrowserUIHider();
    });
} else {
    new MobileBrowserUIHider();
}