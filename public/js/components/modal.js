// public/js/components/modal.js
class Modal {
    static show(content, onClose = null) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay animate-fadeIn';
        
        overlay.innerHTML = `
            <div class="modal animate-slideUp">
                ${content}
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (onClose) onClose();
            }
        });

        document.body.appendChild(overlay);
        return overlay;
    }

    static close(overlay) {
        if (overlay) overlay.remove();
    }
}