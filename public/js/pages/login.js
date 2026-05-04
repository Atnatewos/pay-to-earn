// public/js/pages/login.js
class LoginPage {
    constructor(container) {
        this.container = container;
    }

    render() {
        document.querySelector('.bottom-nav')?.remove();
        document.querySelector('.navbar')?.remove();

        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card card-glass">
                    <div class="auth-header">
                        <div class="auth-icon">💰</div>
                        <h1>Welcome Back</h1>
                        <p>Sign in to continue earning</p>
                    </div>

                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label class="form-label">Phone Number</label>
                            <input type="tel" class="form-input" id="phone" 
                                   placeholder="Enter your phone" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" id="password" 
                                   placeholder="Enter password" required>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg">
                            Sign In
                        </button>
                    </form>

                    <div class="auth-footer">
                        <p>Don't have an account? 
                            <a onclick="router.navigate('/register')" class="text-primary">Register</a>
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            try {
                const data = await API.post('/auth/login', { phone, password });
                store.login(data.data.user, data.data.token);
                Toast.show('Login successful');
                router.navigate('/home');
            } catch (error) {
                Toast.show(error.message, 'error');
            }
        });
    }

    unmount() {}
}