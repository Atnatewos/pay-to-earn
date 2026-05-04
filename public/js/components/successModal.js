class SuccessModal {
    static show(title, message, details = [], buttonText = 'OK', buttonAction = null) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay animate-fadeIn';

        overlay.innerHTML = `
            <div class="modal animate-scaleIn" style="max-width:420px; text-align:center;">
                <div class="success-animation mb-4">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style="width:80px;height:80px;margin:0 auto;">
                        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none" stroke="#10B981" stroke-width="3"/>
                        <path class="checkmark-check" fill="none" stroke="#10B981" stroke-width="3" d="M14 27l7 7 16-16"/>
                    </svg>
                </div>
                <h3 class="mb-2">${title}</h3>
                <p class="text-secondary mb-4">${message}</p>
                ${details.length > 0 ? `
                    <div class="card mb-4" style="background:var(--color-success-bg);">
                        ${details.map(d => `
                            <div class="flex justify-between py-2">
                                <span class="text-sm text-secondary">${d.label}</span>
                                <span class="text-sm font-semibold">${d.value}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="btn btn-success btn-block" id="successOkBtn">${buttonText}</button>
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (buttonAction) buttonAction();
            }
        });

        document.body.appendChild(overlay);
        
        document.getElementById('successOkBtn').addEventListener('click', () => {
            overlay.remove();
            if (buttonAction) buttonAction();
        });
    }
}
