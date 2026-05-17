// public/js/pages/tasks.js

/**
 * Tasks Page
 * Shows captcha-based task flow with progress tracking
 * Displays rest day message when tasks are unavailable
 * All styling through CSS classes - zero inline styles
 */
var TasksPage = function(container) {
  this.container = container;
  this.currentCaptcha = null;
  this.isProcessing = false;
};

TasksPage.prototype.render = function() {
  Navbar.render('Tasks', false, [
    { icon: '📋', title: 'History', onclick: 'TasksPage.showHistory' }
  ]);
  BottomNav.render('/tasks');

  this.container.innerHTML =
    '<div class="page">' +
      '<div id="taskContent">' +
        '<div class="skeleton" style="height:300px;"></div>' +
      '</div>' +
    '</div>';

  router.reinjectNavigation();
  this.loadTaskPage();
};

TasksPage.prototype.loadTaskPage = function() {
  var self = this;

  Promise.all([
    API.get('/tasks/today'),
    API.get('/tasks/earnings'),
    fetch(APP_CONFIG.apiUrl + '/config/tasks-schedule').then(function(r) { return r.json(); }).catch(function() { return null; })
  ]).then(function(results) {
    var task = results[0].data;
    var earnings = results[1].data;
    var scheduleData = results[2] ? results[2].data : {};

    if (task.is_rest_day) {
      self.renderRestDay(task, earnings, scheduleData);
      return;
    }

    if (task.is_completed) {
      self.renderCompletedState(task, earnings, scheduleData);
      return;
    }

    self.renderTaskReady(task, earnings, scheduleData);
  }).catch(function(error) {
    document.getElementById('taskContent').innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">⚠️</div>' +
        '<h3 class="empty-state-title">No Active Package</h3>' +
        '<p class="empty-state-description">Deposit to activate a package and start earning</p>' +
        '<button class="btn btn-primary" onclick="router.navigate(\'/packages\')">View Packages</button>' +
      '</div>';
  });
};

TasksPage.prototype.renderRestDay = function(task, earnings, scheduleData) {
  var scheduleDescription = scheduleData.description || task.schedule_description || 'Check schedule for available days';

  document.getElementById('taskContent').innerHTML =
    '<div class="rest-day-alert animate-scaleIn">' +
      '<div class="rest-day-icon">😴</div>' +
      '<h2 class="rest-day-title">Rest Day!</h2>' +
      '<p class="rest-day-message">' + (task.message || 'Tasks are not available today.') + '</p>' +
      '<div class="schedule-info">' +
        '<span>📅</span>' +
        '<span>' + scheduleDescription + '</span>' +
      '</div>' +
      '<p class="rest-day-hint">Share your referral link and earn while you rest!</p>' +
      '<button class="btn btn-primary btn-lg" onclick="router.navigate(\'/team\')">👥 Invite Friends & Earn</button>' +
    '</div>';
};

