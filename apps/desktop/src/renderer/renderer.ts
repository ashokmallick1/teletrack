// Renderer Script for TeleTrack Desktop Agent
const api = (window as any).teletrackDesktop;

// Elements
const viewLogin = document.getElementById('view-login')!;
const viewDashboard = document.getElementById('view-dashboard')!;
const formLogin = document.getElementById('form-login') as HTMLFormElement;
const inputEmail = document.getElementById('input-email') as HTMLInputElement;
const inputPassword = document.getElementById('input-password') as HTMLInputElement;
const inputOrgCode = document.getElementById('input-org-code') as HTMLInputElement;
const inputApiUrl = document.getElementById('input-api-url') as HTMLInputElement;
const loginError = document.getElementById('login-error')!;
const btnSubmitLogin = document.getElementById('btn-submit-login') as HTMLButtonElement;

const txtEmployeeName = document.getElementById('txt-employee-name')!;
const txtOrgName = document.getElementById('txt-org-name')!;
const txtStatus = document.getElementById('txt-status')!;
const statusPill = document.getElementById('status-pill')!;

const btnClockToggle = document.getElementById('btn-clock-toggle')!;
const btnClockIcon = document.getElementById('btn-clock-icon')!;
const btnClockLabel = document.getElementById('btn-clock-label')!;
const btnBreakToggle = document.getElementById('btn-break-toggle')!;
const btnBreakLabel = document.getElementById('btn-break-label')!;

const txtLiveApp = document.getElementById('txt-live-app')!;
const txtLiveTitle = document.getElementById('txt-live-title')!;
const liveCategoryBadge = document.getElementById('live-category-badge')!;

const valWorkTime = document.getElementById('val-work-time')!;
const valProductive = document.getElementById('val-productive')!;
const valIdle = document.getElementById('val-idle')!;
const btnLogout = document.getElementById('btn-logout')!;

const btnMinimize = document.getElementById('btn-minimize')!;
const btnClose = document.getElementById('btn-close')!;

let currentState: any = null;

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function updateUI(state: any) {
  currentState = state;

  if (!state.isEnrolled) {
    viewLogin.classList.remove('hidden');
    viewDashboard.classList.add('hidden');
    return;
  }

  viewLogin.classList.add('hidden');
  viewDashboard.classList.remove('hidden');

  txtEmployeeName.textContent = state.config.employeeName || 'Telecaller';
  txtOrgName.textContent = state.config.organizationName || 'Company';

  const status = state.workStatus || 'WORKING';
  txtStatus.textContent = status;
  statusPill.className = `badge badge-${status.toLowerCase()}`;

  if (status === 'WORKING') {
    btnClockIcon.textContent = '⏸';
    btnClockLabel.textContent = 'Clock Out / Pause';
    btnBreakLabel.textContent = '☕ Take a Break';
  } else if (status === 'ON_BREAK') {
    btnClockIcon.textContent = '▶';
    btnClockLabel.textContent = 'Resume Work';
    btnBreakLabel.textContent = '✓ End Break';
  } else {
    btnClockIcon.textContent = '▶';
    btnClockLabel.textContent = 'Clock In / Start';
    btnBreakLabel.textContent = '☕ Take a Break';
  }

  if (state.liveSample) {
    txtLiveApp.textContent = `${state.liveSample.processName}.exe`;
    txtLiveTitle.textContent = state.liveSample.windowTitle || '(Background / System Window)';

    const cat = state.liveSample.category || 'PRODUCTIVE';
    liveCategoryBadge.textContent = cat;
    liveCategoryBadge.className = `badge-cat badge-cat-${cat.toLowerCase()}`;
  }

  if (state.todayStats) {
    valWorkTime.textContent = formatSeconds(state.todayStats.activeSeconds);
    valProductive.textContent = `${state.todayStats.productivePercentage}%`;
    valIdle.textContent = formatSeconds(state.todayStats.idleSeconds);
  }
}

// Initial state load
api.getState().then(updateUI);

// Realtime state push
api.onStateUpdate(updateUI);

// Titlebar buttons
btnMinimize.addEventListener('click', () => api.minimizeToTray());
btnClose.addEventListener('click', () => api.minimizeToTray());

// Form submit
formLogin.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  btnSubmitLogin.disabled = true;
  btnSubmitLogin.textContent = 'Connecting...';

  try {
    await api.login({
      email: inputEmail.value.trim(),
      password: inputPassword.value,
      orgCode: inputOrgCode.value.trim(),
      apiUrl: inputApiUrl.value.trim()
    });
  } catch (err: any) {
    loginError.textContent = err.message || 'Login failed';
    loginError.classList.remove('hidden');
  } finally {
    btnSubmitLogin.disabled = false;
    btnSubmitLogin.textContent = 'Connect & Start Tracking';
  }
});

// Clock Actions
btnClockToggle.addEventListener('click', async () => {
  if (!currentState) return;
  const isWorking = currentState.workStatus === 'WORKING';
  await api.clockAction(isWorking ? 'CLOCK_OUT' : 'CLOCK_IN');
});

btnBreakToggle.addEventListener('click', async () => {
  if (!currentState) return;
  const isOnBreak = currentState.workStatus === 'ON_BREAK';
  await api.clockAction(isOnBreak ? 'BREAK_END' : 'BREAK_START');
});

// Logout
btnLogout.addEventListener('click', async () => {
  if (confirm('Are you sure you want to disconnect this machine?')) {
    await api.logout();
  }
});
