class RegisterPage {
    constructor(container) { this.container = container; }
    render() {
        document.querySelector('.bottom-nav')?.remove();
        document.querySelector('.navbar')?.remove();
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref') || '';

        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card card-glass animate-scaleIn">
                    <div class="auth-header">
                        <div class="auth-icon">🚀</div>
                        <h1>Create Account</h1>
                        <p>Start earning today</p>
                    </div>
                    <form id="registerForm" class="auth-form">
                        <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="fullName" placeholder="Enter your full name" required></div>
                        <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" class="form-input" id="phone" placeholder="09XXXXXXXX" required></div>
                        <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="password" placeholder="Min 6 characters" required minlength="6"></div>
                        <div class="form-group"><label class="form-label">Referral Code (Optional)</label><input type="text" class="form-input" id="referralCode" placeholder="Enter code" value="${refCode}"></div>
                        <button type="submit" class="btn btn-primary btn-block btn-lg">Create Account</button>
                    </form>
                    <div class="auth-footer"><p>Have an account? <a onclick="router.navigate('/login')" class="text-primary">Sign In</a></p></div>
                </div>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const fullName = document.getElementById('fullName').value;
            const referralCode = document.getElementById('referralCode').value;
            try {
                const data = await API.post('/auth/register', { phone, password, fullName, referralCode });
                store.login(data.data.user, data.data.token);
                SuccessModal.show('Welcome! 🎉', 'Your account has been created. You have a free 3-day Intern package.', [
                    { label: 'Package', value: 'Intern (Free 3 days)' },
                    { label: 'Tasks', value: '5 per day' },
                ], 'Start Earning', () => router.navigate('/home'));
            } catch (error) { Dialog.alert(error.message, 'Registration Failed', 'error'); }
        });
    }
    unmount() {}
}
