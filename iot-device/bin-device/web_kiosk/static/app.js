// ============================================================
// SBAY Smart Bin - Eco-Tech Web Kiosk Client Script
// จัดการ WebSocket, State, Touch Interaction, Audio และ Mascot Animation
// ============================================================

(function () {
  'use strict';

  // State Management
  const state = {
    currentPage: 'idle',
    phoneNumber: '',
    itemsList: [],
    wasteLevels: {
      PLASTIC_BOTTLE: 0.0,
      ALUMINUM_CAN: 0.0,
      BEVERAGE_CARTON: 0.0
    },
    inactivityTimer: null,
    inactivitySec: 30,
    ws: null,
    isWaking: false,
    mascotBlinkTimer: null
  };

  // Sound Synthesizer (Web Audio API - ไม่มีดีเลย์ ไม่ต้องใช้ไฟล์ MP3 ภายนอก)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type = 'sine', duration = 0.08, vol = 0.15) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio might be blocked before first interaction
    }
  }

  function playKeyClick() {
    playTone(650, 'triangle', 0.04, 0.12);
  }

  function playSuccessChime() {
    setTimeout(() => playTone(523.25, 'sine', 0.15, 0.2), 0);   // C5
    setTimeout(() => playTone(659.25, 'sine', 0.15, 0.2), 120); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.25, 0.2), 240); // G5
  }

  function playStartleChime() {
    playTone(880, 'sine', 0.12, 0.22);
    setTimeout(() => playTone(1174.66, 'sine', 0.18, 0.22), 90);
  }

  // ============================================================
  // WEBSOCKET COMMUNICATION (Auto-reconnect)
  // ============================================================
  function initWebSocket() {
    const loc = window.location;
    const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${loc.host}/ws`;

    console.log('[WS] Connecting to', wsUrl);
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      console.log('[WS] Connected to Python Controller');
      updateServerStatus(true);
      // Ask initial state
      sendMessage({ action: 'get_status' });
    };

    state.ws.onclose = () => {
      console.warn('[WS] Connection closed, retrying in 2s...');
      updateServerStatus(false);
      setTimeout(initWebSocket, 2000);
    };

    state.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('[WS] Failed to parse message:', event.data, e);
      }
    };
  }

  function sendMessage(payload) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(payload));
    }
  }

  function handleServerMessage(msg) {
    console.log('[WS IN]', msg.event, msg);

    switch (msg.event) {
      case 'waste_levels':
        updateWasteLevels(msg.data);
        break;

      case 'server_status':
        updateServerStatus(msg.online);
        break;

      case 'show_welcome':
        showWelcomeScreen(msg.name || 'User', msg.alert || null);
        break;

      case 'show_detecting':
        showDetectingScreen();
        break;

      case 'item_detected':
        addItemToList(msg.type, msg.size_ml, msg.score);
        break;

      case 'status_update':
        updateDetectStatus(msg.message, msg.color);
        break;

      case 'camera_frame':
        updateCameraFeed(msg.image);
        break;

      case 'show_sending':
        showSendingScreen();
        break;

      case 'show_result':
        showResultScreen(msg.total_items, msg.total_ml, msg.total_score, msg.success);
        break;

      case 'show_idle':
        showIdleScreen();
        break;

      case 'show_phone':
        showPhoneScreen();
        break;

      case 'show_alert':
        showAlertModal(msg.title, msg.message, msg.button_text, msg.type);
        break;

      case 'phone_checking':
        updatePhoneCheckingState(msg.checking);
        break;
    }
  }

  // ============================================================
  // NAVIGATION & SCREEN SWITCHING
  // ============================================================
  const screens = {
    idle: document.getElementById('screen-idle'),
    phone: document.getElementById('screen-phone'),
    welcome: document.getElementById('screen-welcome'),
    detecting: document.getElementById('screen-detecting'),
    sending: document.getElementById('screen-sending'),
    result: document.getElementById('screen-result')
  };

  const ambientLayer = document.getElementById('ambient-layer');

  function switchScreen(screenKey) {
    state.currentPage = screenKey;
    resetInactivityTimer();

    // Toggle active classes
    Object.keys(screens).forEach((key) => {
      if (screens[key]) {
        screens[key].classList.toggle('active', key === screenKey);
      }
    });

    // Idle has white background, other screens show dark ambient layer
    if (ambientLayer) {
      ambientLayer.style.display = screenKey === 'idle' ? 'none' : 'block';
    }

    // Stop/start mascot blinking as needed
    if (screenKey === 'phone') {
      startMascotBlinking();
    } else {
      stopMascotBlinking();
    }
  }

  // ============================================================
  // SCREEN 1: IDLE (Sleeping & Waking Face)
  // ============================================================
  const idleTapTarget = document.getElementById('idle-tap-target');
  const mascotFace = document.getElementById('mascot-face');
  const mascotMouth = document.getElementById('mascot-mouth');
  const floatingZ = document.getElementById('floating-z');
  const idlePromptText = document.getElementById('idle-prompt-text');

  function showIdleScreen() {
    state.isWaking = false;
    state.phoneNumber = '';
    state.itemsList = [];
    updatePhoneDisplay();

    // Reset mascot face to deep sleep
    if (mascotFace) mascotFace.classList.remove('awake');
    if (mascotMouth) {
      mascotMouth.className = 'mascot-mouth mouth-sleep';
    }
    if (floatingZ) floatingZ.style.display = 'block';
    if (idlePromptText) idlePromptText.textContent = 'แตะเพื่อเริ่ม';

    switchScreen('idle');
  }

  // Tap to startle awake
  if (idleTapTarget) {
    idleTapTarget.addEventListener('click', handleIdleTap);
    idleTapTarget.addEventListener('touchstart', handleIdleTap, { passive: true });
  }

  function handleIdleTap() {
    if (state.currentPage !== 'idle' || state.isWaking) return;
    state.isWaking = true;
    playStartleChime();

    // 1. Hide floating Z's
    if (floatingZ) floatingZ.style.display = 'none';

    // 2. Startle reaction: open eyes, startled mouth
    if (mascotFace) mascotFace.classList.add('awake');
    if (mascotMouth) mascotMouth.className = 'mascot-mouth mouth-startle';
    if (idlePromptText) idlePromptText.textContent = 'ยินดีต้อนรับครับ!';

    // 3. Settle into sweet smile
    setTimeout(() => {
      if (mascotMouth) mascotMouth.className = 'mascot-mouth mouth-smile';
    }, 280);

    // 4. Smooth transition to Phone Screen
    setTimeout(() => {
      showPhoneScreen();
      sendMessage({ action: 'tap_to_wake' });
    }, 600);
  }

  // ============================================================
  // WASTE GAUGES (3 Tubes)
  // ============================================================
  function updateWasteLevels(levels) {
    if (!levels) return;
    state.wasteLevels = { ...state.wasteLevels, ...levels };

    const mapping = {
      PLASTIC_BOTTLE: { fillId: 'gauge-fill-plastic', pctId: 'gauge-pct-plastic' },
      ALUMINUM_CAN: { fillId: 'gauge-fill-can', pctId: 'gauge-pct-can' },
      BEVERAGE_CARTON: { fillId: 'gauge-fill-carton', pctId: 'gauge-pct-carton' }
    };

    Object.keys(mapping).forEach((key) => {
      const pct = Math.max(0, Math.min(100, Math.round(state.wasteLevels[key] || 0)));
      const elem = mapping[key];
      const fillEl = document.getElementById(elem.fillId);
      const pctEl = document.getElementById(elem.pctId);

      if (fillEl) fillEl.style.height = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
    });
  }

  // ============================================================
  // SCREEN 2: PHONE INPUT
  // ============================================================
  const phoneDisplayText = document.getElementById('phone-display-text');
  const btnGuest = document.getElementById('btn-guest');
  const phoneMascotImg = document.getElementById('phone-mascot-img');
  const serverStatusBadge = document.getElementById('server-status-badge');

  function showPhoneScreen() {
    state.phoneNumber = '';
    updatePhoneDisplay();
    switchScreen('phone');
  }

  function updatePhoneDisplay() {
    if (!phoneDisplayText) return;
    const digits = state.phoneNumber;

    if (digits.length === 0) {
      phoneDisplayText.textContent = '0XX-XXX-XXXX';
      phoneDisplayText.classList.remove('has-value');
      return;
    }

    phoneDisplayText.classList.add('has-value');

    // Format as 08X-XXX-XXXX
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 3 || i === 6) formatted += '-';
      formatted += digits[i];
    }
    phoneDisplayText.textContent = formatted;
  }

  // Numpad Touch Clicks
  document.querySelectorAll('.num-key[data-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (state.phoneNumber.length < 10) {
        state.phoneNumber += key;
        updatePhoneDisplay();
        playKeyClick();
        resetInactivityTimer();
      }
    });
  });

  const btnDelete = document.getElementById('btn-phone-delete');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (state.phoneNumber.length > 0) {
        state.phoneNumber = state.phoneNumber.slice(0, -1);
        updatePhoneDisplay();
        playKeyClick();
        resetInactivityTimer();
      }
    });
  }

  const btnConfirm = document.getElementById('btn-phone-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      if (state.phoneNumber.length === 10 && state.phoneNumber.startsWith('0')) {
        playSuccessChime();
        sendMessage({ action: 'submit_phone', phone: state.phoneNumber });
      } else {
        playTone(300, 'sawtooth', 0.15, 0.2); // Error tone
        alertHintAnimation();
        showAlertModal(
          'ตรวจสอบหมายเลขโทรศัพท์',
          'กรุณากรอกหมายเลขโทรศัพท์ให้ครบ 10 หลัก\nและขึ้นต้นด้วยเลข 0 (เช่น 08X-XXX-XXXX)',
          'ตกลง',
          'warning'
        );
      }
    });
  }

  if (btnGuest) {
    btnGuest.addEventListener('click', () => {
      playKeyClick();
      state.phoneNumber = '';
      sendMessage({ action: 'guest_mode' });
    });
  }

  // ============================================================
  // ALERT MODAL LOGIC (แจ้งเตือนขนาดใหญ่)
  // ============================================================
  const alertModal = document.getElementById('alert-modal');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const btnModalClose = document.getElementById('btn-modal-close');

  function showAlertModal(title, message, buttonText, type) {
    if (!alertModal) return;
    if (modalTitle) modalTitle.textContent = title || 'ข้อความแจ้งเตือน';
    if (modalMessage) modalMessage.textContent = message || '';
    if (btnModalClose) btnModalClose.textContent = buttonText || 'ตกลง';
    if (modalIcon) {
      if (type === 'success') {
        modalIcon.className = 'modal-icon-badge success';
        modalIcon.textContent = '✓';
      } else {
        modalIcon.className = 'modal-icon-badge';
        modalIcon.textContent = '⚠️';
      }
    }
    alertModal.classList.remove('hidden');
  }

  function hideAlertModal() {
    if (!alertModal) return;
    alertModal.classList.add('hidden');
    sendMessage({ action: 'close_alert' });
  }

  if (btnModalClose) {
    btnModalClose.addEventListener('click', hideAlertModal);
  }
  if (alertModal) {
    alertModal.addEventListener('click', (e) => {
      if (e.target === alertModal) {
        hideAlertModal();
      }
    });
  }

  function updatePhoneCheckingState(isChecking) {
    if (serverStatusBadge) {
      if (isChecking) {
        serverStatusBadge.innerHTML = '<span class="status-dot" style="background:#B45309"></span> ⏳ กำลังตรวจสอบข้อมูล...';
        serverStatusBadge.style.color = '#B45309';
        serverStatusBadge.style.background = '#FEF3C7';
      } else {
        updateServerStatus(state.serverOnline);
      }
    }
  }

  function alertHintAnimation() {
    const hint = document.querySelector('.phone-hint-pill');
    if (hint) {
      hint.style.transform = 'translateX(-8px)';
      setTimeout(() => hint.style.transform = 'translateX(8px)', 80);
      setTimeout(() => hint.style.transform = 'translateX(-4px)', 160);
      setTimeout(() => hint.style.transform = 'translateX(0)', 240);
    }
  }

  function updateServerStatus(online) {
    if (!serverStatusBadge) return;
    const dot = serverStatusBadge.querySelector('.status-dot');
    if (online) {
      if (dot) dot.className = 'status-dot online';
      serverStatusBadge.innerHTML = '<span class="status-dot online"></span> ออนไลน์';
      serverStatusBadge.style.color = '#2A824C';
      serverStatusBadge.style.background = '#E3F2C7';
    } else {
      if (dot) dot.className = 'status-dot offline';
      serverStatusBadge.innerHTML = '<span class="status-dot offline"></span> ออฟไลน์';
      serverStatusBadge.style.color = '#EF4444';
      serverStatusBadge.style.background = '#FEE2E2';
    }
  }

  // Mascot Standing Blinking
  function startMascotBlinking() {
    stopMascotBlinking();
    const delay = Math.floor(Math.random() * 2000) + 2500;
    state.mascotBlinkTimer = setTimeout(() => {
      playMascotBlink();
      startMascotBlinking();
    }, delay);
  }

  function stopMascotBlinking() {
    if (state.mascotBlinkTimer) {
      clearTimeout(state.mascotBlinkTimer);
      state.mascotBlinkTimer = null;
    }
  }

  function playMascotBlink() {
    if (!phoneMascotImg || state.currentPage !== 'phone') return;
    phoneMascotImg.src = '/assets/sbay_bot_blink_half.png';
    setTimeout(() => {
      phoneMascotImg.src = '/assets/sbay_bot_sleep.png';
      setTimeout(() => {
        phoneMascotImg.src = '/assets/sbay_bot_blink_half.png';
        setTimeout(() => {
          phoneMascotImg.src = '/assets/sbay_bot.png';
        }, 50);
      }, 70);
    }, 45);
  }

  // ============================================================
  // SCREEN 3: WELCOME
  // ============================================================
  const welcomeCardTap = document.getElementById('welcome-card-tap');
  const welcomeNameText = document.getElementById('welcome-name-text');
  const welcomeAlertBanner = document.getElementById('welcome-alert-banner');
  const welcomeAlertText = document.getElementById('welcome-alert-text');
  let welcomeAdvanceTimer = null;

  function showWelcomeScreen(name, alertMsg) {
    if (welcomeNameText) welcomeNameText.textContent = `สวัสดีครับ คุณ ${name}`;

    if (alertMsg && welcomeAlertBanner && welcomeAlertText) {
      welcomeAlertText.textContent = alertMsg;
      welcomeAlertBanner.classList.remove('hidden');
    } else if (welcomeAlertBanner) {
      welcomeAlertBanner.classList.add('hidden');
    }

    switchScreen('welcome');

    // Auto advance after 2.5s (or 3.5s if alert)
    if (welcomeAdvanceTimer) clearTimeout(welcomeAdvanceTimer);
    const delay = alertMsg ? 3500 : 2500;
    welcomeAdvanceTimer = setTimeout(() => {
      showDetectingScreen();
      sendMessage({ action: 'welcome_timeout' });
    }, delay);
  }

  if (welcomeCardTap) {
    welcomeCardTap.addEventListener('click', () => {
      if (welcomeAdvanceTimer) clearTimeout(welcomeAdvanceTimer);
      showDetectingScreen();
      sendMessage({ action: 'welcome_timeout' });
    });
  }

  // ============================================================
  // SCREEN 4: DETECTING & LIVE LIST
  // ============================================================
  const itemsScrollArea = document.getElementById('items-scroll-area');
  const itemsEmptyState = document.getElementById('items-empty-state');
  const detectItemCount = document.getElementById('detect-item-count');
  const detectStatusText = document.getElementById('detect-status-text');
  const cameraFeedImg = document.getElementById('camera-feed-img');
  const cameraPlaceholder = document.getElementById('camera-placeholder');
  const detectMascotImg = document.getElementById('detect-mascot-img');
  const btnFinish = document.getElementById('btn-finish');

  function showDetectingScreen() {
    state.itemsList = [];
    if (itemsScrollArea) {
      itemsScrollArea.innerHTML = '<div class="items-empty-state" id="items-empty-state"><span>ยังไม่มีรายการหยอด</span></div>';
    }
    if (detectItemCount) detectItemCount.textContent = '0 ชิ้น';
    if (detectStatusText) {
      detectStatusText.textContent = 'สแตนด์บาย: รอการหยอดขยะ...';
      detectStatusText.style.color = 'var(--color-muted)';
    }
    if (detectMascotImg) detectMascotImg.src = '/assets/sbay_bot.png';

    switchScreen('detecting');
  }

  function addItemToList(type, sizeMl, score) {
    playSuccessChime();

    const empty = document.getElementById('items-empty-state');
    if (empty) empty.remove();

    state.itemsList.push({ type, sizeMl, score });
    if (detectItemCount) detectItemCount.textContent = `${state.itemsList.length} ชิ้น`;

    const iconMap = {
      PLASTIC_BOTTLE: '🍾',
      ALUMINUM_CAN: '🥫',
      BEVERAGE_CARTON: '🧃'
    };
    const nameMap = {
      PLASTIC_BOTTLE: 'ขวดพลาสติก',
      ALUMINUM_CAN: 'กระป๋องอลูมิเนียม',
      BEVERAGE_CARTON: 'กล่องเครื่องดื่ม'
    };

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-row-left">
        <span class="item-row-icon">${iconMap[type] || '♻️'}</span>
        <div>
          <div class="item-row-name">${nameMap[type] || type}</div>
          <div class="item-row-ml">${sizeMl} ml</div>
        </div>
      </div>
      <div class="item-row-score">+${Number(score).toFixed(1)} pt</div>
    `;

    if (itemsScrollArea) {
      itemsScrollArea.appendChild(row);
      itemsScrollArea.scrollTop = itemsScrollArea.scrollHeight;
    }

    // Mascot smile reaction
    if (detectMascotImg) {
      detectMascotImg.src = '/assets/sbay_bot_smile.png';
      setTimeout(() => {
        if (state.currentPage === 'detecting' && detectMascotImg) {
          detectMascotImg.src = '/assets/sbay_bot.png';
        }
      }, 3000);
    }

    resetInactivityTimer();
  }

  function updateDetectStatus(message, color) {
    if (!detectStatusText) return;
    detectStatusText.textContent = message;
    if (color) detectStatusText.style.color = color;

    // If error / full -> Mascot sad
    if (color === '#ef4444' || message.includes('เต็ม') || message.includes('คืนขวด') || message.includes('ไม่พบ')) {
      if (detectMascotImg) {
        detectMascotImg.src = '/assets/sbay_bot_sad.png';
        setTimeout(() => {
          if (state.currentPage === 'detecting' && detectMascotImg) {
            detectMascotImg.src = '/assets/sbay_bot.png';
          }
        }, 3200);
      }
    }
  }

  function updateCameraFeed(imageSrc) {
    if (!cameraFeedImg || !cameraPlaceholder) return;
    if (imageSrc) {
      cameraFeedImg.src = imageSrc;
      cameraFeedImg.classList.remove('hidden');
      cameraPlaceholder.classList.add('hidden');
    } else {
      cameraFeedImg.classList.add('hidden');
      cameraPlaceholder.classList.remove('hidden');
    }
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      playKeyClick();
      sendMessage({ action: 'finish' });
    });
  }

  // ============================================================
  // SCREEN 5: SENDING
  // ============================================================
  function showSendingScreen() {
    switchScreen('sending');
  }

  // ============================================================
  // SCREEN 6: RESULT
  // ============================================================
  const resultTapTarget = document.getElementById('result-tap-target');
  const resTotalItems = document.getElementById('res-total-items');
  const resTotalMl = document.getElementById('res-total-ml');
  const resTotalScore = document.getElementById('res-total-score');
  const resultBadgeIcon = document.getElementById('result-badge-icon');
  const resultTitleText = document.getElementById('result-title-text');
  let resultTimer = null;

  function showResultScreen(totalItems, totalMl, totalScore, success) {
    playSuccessChime();

    if (resTotalItems) resTotalItems.textContent = `${totalItems || 0} ชิ้น`;
    if (resTotalMl) resTotalMl.textContent = `${Math.round(totalMl || 0)} ml`;
    if (resTotalScore) resTotalScore.textContent = `+${Number(totalScore || 0).toFixed(1)} pt`;

    if (resultBadgeIcon && resultTitleText) {
      if (success) {
        resultBadgeIcon.textContent = '✓';
        resultBadgeIcon.style.background = 'var(--color-mint)';
        resultTitleText.textContent = 'บันทึกข้อมูลสำเร็จ!';
      } else {
        resultBadgeIcon.textContent = '💾';
        resultBadgeIcon.style.background = 'var(--color-lime)';
        resultTitleText.textContent = 'บันทึกข้อมูลออฟไลน์แล้ว';
      }
    }

    switchScreen('result');

    // Auto return to Idle after 6s
    if (resultTimer) clearTimeout(resultTimer);
    resultTimer = setTimeout(() => {
      showIdleScreen();
      sendMessage({ action: 'return_idle' });
    }, 6000);
  }

  if (resultTapTarget) {
    resultTapTarget.addEventListener('click', () => {
      if (resultTimer) clearTimeout(resultTimer);
      showIdleScreen();
      sendMessage({ action: 'return_idle' });
    });
  }

  // ============================================================
  // GLOBAL INACTIVITY TIMEOUT
  // ============================================================
  function resetInactivityTimer() {
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);

    // No timeout on idle screen
    if (state.currentPage === 'idle' || state.currentPage === 'sending') return;

    const timeoutSec = state.currentPage === 'detecting' ? 45 : 30;
    state.inactivityTimer = setTimeout(() => {
      console.log('[TIMEOUT] Inactivity reached on page', state.currentPage);
      if (state.currentPage === 'phone') {
        showIdleScreen();
        sendMessage({ action: 'return_idle' });
      } else if (state.currentPage === 'detecting') {
        sendMessage({ action: 'finish' });
      } else {
        showIdleScreen();
        sendMessage({ action: 'return_idle' });
      }
    }, timeoutSec * 1000);
  }

  // Activity listeners to reset timer
  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => {
      if (state.currentPage !== 'idle') {
        resetInactivityTimer();
      }
    }, { passive: true });
  });

  // ============================================================
  // INITIALIZATION
  // ============================================================
  window.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    showIdleScreen();
  });

})();
