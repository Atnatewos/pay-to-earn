class Dialog {
    static alert(message, title = 'Notice', type = 'info') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay animate-fadeIn';
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            overlay.innerHTML = `
                <div class="modal animate-scaleIn" style="max-width:380px; text-align:center;">
                    <div class="text-5xl mb-4">${icons[type] || icons.info}</div>
                    <h4 class="mb-2">${title}</h4>
                    <p class="text-secondary mb-6">${message}</p>
                    <button class="btn btn-primary btn-block" id="dialogOkBtn">OK</button>
                </div>
            `;

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve();
                }
            });

            document.body.appendChild(overlay);
            
            document.getElementById('dialogOkBtn').addEventListener('click', () => {
                overlay.remove();
                resolve();
            });
        });
    }

    static confirm(message, title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay animate-fadeIn';
            
            const icons = {
                warning: '⚠️',
                danger: '🚨',
                info: 'ℹ️'
            };

            overlay.innerHTML = `
                <div class="modal animate-scaleIn" style="max-width:380px; text-align:center;">
                    <div class="text-5xl mb-4">${icons[type] || icons.warning}</div>
                    <h4 class="mb-2">${title}</h4>
                    <p class="text-secondary mb-6">${message}</p>
                    <div class="flex gap-3">
                        <button class="btn btn-outline btn-block" id="dialogCancelBtn">${cancelText}</button>
                        <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'} btn-block" id="dialogConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            `;

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });

            document.body.appendChild(overlay);
            
            document.getElementById('dialogConfirmBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
            
            document.getElementById('dialogCancelBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });
        });
    }

    static prompt(title, placeholder = '', defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay animate-fadeIn';

            overlay.innerHTML = `
                <div class="modal animate-scaleIn" style="max-width:400px;">
                    <h4 class="mb-4">${title}</h4>
                    <div class="form-group">
                        <input type="text" class="form-input" id="dialogInput" 
                               placeholder="${placeholder}" value="${defaultValue}" autofocus>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-outline btn-block" id="dialogCancelBtn">Cancel</button>
                        <button class="btn btn-primary btn-block" id="dialogConfirmBtn">Submit</button>
                    </div>
                </div>
            `;

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(null);
                }
            });

            document.body.appendChild(overlay);
            
            const input = document.getElementById('dialogInput');
            setTimeout(() => input.focus(), 100);

            document.getElementById('dialogConfirmBtn').addEventListener('click', () => {
                const value = input.value.trim();
                overlay.remove();
                resolve(value || null);
            });
            
            document.getElementById('dialogCancelBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    overlay.remove();
                    resolve(value || null);
                }
            });
        });
    }
}