TasksPage.prototype.renderTaskReady = function(task, earnings, scheduleData) {
  var progress = task.tasks_allocated > 0 ? (task.tasks_completed / task.tasks_allocated) * 100 : 0;

  var instructions = scheduleData.instructions || [
    'Click "Start Task"',
    'Solve the captcha challenge',
    'Watch a short video',
    'Confirm with another captcha',
    'Earn ETB instantly!'
  ];

  var instructionsHtml = instructions.map(function(instruction, index) {
    return '<p class="mb-2">' + (index + 1) + '️⃣ ' + instruction + '</p>';
  }).join('');

  var scheduleFooter = '';
  if (scheduleData.description) {
    scheduleFooter =
      '<div class="schedule-info mt-3" style="margin:12px 0 0 0;">' +
        '<span>📅</span>' +
        '<span>' + scheduleData.description + '</span>' +
      '</div>';
  }

  document.getElementById('taskContent').innerHTML =
    '<div class="card card-gradient text-center mb-4">' +
      '<div class="text-sm text-secondary mb-2">Task Progress</div>' +
      '<div class="task-progress mb-3">' +
        '<div class="progress-bar">' +
          '<div class="progress-fill" style="width:' + progress + '%"></div>' +
        '</div>' +
      '</div>' +
      '<div class="flex justify-between text-sm mb-4">' +
        '<span>' + task.tasks_completed + ' / ' + task.tasks_allocated + ' Tasks</span>' +
        '<span class="text-success">' + this.formatETB(task.earned) + ' ETB Earned</span>' +
      '</div>' +
      '<div class="flex justify-around text-center">' +
        '<div>' +
          '<div class="text-xs text-secondary">Today\'s Earnings</div>' +
          '<div class="text-lg font-bold text-success">' + this.formatETB(earnings.todayEarnings) + ' ETB</div>' +
        '</div>' +
        '<div>' +
          '<div class="text-xs text-secondary">Per Task</div>' +
          '<div class="text-lg font-bold">' + (task.earned > 0 ? this.formatETB(task.earned / (task.tasks_completed || 1)) : '12.00') + ' ETB</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div id="captchaArea" class="card mb-4">' +
      '<div class="text-center">' +
        '<div class="text-4xl mb-3">🔐</div>' +
        '<h4 class="mb-2">Task #' + (task.tasks_completed + 1) + '</h4>' +
        '<p class="text-sm text-secondary mb-4">Click below to start this task</p>' +
        '<button id="startTaskBtn" class="btn btn-primary btn-lg" onclick="TasksPage.startTaskFlow()">▶ Start Task</button>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<h4 class="mb-3">📋 How it works</h4>' +
      '<div class="text-sm text-secondary">' +
        instructionsHtml +
      '</div>' +
      scheduleFooter +
    '</div>';
};

TasksPage.prototype.renderCompletedState = function(task, earnings, scheduleData) {
  var scheduleInfo = '';
  if (scheduleData.description) {
    scheduleInfo =
      '<div class="schedule-info">' +
        '<span>📅</span>' +
        '<span>' + scheduleData.description + '</span>' +
      '</div>';
  } else {
    scheduleInfo = '<p class="text-sm text-secondary">Come back tomorrow for new tasks!</p>';
  }

  document.getElementById('taskContent').innerHTML =
    '<div class="card card-gradient text-center p-8 mb-4">' +
      '<div class="text-6xl mb-4">🎉</div>' +
      '<h3 class="mb-2">All Tasks Complete!</h3>' +
      '<p class="text-secondary mb-4">You\'ve completed all ' + task.tasks_allocated + ' tasks today</p>' +
      '<div class="stats-grid mb-4">' +
        '<div class="card p-3">' +
          '<div class="text-xs text-secondary">Today\'s Earnings</div>' +
          '<div class="text-xl font-bold text-success">' + this.formatETB(earnings.todayEarnings) + ' ETB</div>' +
        '</div>' +
        '<div class="card p-3">' +
          '<div class="text-xs text-secondary">Total Balance</div>' +
          '<div class="text-xl font-bold">' + this.formatETB(earnings.balance) + ' ETB</div>' +
        '</div>' +
      '</div>' +
      scheduleInfo +
    '</div>';
};

TasksPage.startTaskFlow = function() {
  var instance = router.currentPage;
  if (instance.isProcessing) {
    return;
  }
  instance.isProcessing = true;

  var captchaArea = document.getElementById('captchaArea');
  if (!captchaArea) {
    instance.isProcessing = false;
    return;
  }

  captchaArea.innerHTML =
    '<div class="text-center">' +
      '<div class="step-indicator mb-4">' +
        '<span class="step active">1</span>' +
        '<span class="step-line"></span>' +
        '<span class="step">2</span>' +
        '<span class="step-line"></span>' +
        '<span class="step">3</span>' +
      '</div>' +
      '<div class="loader mb-4"><div class="spinner"></div></div>' +
      '<p class="text-sm text-secondary">Generating captcha...</p>' +
    '</div>';

  API.post('/captcha/generate', { taskNumber: 1 })
    .then(function(result) {
      instance.currentCaptcha = result.data;
      instance.renderCaptcha(result.data, 'captcha1');
    })
    .catch(function(error) {
      Dialog.alert(error.message, 'Cannot Start Task', 'warning');
      instance.isProcessing = false;
      instance.render();
    });
};

