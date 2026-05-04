// public/js/pages/tasks.js
class TasksPage {
    constructor(container) {
        this.container = container;
        this.currentCaptcha = null;
        this.isProcessing = false;
    }

    async render() {
        Navbar.render('Tasks', false, [
            { icon: '📋', title: 'History', onclick: 'TasksPage.showHistory()' }
        ]);
        BottomNav.render('/tasks');

        this.container.innerHTML = `
            <div class="page">
                <div id="taskContent">
                    <div class="skeleton" style="height:300px;"></div>
                </div>
            </div>
        `;

        router.reinjectNavigation();
        await this.loadTaskPage();
    }

    async loadTaskPage() {
        try {
            const [task, earnings] = await Promise.all([
                API.get('/tasks/today'),
                API.get('/tasks/earnings')
            ]);

            const t = task.data;
            const e = earnings.data;

            if (t.is_completed) {
                this.renderCompletedState(t, e);
                return;
            }

            this.renderTaskReady(t, e);
        } catch (error) {
            document.getElementById('taskContent').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">No Active Package</h3>
                    <p class="empty-state-description">Deposit to activate a package and start earning</p>
                    <button class="btn btn-primary" onclick="router.navigate('/packages')">
                        View Packages
                    </button>
                </div>
            `;
        }
    }

    renderTaskReady(t, e) {
        const progress = t.tasks_allocated > 0 
            ? (t.tasks_completed / t.tasks_allocated) * 100 
            : 0;

        document.getElementById('taskContent').innerHTML = `
            <!-- Progress Header -->
            <div class="card card-gradient text-center mb-4">
                <div class="text-sm text-secondary mb-2">Task Progress</div>
                <div class="task-progress mb-3">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>
                </div>
                <div class="flex justify-between text-sm mb-4">
                    <span>${t.tasks_completed} / ${t.tasks_allocated} Tasks</span>
                    <span class="text-success">${this.formatETB(t.earned)} ETB Earned</span>
                </div>

                <div class="flex justify-around text-center">
                    <div>
                        <div class="text-xs text-secondary">Today's Earnings</div>
                        <div class="text-lg font-bold text-success">${this.formatETB(e.todayEarnings)} ETB</div>
                    </div>
                    <div>
                        <div class="text-xs text-secondary">Per Task</div>
                        <div class="text-lg font-bold">${t.earned > 0 ? this.formatETB(t.earned / (t.tasks_completed || 1)) : '12.00'} ETB</div>
                    </div>
                </div>
            </div>

            <!-- Captcha Area -->
            <div id="captchaArea" class="card mb-4">
                <div class="text-center">
                    <div class="text-4xl mb-3">🔐</div>
                    <h4 class="mb-2">Task #${t.tasks_completed + 1}</h4>
                    <p class="text-sm text-secondary mb-4">Click below to start this task</p>
                    
                    <button id="startTaskBtn" class="btn btn-primary btn-lg" onclick="TasksPage.startTaskFlow()">
                        ▶ Start Task
                    </button>
                </div>
            </div>

            <!-- Info Card -->
            <div class="card">
                <h4 class="mb-3">📋 How it works</h4>
                <div class="text-sm text-secondary">
                    <p class="mb-2">1️⃣ Click "Start Task"</p>
                    <p class="mb-2">2️⃣ Solve the captcha challenge</p>
                    <p class="mb-2">3️⃣ Watch a short video</p>
                    <p class="mb-2">4️⃣ Confirm with another captcha</p>
                    <p>✅ Earn ETB instantly!</p>
                </div>
            </div>
        `;
    }

    renderCompletedState(t, e) {
        document.getElementById('taskContent').innerHTML = `
            <div class="card card-gradient text-center p-8 mb-4">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="mb-2">All Tasks Complete!</h3>
                <p class="text-secondary mb-4">You've completed all ${t.tasks_allocated} tasks today</p>
                
                <div class="stats-grid mb-4">
                    <div class="card p-3">
                        <div class="text-xs text-secondary">Today's Earnings</div>
                        <div class="text-xl font-bold text-success">${this.formatETB(e.todayEarnings)} ETB</div>
                    </div>
                    <div class="card p-3">
                        <div class="text-xs text-secondary">Total Balance</div>
                        <div class="text-xl font-bold">${this.formatETB(e.balance)} ETB</div>
                    </div>
                </div>

                <p class="text-sm text-secondary">Come back tomorrow at 00:01 for new tasks!</p>
            </div>
        `;
    }

    static async startTaskFlow() {
        const instance = router.currentPage;
        if (instance.isProcessing) return;
        instance.isProcessing = true;

        const captchaArea = document.getElementById('captchaArea');
        
        try {
            // Step 1: Generate first captcha
            captchaArea.innerHTML = `
                <div class="text-center">
                    <div class="step-indicator mb-4">
                        <span class="step active">1</span>
                        <span class="step-line"></span>
                        <span class="step">2</span>
                        <span class="step-line"></span>
                        <span class="step">3</span>
                    </div>
                    <div class="loader mb-4"><div class="spinner"></div></div>
                    <p class="text-sm text-secondary">Generating captcha...</p>
                </div>
            `;

            const captcha1 = await API.post('/captcha/generate', { taskNumber: 1 });
            instance.currentCaptcha = captcha1.data;

            // Step 2: Show first captcha
            instance.renderCaptcha(captcha1.data, 'captcha1');

        } catch (error) {
            Toast.show(error.message, 'error');
            instance.isProcessing = false;
            instance.render();
        }
    }

    renderCaptcha(captcha, step) {
        const captchaArea = document.getElementById('captchaArea');
        const stepNum = step === 'captcha1' ? '1' : '3';
        const stepTitle = step === 'captcha1' ? 'Solve Captcha' : 'Confirm Captcha';

        let inputHtml = '';
        if (captcha.options) {
            inputHtml = `
                <div class="grid grid-cols-2 gap-3 mt-4">
                    ${captcha.options.map(opt => `
                        <button class="btn btn-outline captcha-option" 
                                onclick="TasksPage.submitAnswer('${captcha.id}', '${opt}', '${step}')">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            inputHtml = `
                <form id="captchaForm_${step}" onsubmit="TasksPage.submitAnswerForm(event, '${captcha.id}', '${step}')" class="mt-4">
                    <div class="flex gap-2">
                        <input type="text" class="form-input" id="captchaInput_${step}" 
                               placeholder="Type your answer" autocomplete="off" required>
                        <button type="submit" class="btn btn-primary">Submit</button>
                    </div>
                </form>
            `;
        }

        captchaArea.innerHTML = `
            <div class="animate-scaleIn">
                <div class="step-indicator mb-4">
                    <span class="step ${stepNum >= '1' ? 'active' : ''}">1</span>
                    <span class="step-line ${stepNum >= '2' ? 'active' : ''}"></span>
                    <span class="step ${stepNum >= '2' ? 'active' : ''}">2</span>
                    <span class="step-line ${stepNum >= '3' ? 'active' : ''}"></span>
                    <span class="step ${stepNum >= '3' ? 'active' : ''}">3</span>
                </div>

                <div class="captcha-display mb-4">
                    <div class="text-xs text-secondary mb-2">${stepTitle}</div>
                    <div class="captcha-question">
                        ${captcha.question}
                    </div>
                </div>

                ${inputHtml}

                <p class="text-xs text-muted text-center mt-3">
                    Expires in 5 minutes
                </p>
            </div>
        `;

        // Focus input if it exists
        setTimeout(() => {
            const input = document.getElementById(`captchaInput_${step}`);
            if (input) input.focus();
        }, 100);
    }

    static async submitAnswerForm(event, captchaId, step) {
        event.preventDefault();
        const input = document.getElementById(`captchaInput_${step}`);
        if (!input) return;
        await TasksPage.submitAnswer(captchaId, input.value, step);
    }

    static async submitAnswer(captchaId, answer, step) {
        const instance = router.currentPage;
        
        try {
            const captchaArea = document.getElementById('captchaArea');
            
            // Show verifying state
            captchaArea.innerHTML = `
                <div class="text-center">
                    <div class="loader mb-3"><div class="spinner"></div></div>
                    <p class="text-sm text-secondary">Verifying...</p>
                </div>
            `;

            // Verify captcha
            const verifyResult = await API.post('/captcha/verify', { captchaId, answer });

            if (step === 'captcha1') {
                // Captcha 1 correct → Show ad
                instance.showAd(verifyResult.data);
            } else {
                // Captcha 2 correct → Task complete
                instance.showTaskComplete(verifyResult.data);
            }

        } catch (error) {
            Toast.show(error.message || 'Incorrect answer. Try again.', 'error');
            // Reload captcha
            const newCaptcha = await API.post('/captcha/generate', { taskNumber: 1 });
            instance.renderCaptcha(newCaptcha.data, 'captcha1');
        }
    }

    showAd(taskData) {
        const captchaArea = document.getElementById('captchaArea');
        let secondsLeft = 15;
        
        captchaArea.innerHTML = `
            <div class="animate-fadeInUp">
                <div class="step-indicator mb-4">
                    <span class="step completed">✓</span>
                    <span class="step-line active"></span>
                    <span class="step active">2</span>
                    <span class="step-line"></span>
                    <span class="step">3</span>
                </div>

                <div class="ad-container mb-4">
                    <div class="ad-placeholder">
                        <div class="text-6xl mb-3">📺</div>
                        <h4 class="mb-2">Sponsored Content</h4>
                        <p class="text-sm text-secondary mb-3">
                            Please wait <span id="adTimer">15</span> seconds...
                        </p>
                        <div class="progress-bar mb-3">
                            <div id="adProgress" class="progress-fill" style="width:0%"></div>
                        </div>
                        <p class="text-xs text-muted">
                            Rewards support our platform
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Countdown timer
        const timer = setInterval(async () => {
            secondsLeft--;
            const timerEl = document.getElementById('adTimer');
            const progressEl = document.getElementById('adProgress');
            
            if (timerEl) timerEl.textContent = secondsLeft;
            if (progressEl) progressEl.style.width = `${((15 - secondsLeft) / 15) * 100}%`;
            
            if (secondsLeft <= 0) {
                clearInterval(timer);
                // Show second captcha
                try {
                    const captcha2 = await API.post('/captcha/generate', { taskNumber: 2 });
                    this.renderCaptcha(captcha2.data, 'captcha2');
                } catch (error) {
                    Toast.show('Failed to generate captcha', 'error');
                }
            }
        }, 1000);
    }

    showTaskComplete(result) {
        const captchaArea = document.getElementById('captchaArea');
        const instance = router.currentPage;
        instance.isProcessing = false;
        
        captchaArea.innerHTML = `
            <div class="animate-scaleIn text-center">
                <div class="step-indicator mb-4">
                    <span class="step completed">✓</span>
                    <span class="step-line completed"></span>
                    <span class="step completed">✓</span>
                    <span class="step-line completed"></span>
                    <span class="step completed">✓</span>
                </div>

                <div class="text-6xl mb-3">✅</div>
                <h4 class="mb-2">Task Complete!</h4>
                <div class="text-3xl font-extrabold text-success mb-2">
                    +${this.formatETB(result.earned)} ETB
                </div>
                <p class="text-sm text-secondary mb-4">
                    Tasks: ${result.tasksCompleted}/${result.tasksAllocated}
                </p>

                ${!result.isCompleted ? `
                    <button id="nextTaskBtn" class="btn btn-primary btn-lg" 
                            onclick="TasksPage.startTaskFlow()">
                        ▶ Next Task
                    </button>
                ` : `
                    <div class="card card-accent p-3">
                        <p class="font-semibold">🎉 All tasks done!</p>
                        <p class="text-sm text-secondary">Come back tomorrow</p>
                    </div>
                `}
            </div>
        `;
    }

    static showHistory() {
        Modal.show(`
            <div class="modal-header">
                <h3 class="modal-title">Task History</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div id="taskHistoryList">
                <div class="loader"><div class="spinner"></div></div>
            </div>
        `);

        API.get('/tasks/history?limit=10').then(data => {
            const list = data.data;
            document.getElementById('taskHistoryList').innerHTML = list.length > 0 
                ? list.map(log => `
                    <div class="list-item">
                        <div class="list-item-icon">✅</div>
                        <div class="list-item-content">
                            <div class="list-item-title">Task #${log.task_number}</div>
                            <div class="list-item-subtitle">${new Date(log.completed_at).toLocaleString()}</div>
                        </div>
                        <div class="list-item-trailing">
                            <span class="text-success font-medium">+${this.formatETB(log.earned)} ETB</span>
                        </div>
                    </div>
                `).join('')
                : '<div class="empty-state"><p>No tasks completed yet</p></div>';
        });
    }

    formatETB(amount) {
        return Number(amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).replace(/,/g, ',');
    }

    unmount() {
        this.isProcessing = false;
    }
}

// Make formatETB static too
TasksPage.formatETB = function(amount) {
    return Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};