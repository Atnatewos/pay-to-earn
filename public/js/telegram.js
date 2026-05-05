// public/js/telegram.js
const TelegramApp = {
    isTelegram: false,
    webApp: null,
    mainButton: null,
    backButton: null,

    init() {
        // Check if running inside Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            this.isTelegram = true;
            this.webApp = window.Telegram.WebApp;
            
            // Apply Telegram theme
            this.applyTheme();
            
            // Add telegram class to body
            document.body.classList.add('telegram-mini-app');
            
            // Initialize main button
            this.mainButton = this.webApp.MainButton;
            this.backButton = this.webApp.BackButton;
            
            // Tell Telegram the app is ready
            this.webApp.ready();
            
            // Handle back button
            this.backButton.onClick(() => {
                window.history.back();
            });
            
            console.log('Telegram Mini App initialized');
        }
    },

    applyTheme() {
        const root = document.documentElement;
        const theme = this.webApp.themeParams;
        
        if (theme.bg_color) root.style.setProperty('--color-bg', theme.bg_color);
        if (theme.text_color) root.style.setProperty('--color-text', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--color-text-secondary', theme.hint_color);
        if (theme.button_color) root.style.setProperty('--color-primary', theme.button_color);
        if (theme.secondary_bg_color) root.style.setProperty('--color-surface', theme.secondary_bg_color);
        
        // Set header color
        this.webApp.setHeaderColor(theme.bg_color || '#FFFFFF');
        this.webApp.setBackgroundColor(theme.secondary_bg_color || '#F8F9FA');
    },

    showMainButton(text, onClick, color) {
        if (!this.mainButton) return;
        this.mainButton.setText(text);
        this.mainButton.onClick(onClick);
        if (color) this.mainButton.color = color;
        this.mainButton.show();
    },

    hideMainButton() {
        if (this.mainButton) this.mainButton.hide();
    },

    showBackButton(onClick) {
        if (this.backButton) {
            this.backButton.onClick(onClick || (() => window.history.back()));
            this.backButton.show();
        }
    },

    hideBackButton() {
        if (this.backButton) this.backButton.hide();
    },

    hapticFeedback(type = 'light') {
        if (this.webApp && this.webApp.HapticFeedback) {
            this.webApp.HapticFeedback.impactOccurred(type);
        }
    },

    expand() {
        if (this.webApp) this.webApp.expand();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TelegramApp.init();
});