TasksPage.prototype.renderCaptcha = function(captcha, step) {
  var captchaArea = document.getElementById('captchaArea');
  if (!captchaArea) {
    return;
  }

  var stepNumber = step === 'captcha1' ? '1' : '3';
  var stepTitle = step === 'captcha1' ? 'Solve Captcha' : 'Confirm Captcha';

  var inputHtml = '';
  if (captcha.options) {
    var optionButtons = captcha.options.map(function(option) {
      return '<button class="btn btn-outline captcha-option" onclick="TasksPage.submitAnswer(\'' + captcha.id + '\', \'' + option + '\', \'' + step + '\')">' + option + '</button>';
    }).join('');

    inputHtml = '<div class="grid grid-cols-2 gap-3 mt-4">' + optionButtons + '</div>';
  } else {
    inputHtml =
      '<form id="captchaForm_' + step + '" onsubmit="TasksPage.submitAnswerForm(event, \'' + captcha.id + '\', \'' + step + '\')" class="mt-4">' +
        '<div class="flex gap-2">' +
          '<input type="text" class="form-input" id="captchaInput_' + step + '" placeholder="Type your answer" autocomplete="off" required>' +
          '<button type="submit" class="btn btn-primary">Submit</button>' +
        '</div>' +
      '</form>';
  }

  captchaArea.innerHTML =
    '<div class="animate-scaleIn">' +
      '<div class="step-indicator mb-4">' +
        '<span class="step ' + (stepNumber >= '1' ? 'active' : '') + '">1</span>' +
        '<span class="step-line ' + (stepNumber >= '2' ? 'active' : '') + '"></span>' +
        '<span class="step ' + (stepNumber >= '2' ? 'active' : '') + '">2</span>' +
        '<span class="step-line ' + (stepNumber >= '3' ? 'active' : '') + '"></span>' +
        '<span class="step ' + (stepNumber >= '3' ? 'active' : '') + '">3</span>' +
      '</div>' +
      '<div class="captcha-display mb-4">' +
        '<div class="text-xs text-secondary mb-2">' + stepTitle + '</div>' +
        '<div class="captcha-question">' + captcha.question + '</div>' +
      '</div>' +
      inputHtml +
      '<p class="text-xs text-muted text-center mt-3">Expires in 5 minutes</p>' +
    '</div>';

  setTimeout(function() {
    var input = document.getElementById('captchaInput_' + step);
    if (input) {
      input.focus();
    }
  }, 100);
};

TasksPage.submitAnswerForm = function(event, captchaId, step) {
  event.preventDefault();
  var input = document.getElementById('captchaInput_' + step);
  if (!input) {
    return;
  }
  TasksPage.submitAnswer(captchaId, input.value, step);
};

TasksPage.submitAnswer = function(captchaId, answer, step) {
  var instance = router.currentPage;

  var captchaArea = document.getElementById('captchaArea');
  if (captchaArea) {
    captchaArea.innerHTML =
      '<div class="text-center">' +
        '<div class="loader mb-3"><div class="spinner"></div></div>' +
        '<p class="text-sm text-secondary">Verifying...</p>' +
      '</div>';
  }

  API.post('/captcha/verify', { captchaId: captchaId, answer: answer })
    .then(function(result) {
      if (step === 'captcha1') {
        instance.showAd(result.data);
      } else {
        instance.showTaskComplete(result.data);
      }
    })
    .catch(function(error) {
      Dialog.alert(error.message || 'Incorrect answer. Try again.', 'Verification Failed', 'warning');

      API.post('/captcha/generate', { taskNumber: 1 })
        .then(function(newCaptcha) {
          instance.renderCaptcha(newCaptcha.data, 'captcha1');
        })
        .catch(function() {
          Dialog.alert('Failed to generate new captcha', 'Error', 'error');
        });
    });
};

