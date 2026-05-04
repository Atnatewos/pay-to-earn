class GiftCodePage {
    constructor(container) { this.container = container; }

    render() {
        Navbar.render('Gift Code', true);
        document.querySelector('.bottom-nav')?.remove();

        this.container.innerHTML = `
            <div class="page animate-fadeInUp">
                <div class="card card-gradient text-center mb-4">
                    <div class="text-5xl mb-3">🎁</div>
                    <h3 class="mb-2">Redeem Gift Code</h3>
                    <p class="text-sm text-secondary">Enter your code to receive bonus ETB</p>
                </div>
                <form id="giftCodeForm" class="card">
                    <div class="form-group">
                        <label class="form-label">Gift Code</label>
                        <input type="text" class="form-input" id="giftCode" 
                               placeholder="EARN-XXXXXXXX" 
                               style="text-transform: uppercase; font-size: 1.2rem; text-align: center; letter-spacing: 2px;"
                               maxlength="13" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block btn-lg">🎁 Redeem Code</button>
                </form>
            </div>
        `;

        document.getElementById('giftCodeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('giftCode').value;
            try {
                const result = await API.post('/giftcodes/redeem', { code });
                Toast.show(result.message || 'Code redeemed!', 'success');
                setTimeout(() => router.navigate('/home'), 1500);
            } catch (error) {
                Toast.show(error.message, 'error');
            }
        });
    }

    unmount() {}
}