TasksPage.prototype.showAd = function(taskData) {
  var captchaArea = document.getElementById('captchaArea');
  if (!captchaArea) {
    return;
  }

  var secondsLeft = 15;

  captchaArea.innerHTML =
    '<div class="animate-fadeInUp">' +
      '<div class="step-indicator mb-4">' +
        '<span class="step completed">✓</span>' +
        '<span class="step-line active"></span>' +
        '<span class="step active">2</span>' +
        '<span class="step-line"></span>' +
        '<span class="step">3</span>' +
      '</div>' +
      '<div class="ad-container mb-4">' +
        '<div class="ad-placeholder">' +
          '<div class="text-6xl mb-3">📺</div>' +
          '<h4 class="mb-2">Sponsored Content</h4>' +
          '<p class="text-sm text-secondary mb-3">Please wait <span id="adTimer">' + secondsLeft + '</span> seconds...</p>' +
          '<div class="progress-bar mb-3"><div id="adProgress" class="progress-fill" style="width:0%"></div></div>' +
          '<p class="text-xs text-muted">Rewards support our platform</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  var self = this;
  var timer = setInterval(function() {
    secondsLeft--;

    var timerElement = document.getElementById('adTimer');
    var progressElement = document.getElementById('adProgress');

    if (timerElement) {
      timerElement.textContent = secondsLeft;
    }
    if (progressElement) {
      progressElement.style.width = ((15 - secondsLeft) / 15) * 100 + '%';
    }

    if (secondsLeft <= 0) {
      clearInterval(timer);

      API.post('/captcha/generate', { taskNumber: 2 })
        .then(function(result) {
          self.renderCaptcha(result.data, 'captcha2');
        })
        .catch(function() {
          Dialog.alert('Failed to generate captcha', 'Error', 'error');
        });
    }
  }, 1000);
};

TasksPage.prototype.showTaskComplete = function(result) {
  var captchaArea = document.getElementById('captchaArea');
  if (!captchaArea) {
    return;
  }

  var instance = router.currentPage;
  instance.isProcessing = false;

  var nextButtonHtml = '';
  if (!result.isCompleted) {
    nextButtonHtml = '<button id="nextTaskBtn" class="btn btn-primary btn-lg" onclick="TasksPage.startTaskFlow()">▶ Next Task</button>';
  } else {
    nextButtonHtml =
      '<div class="card card-accent p-3">' +
        '<p class="font-semibold">🎉 All tasks done!</p>' +
        '<p class="text-sm text-secondary">Come back tomorrow</p>' +
      '</div>';
  }

  captchaArea.innerHTML =
    '<div class="animate-scaleIn text-center">' +
      '<div class="step-indicator mb-4">' +
        '<span class="step completed">✓</span>' +
        '<span class="step-line completed"></span>' +
        '<span class="step completed">✓</span>' +
        '<span class="step-line completed"></span>' +
        '<span class="step completed">✓</span>' +
      '</div>' +
      '<div class="text-6xl mb-3">✅</div>' +
      '<h4 class="mb-2">Task Complete!</h4>' +
      '<div class="text-3xl font-extrabold text-success mb-2">+' + this.formatETB(result.earned) + ' ETB</div>' +
      '<p class="text-sm text-secondary mb-4">Tasks: ' + result.tasksCompleted + '/' + result.tasksAllocated + '</p>' +
      nextButtonHtml +
    '</div>';
};

TasksPage.showHistory = function() {
  Modal.show(
    '<div class="modal-header">' +
      '<h3 class="modal-title">Task History</h3>' +
      '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">×</button>' +
    '</div>' +
    '<div id="taskHistoryList"><div class="loader"><div class="spinner"></div></div></div>'
  );

  API.get('/tasks/history?limit=10')
    .then(function(data) {
      var list = data.data;
      var historyContainer = document.getElementById('taskHistoryList');

      if (list.length > 0) {
        historyContainer.innerHTML = list.map(function(log) {
          return '<div class="list-item">' +
            '<div class="list-item-icon">✅</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">Task #' + log.task_number + '</div>' +
              '<div class="list-item-subtitle">' + new Date(log.completed_at).toLocaleString() + '</div>' +
            '</div>' +
            '<div class="list-item-trailing"><span class="text-success font-medium">+' + TasksPage.formatETB(log.earned) + ' ETB</span></div>' +
          '</div>';
        }).join('');
      } else {
        historyContainer.innerHTML = '<div class="empty-state"><p>No tasks completed yet</p></div>';
      }
    });
};

TasksPage.prototype.formatETB = function(amount) {
  var num = Number(amount || 0);

  if (!isFinite(num) || num > 999999999 || num < 0) {
    return '0.00';
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

TasksPage.formatETB = function(amount) {
  var num = Number(amount || 0);

  if (!isFinite(num) || num > 999999999 || num < 0) {
    return '0.00';
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

TasksPage.prototype.unmount = function() {
  this.isProcessing = false;
};