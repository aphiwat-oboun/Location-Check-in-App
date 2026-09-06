/**
 * "ที่นี่มีอะไร?" Global App Scripts
 * Real-time GPS Distance, AJAX Like/Comment/Notifications, and Map Directions
 */

window.currentUserLat = null;
window.currentUserLng = null;
window.activeReplyParentId = null;

window.DEFAULT_PLACEHOLDER_AVATAR = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 fill=%22%23E5E7EB%22 rx=%2264%22/%3E%3Ccircle cx=%2264%22 cy=%2246%22 r=%2222%22 fill=%22%239CA3AF%22/%3E%3Cpath d=%22M24 108c0-22.091 17.909-38 40-38s40 15.909 40 38%22 fill=%22%239CA3AF%22/%3E%3C/svg%3E";

// Global Window Bindings (Ensures inline onclick handlers are available immediately)
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.triggerInstagramHeart = triggerInstagramHeart;
window.initInstagramDoubleTap = initInstagramDoubleTap;
window.openCommentModal = openCommentModal;
window.submitComment = submitComment;
window.setCommentReply = setCommentReply;
window.cancelCommentReply = cancelCommentReply;
window.fetchNotifications = fetchNotifications;
window.openNotificationDrawer = openNotificationDrawer;
window.closeNotificationDrawer = closeNotificationDrawer;
window.navigateToLocation = navigateToLocation;
window.initRealTimeGPSDistance = initRealTimeGPSDistance;
window.requestGPSPermissionPrompt = requestGPSPermissionPrompt;
window.acceptGPSPermission = acceptGPSPermission;
window.declineGPSPermission = declineGPSPermission;
window.handleGPSBadgeClick = handleGPSBadgeClick;
window.calculateHaversineDistance = calculateHaversineDistance;
window.recalculateAllDistances = recalculateAllDistances;
window.openShareModal = openShareModal;
window.sharePost = sharePost;
window.shareProfile = shareProfile;
window.closeShareModal = closeShareModal;
window.copyShareLink = copyShareLink;
window.triggerNativeShare = triggerNativeShare;
window.getCookie = getCookie;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // 1. Immediately restore saved GPS state from previous page so it NEVER turns off on page change
  restoreSavedGPSState();

  // 2. Initialize / Refresh GPS Tracking in background
  initRealTimeGPSDistance();

  // 3. Initialize Instagram Double-Tap Like Handler
  initInstagramDoubleTap();

  // Check notifications count
  fetchNotifications();
});

/**
 * Real-Time GPS Distance Calculation (Haversine Formula) & Reverse Geocoding
 */
function restoreSavedGPSState() {
  const savedLat = localStorage.getItem('user_lat');
  const savedLng = localStorage.getItem('user_lng');
  const savedName = localStorage.getItem('user_location_name');
  const permStatus = localStorage.getItem('gps_permission_status');

  if (savedLat && savedLng && permStatus === 'granted') {
    window.currentUserLat = parseFloat(savedLat);
    window.currentUserLng = parseFloat(savedLng);

    const displayName = savedName || 'เปิดใช้งานอยู่';
    document.querySelectorAll('.user-gps-location-text').forEach(el => {
      el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:#10B981;stroke-width:2.5;"></i> <span>GPS: ${displayName}</span>`;
      el.setAttribute('title', `ตำแหน่ง GPS: ${displayName} (คลิกเพื่ออัปเดตตำแหน่งล่าสุด)`);
    });
    if (window.lucide) lucide.createIcons();

    // Recalculate distance for all location badges on the new page instantly!
    recalculateAllDistances();
  } else if (permStatus === 'granted') {
    document.querySelectorAll('.user-gps-location-text').forEach(el => {
      el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:var(--primary);"></i> <span>กำลังระบุพิกัดของคุณ...</span>`;
    });
    if (window.lucide) lucide.createIcons();
  } else {
    showDefaultGPSBadge();
  }
}

function handleGPSBadgeClick() {
  const permStatus = localStorage.getItem('gps_permission_status');
  const hasSavedLocation = localStorage.getItem('user_lat') && localStorage.getItem('user_lng');

  if (permStatus === 'granted' && hasSavedLocation) {
    // Already granted & active -> show feedback and refresh coordinates
    document.querySelectorAll('.user-gps-location-text').forEach(el => {
      el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:#10B981;stroke-width:2.5;"></i> <span>กำลังอัปเดตพิกัด...</span>`;
    });
    if (window.lucide) lucide.createIcons();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateDistanceElements(pos);
          if (typeof showToast === 'function') {
            showToast('อัปเดตพิกัด GPS ล่าสุดเรียบร้อยแล้ว', 'success');
          }
        },
        (err) => {
          restoreSavedGPSState();
          if (typeof showToast === 'function') {
            showToast('ใช้พิกัด GPS ล่าสุดที่บันทึกไว้', 'info');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  } else {
    // Not granted yet -> prompt user to enable
    requestGPSPermissionPrompt(true);
  }
}

function requestGPSPermissionPrompt(force = false) {
  const status = localStorage.getItem('gps_permission_status');
  
  if (force || !status || status === 'prompt') {
    const modalHtml = `
      <div style="text-align:center;padding:16px 8px 8px;">
        <div style="width:60px;height:60px;border-radius:50%;background:#E6F5F3;color:#159F8C;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 6px 18px rgba(21,159,140,0.25);">
          <i data-lucide="map-pin" style="width:30px;height:30px;"></i>
        </div>
        <h3 style="font-size:18px;font-weight:800;color:var(--text-main);margin-bottom:8px;">อนุญาตการเข้าถึงพิกัด GPS 📍</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:24px;line-height:1.5;">
          แอป <b>"ที่นี่มีอะไร?"</b> ขออนุญาตระบุตำแหน่ง GPS เพื่อคำนวณระยะทางจากสถานที่ท่องเที่ยวจริง และแสดงจุดเช็กอินรอบตัวคุณแบบเรียลไทม์
        </p>

        <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:10px;">
          <button onclick="declineGPSPermission()" style="padding:11px 16px;border-radius:9999px;border:1px solid #E5E7EB;background:#F9FAFB;color:#4B5563;font-size:13.5px;font-weight:600;cursor:pointer;">
            ไว้ภายหลัง
          </button>
          <button onclick="acceptGPSPermission()" style="padding:11px 18px;border-radius:9999px;border:none;background:#159F8C;color:#FFFFFF;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(21,159,140,0.3);display:flex;align-items:center;justify-content:center;gap:6px;">
            <i data-lucide="crosshair" style="width:16px;height:16px;"></i>
            <span>อนุญาตเปิด GPS</span>
          </button>
        </div>
      </div>
    `;
    if (typeof openMobileBottomSheet === 'function') {
      openMobileBottomSheet(modalHtml);
    }
  } else {
    initRealTimeGPSDistance();
  }
}

function acceptGPSPermission() {
  localStorage.setItem('gps_permission_status', 'granted');
  if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
  
  document.querySelectorAll('.user-gps-location-text').forEach(el => {
    el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:var(--primary);"></i> <span>กำลังระบุพิกัดของคุณ...</span>`;
  });
  if (window.lucide) lucide.createIcons();

  initRealTimeGPSDistance();
}

function declineGPSPermission() {
  localStorage.setItem('gps_permission_status', 'declined');
  if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
  detectLocationViaIP();
}

function initRealTimeGPSDistance() {
  if (!navigator.geolocation) {
    if (!localStorage.getItem('user_lat')) {
      detectLocationViaIP();
    }
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000 // Cache for 60 seconds to avoid constant cold re-aquires between pages
  };

  navigator.geolocation.getCurrentPosition(updateDistanceElements, handleGPSError, options);
  navigator.geolocation.watchPosition(updateDistanceElements, handleGPSError, options);
}

function updateDistanceElements(pos) {
  if (!pos || !pos.coords) return;
  window.currentUserLat = pos.coords.latitude;
  window.currentUserLng = pos.coords.longitude;

  // Persist coordinates and granted status so they survive across page navigation
  localStorage.setItem('user_lat', window.currentUserLat);
  localStorage.setItem('user_lng', window.currentUserLng);
  localStorage.setItem('gps_permission_status', 'granted');

  // Recalculate distance for all location badges on page
  recalculateAllDistances();

  // Reverse geocode to get city / district name in Thai
  fetchReverseGeocodeAddress(window.currentUserLat, window.currentUserLng);
}

function recalculateAllDistances() {
  const permStatus = localStorage.getItem('gps_permission_status');
  const distanceBadges = document.querySelectorAll('.distance-badge, [data-lat][data-lng]');
  const isEn = (localStorage.getItem('app_lang') === 'en');
  const unitKm = isEn ? ' km' : ' กม.';
  const unitM = isEn ? ' m' : ' ม.';
  const defaultDist = `-.-${unitKm}`;
  
  if (permStatus !== 'granted' || !window.currentUserLat || !window.currentUserLng) {
    distanceBadges.forEach(el => {
      if (!el.classList.contains('user-gps-location-text')) {
        el.textContent = defaultDist;
      }
    });
    return;
  }

  distanceBadges.forEach(el => {
    const destLat = parseFloat(el.getAttribute('data-lat'));
    const destLng = parseFloat(el.getAttribute('data-lng'));
    if (!isNaN(destLat) && !isNaN(destLng)) {
      const dist = calculateHaversineDistance(window.currentUserLat, window.currentUserLng, destLat, destLng);
      const text = dist < 1 ? `${Math.round(dist * 1000)}${unitM}` : `${dist.toFixed(1)}${unitKm}`;
      el.textContent = text;
      el.setAttribute('title', isEn ? `Calculated from your real GPS (${text})` : `คำนวณจาก GPS ตำแหน่งจริงของคุณ (${text})`);
    } else {
      el.textContent = defaultDist;
    }
  });
}

function fetchReverseGeocodeAddress(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=th`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data && data.address) {
        const addr = data.address;
        const district = addr.city_district || addr.suburb || addr.town || addr.city || '';
        const province = addr.province || addr.state || '';
        let fullLocationName = [district, province].filter(Boolean).join(', ');
        if (!fullLocationName) fullLocationName = data.display_name.split(',')[0];

        // Save location name to localStorage for instant restoration on subsequent pages
        localStorage.setItem('user_location_name', fullLocationName);

        // Update GPS Location Badge to user's real location
        document.querySelectorAll('.user-gps-location-text').forEach(el => {
          el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:#10B981;stroke-width:2.5;"></i> <span>GPS: ${fullLocationName}</span>`;
          el.setAttribute('title', `ตำแหน่ง GPS: ${fullLocationName} (คลิกเพื่ออัปเดตตำแหน่งล่าสุด)`);
          if (window.lucide) lucide.createIcons();
        });
      }
    })
    .catch(err => console.log('Reverse geocode note:', err));
}

function handleGPSError(err) {
  console.log('Browser GPS prompt info:', err ? err.message : '');
  
  // If user explicitly denied permission in browser popup
  if (err && err.code === 1) {
    localStorage.setItem('gps_permission_status', 'declined');
    showDefaultGPSBadge();
    recalculateAllDistances();
    return;
  }

  // If we already have a saved location from previous page, KEEP IT!
  const savedLat = localStorage.getItem('user_lat');
  const savedLng = localStorage.getItem('user_lng');
  const permStatus = localStorage.getItem('gps_permission_status');
  if (savedLat && savedLng && permStatus === 'granted') {
    // Keep GPS active with saved location
    return;
  }

  showDefaultGPSBadge();
  recalculateAllDistances();
}

function detectLocationViaIP() {
  const permStatus = localStorage.getItem('gps_permission_status');
  if (permStatus !== 'granted') {
    showDefaultGPSBadge();
    recalculateAllDistances();
    return;
  }

  // Automatic fallback to user's network location when granted
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      if (data && data.latitude && data.longitude) {
        window.currentUserLat = data.latitude;
        window.currentUserLng = data.longitude;
        localStorage.setItem('user_lat', data.latitude);
        localStorage.setItem('user_lng', data.longitude);
        recalculateAllDistances();
        fetchReverseGeocodeAddress(window.currentUserLat, window.currentUserLng);
      } else {
        showDefaultGPSBadge();
        recalculateAllDistances();
      }
    })
    .catch(() => {
      showDefaultGPSBadge();
      recalculateAllDistances();
    });
}

function showDefaultGPSBadge() {
  document.querySelectorAll('.user-gps-location-text').forEach(el => {
    el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:var(--primary);"></i> <span>คลิกเพื่อเปิด GPS</span>`;
    el.setAttribute('title', 'คลิกเพื่อเปิด/ระบุตำแหน่ง GPS เรียลไทม์');
    if (window.lucide) lucide.createIcons();
  });
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Toggle Like via AJAX API
 * Supports normal toggle or forceLike (for Instagram double-tap)
 */
async function toggleLike(arg1, arg2, forceLike = false) {
  let e = null;
  let postId = null;
  if (typeof arg1 === 'number' || (typeof arg1 === 'string' && !isNaN(arg1))) {
    postId = arg1;
    e = arg2;
  } else {
    e = arg1;
    postId = arg2;
  }

  if (e && e.stopPropagation) e.stopPropagation();
  if (e && e.preventDefault) e.preventDefault();

  if (!postId) return;

  // Visual pop bounce on all matching like buttons
  const btns = document.querySelectorAll(`[data-post-id="${postId}"].btn-like-action, [data-post-id="${postId}"].btn-like, .like-btn-${postId}`);
  btns.forEach(btn => {
    btn.classList.remove('btn-like-bounce');
    // Force reflow for re-triggering animation
    void btn.offsetWidth;
    btn.classList.add('btn-like-bounce');
    setTimeout(() => btn.classList.remove('btn-like-bounce'), 500);
  });

  try {
    const res = await fetch(`/interactions/like/${postId}/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ force_like: Boolean(forceLike) })
    });

    if (res.status === 401) {
      window.location.href = '/accounts/login/';
      return;
    }

    if (res.ok) {
      const data = await res.json();
      btns.forEach(btn => {
        const countSpan = btn.querySelector('.like-count') || btn.querySelector('.like-num');
        const icon = btn.querySelector('svg');
        if (data.liked) {
          btn.classList.add('liked');
          if (icon) {
            icon.style.fill = '#EF4444';
            icon.style.stroke = '#EF4444';
          }
        } else {
          btn.classList.remove('liked');
          if (icon) {
            icon.style.fill = 'none';
            icon.style.stroke = 'currentColor';
          }
        }
        if (countSpan) countSpan.innerText = data.likes_count;
      });

      // Update all standalone count spans
      document.querySelectorAll(`.like-count-${postId}`).forEach(span => {
        span.innerText = data.likes_count;
      });
    }
  } catch (err) {
    console.error('Like toggle error:', err);
  }
}

/**
 * Triggers the Instagram-Style Heart Burst Animation with Gradient Heart & Particle Confetti
 */
function triggerInstagramHeart(container) {
  if (!container) return;

  // Haptic feedback on mobile if supported
  if (window.navigator && window.navigator.vibrate) {
    try { window.navigator.vibrate(30); } catch (err) {}
  }

  // Remove existing overlays in this container to prevent stacking clutter
  const existingOverlays = container.querySelectorAll('.ig-heart-overlay');
  existingOverlays.forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'ig-heart-overlay';

  const gradId = 'igHeartGrad_' + Math.random().toString(36).substring(2, 9);

  // Big Central Glowing Gradient Heart SVG
  overlay.innerHTML = `
    <svg class="ig-heart-main" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF385C" />
          <stop offset="50%" stop-color="#FF1E56" />
          <stop offset="100%" stop-color="#E11D48" />
        </linearGradient>
      </defs>
      <path fill="url(#${gradId})" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  // 8 Burst particles surrounding the heart
  const particleColors = ['#FF2E63', '#FF4B72', '#FF758C', '#FFD166', '#FFFFFF'];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  angles.forEach((angle, idx) => {
    const dist = 52 + (idx % 2 === 0 ? 28 : 14);
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    const rot = (idx * 40) % 180 - 90;
    const color = particleColors[idx % particleColors.length];

    const particle = document.createElement('div');
    particle.className = 'ig-heart-particle';
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.setProperty('--rot', `${rot}deg`);
    particle.style.animationDelay = `${idx * 0.015}s`;

    if (idx % 3 === 0) {
      // Star / Sparkle
      particle.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="${color}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    } else {
      // Little floating heart
      particle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    }

    overlay.appendChild(particle);
  });

  container.appendChild(overlay);

  // Auto clean up after animation finishes
  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 950);
}

/**
 * Initialize Instagram Double-Tap / Double-Click Listeners
 */
function initInstagramDoubleTap() {
  // Use event delegation on document so dynamic posts also work seamlessly
  document.addEventListener('click', (e) => {
    // Ignore clicks on buttons, links, or controls
    if (e.target.closest('button, a, input, textarea, select, .btn-icon-circle, [role="button"]')) {
      return;
    }

    const target = e.target.closest('.js-dblclick-like, .post-photo-wrapper');
    if (!target) return;

    const postId = target.getAttribute('data-post-id');
    const detailUrl = target.getAttribute('data-detail-url');

    if (!postId) return;

    const now = Date.now();
    const lastTap = target._lastTapTime || 0;
    const timeDiff = now - lastTap;

    // Double-tap detected (< 320ms interval)
    if (timeDiff > 0 && timeDiff < 320) {
      if (target._singleClickTimer) {
        clearTimeout(target._singleClickTimer);
        target._singleClickTimer = null;
      }
      target._lastTapTime = 0;

      e.preventDefault();
      e.stopPropagation();

      // Trigger Instagram Heart Animation & force like
      triggerInstagramHeart(target);
      toggleLike(postId, null, true);
    } else {
      // Single tap / first tap
      target._lastTapTime = now;

      if (detailUrl) {
        e.preventDefault();
        target._singleClickTimer = setTimeout(() => {
          window.location.href = detailUrl;
          target._singleClickTimer = null;
        }, 300);
      }
    }
  });

  // Native dblclick event fallback for desktop mouse double-clicks
  document.addEventListener('dblclick', (e) => {
    const target = e.target.closest('.js-dblclick-like, .post-photo-wrapper');
    if (!target) return;

    const postId = target.getAttribute('data-post-id');
    if (!postId) return;

    if (target._singleClickTimer) {
      clearTimeout(target._singleClickTimer);
      target._singleClickTimer = null;
    }

    e.preventDefault();
    e.stopPropagation();

    triggerInstagramHeart(target);
    toggleLike(postId, null, true);
  });
}

/**
 * Toggle Save/Bookmark via AJAX API
 */
async function toggleSave(arg1, arg2) {
  let e = null;
  let postId = null;
  if (typeof arg1 === 'number' || (typeof arg1 === 'string' && !isNaN(arg1))) {
    postId = arg1;
    e = arg2;
  } else {
    e = arg1;
    postId = arg2;
  }

  if (e && e.stopPropagation) e.stopPropagation();
  if (e && e.preventDefault) e.preventDefault();

  if (!postId) return;

  try {
    const res = await fetch(`/interactions/save/${postId}/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      window.location.href = '/accounts/login/';
      return;
    }

    if (res.ok) {
      const data = await res.json();
      const btns = document.querySelectorAll(`[data-post-id="${postId}"].btn-save-action, [data-post-id="${postId}"].btn-save, .save-btn-${postId}`);
      btns.forEach(btn => {
        const icon = btn.querySelector('svg');
        if (data.saved) {
          btn.classList.add('saved');
          if (icon) {
            icon.style.fill = '#159F8C';
            icon.style.stroke = '#159F8C';
          }
        } else {
          btn.classList.remove('saved');
          if (icon) {
            icon.style.fill = 'none';
            icon.style.stroke = 'currentColor';
          }
        }
      });
    }
  } catch (err) {
    console.error('Save toggle error:', err);
  }
}

/**
 * Open Interactive Comment Modal / Bottom Sheet
 */
async function openCommentModal(postId) {
  window.activeReplyParentId = null;
  try {
    const res = await fetch(`/interactions/comments/${postId}/`);
    if (!res.ok) return;
    const data = await res.json();

    const commentsHtml = renderCommentListHtml(data.comments, postId);

    const modalHtml = `
      <div class="comment-modal-content" style="display:flex;flex-direction:column;max-height:75vh;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-light, #E5E7EB);margin-bottom:12px;">
          <h3 style="font-size:17px;font-weight:700;color:var(--text-main);margin:0;">ความคิดเห็น (<span class="modal-comment-count">${data.comments_count}</span>)</h3>
          <button onclick="closeMobileBottomSheet()" class="btn-icon-circle" style="width:32px;height:32px;">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </div>

        <div id="commentListContainer" style="flex:1;overflow-y:auto;padding-right:4px;margin-bottom:14px;display:flex;flex-direction:column;gap:14px;min-height:120px;">
          ${commentsHtml}
        </div>

        <!-- Reply Tag Bar -->
        <div id="replyingPillBar" style="display:none;align-items:center;justify-content:space-between;background:var(--primary-light, #E6F5F3);padding:6px 12px;border-radius:8px;font-size:12.5px;color:var(--primary, #117A70);margin-bottom:8px;">
          <span>กำลังตอบกลับ <b id="replyingAuthorName"></b></span>
          <button onclick="cancelCommentReply()" style="border:none;background:none;color:#EF4444;font-weight:700;cursor:pointer;">✕</button>
        </div>

        <!-- Comment Input Bar -->
        <form onsubmit="submitComment(event, ${postId})" style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="commentTextInput" placeholder="เขียนความคิดเห็น..." required style="flex:1;min-height:44px;padding:10px 14px;border-radius:9999px;border:1px solid var(--border-light, #E5E7EB);background:var(--bg-surface-subtle, #F9FAFB);color:var(--text-main);font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--primary, #159F8C)'">
          <button type="submit" style="width:44px;height:44px;border-radius:50%;background:#159F8C;color:#FFFFFF;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;box-shadow:0 4px 12px rgba(21, 159, 140, 0.3);">
            <i data-lucide="send" style="width:18px;height:18px;"></i>
          </button>
        </form>
      </div>
    `;

    openMobileBottomSheet(modalHtml);

  } catch (err) {
    console.error('Error opening comment modal:', err);
  }
}

function renderCommentListHtml(comments, postId) {
  if (!comments || comments.length === 0) {
    return `<div style="text-align:center;padding:24px 12px;color:var(--text-muted);font-size:13.5px;">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย! 💬</div>`;
  }

  return comments.map(c => `
    <div id="comment-item-${c.id}" style="display:flex;gap:10px;font-size:13.5px;">
      <a href="/accounts/profile/${c.author_username || ''}/" style="text-decoration:none;flex-shrink:0;">
        <img src="${c.author_avatar || DEFAULT_PLACEHOLDER_AVATAR}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">
      </a>
      <div style="flex:1;">
        <div style="background:var(--bg-surface-subtle, #F3F4F6);padding:10px 14px;border-radius:14px;display:inline-block;max-width:100%;border:1px solid var(--border-subtle, transparent);">
          <a href="/accounts/profile/${c.author_username || ''}/" style="font-weight:700;color:var(--text-main);font-size:13px;margin-bottom:2px;text-decoration:none;display:block;">${c.author_name}</a>
          <div style="color:var(--text-main);line-height:1.4;word-break:break-word;">${c.content}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px;font-size:11.5px;color:var(--text-muted);padding-left:4px;">
          <span>${c.created_at}</span>
          <button onclick="setCommentReply(${c.id}, '${c.author_name.replace(/'/g, "\\'")}')" style="border:none;background:none;color:var(--primary);font-weight:600;cursor:pointer;padding:0;">ตอบกลับ</button>
          ${c.is_owner ? `
            <button onclick="deleteComment(${c.id}, ${postId})" style="border:none;background:none;color:#EF4444;font-weight:600;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:3px;">
              <i data-lucide="trash-2" style="width:12px;height:12px;"></i>ลบ
            </button>
          ` : ''}
        </div>

        ${c.replies && c.replies.length > 0 ? `
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;padding-left:12px;border-left:2px solid var(--border-light, #E5E7EB);">
            ${c.replies.map(r => `
              <div id="comment-item-${r.id}" style="display:flex;gap:8px;font-size:13px;">
                <a href="/accounts/profile/${r.author_username || ''}/" style="text-decoration:none;flex-shrink:0;">
                  <img src="${r.author_avatar || DEFAULT_PLACEHOLDER_AVATAR}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                </a>
                <div>
                  <div style="background:var(--bg-surface-subtle, #F9FAFB);padding:8px 12px;border-radius:12px;display:inline-block;border:1px solid var(--border-subtle, transparent);">
                    <a href="/accounts/profile/${r.author_username || ''}/" style="font-weight:700;color:var(--text-main);font-size:12.5px;text-decoration:none;display:block;">${r.author_name}</a>
                    <div style="color:var(--text-main);line-height:1.4;">${r.content}</div>
                  </div>
                  <div style="margin-top:2px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:10px;padding-left:4px;">
                    <span>${r.created_at}</span>
                    ${r.is_owner ? `
                      <button onclick="deleteComment(${r.id}, ${postId})" style="border:none;background:none;color:#EF4444;font-weight:600;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:3px;">
                        <i data-lucide="trash-2" style="width:11px;height:11px;"></i>ลบ
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function setCommentReply(parentId, authorName) {
  window.activeReplyParentId = parentId;
  const pill = document.getElementById('replyingPillBar');
  const authorSpan = document.getElementById('replyingAuthorName');
  const input = document.getElementById('commentTextInput');
  if (pill && authorSpan) {
    authorSpan.innerText = authorName;
    pill.style.display = 'flex';
  }
  if (input) input.focus();
}

function cancelCommentReply() {
  window.activeReplyParentId = null;
  const pill = document.getElementById('replyingPillBar');
  if (pill) pill.style.display = 'none';
}

async function submitComment(e, postId) {
  if (e) e.preventDefault();
  const input = document.getElementById('commentTextInput');
  if (!input || !input.value.trim()) return;

  const content = input.value.trim();
  const parentId = window.activeReplyParentId;

  const formData = new FormData();
  formData.append('content', content);
  if (parentId) formData.append('parent_id', parentId);

  try {
    const res = await fetch(`/interactions/comment/${postId}/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData
    });

    if (res.status === 401) {
      window.location.href = '/accounts/login/';
      return;
    }

    if (res.ok) {
      const data = await res.json();
      input.value = '';
      cancelCommentReply();

      // Refresh comment list
      const modalRes = await fetch(`/interactions/comments/${postId}/`);
      if (modalRes.ok) {
        const modalData = await modalRes.json();
        const container = document.getElementById('commentListContainer');
        if (container) {
          container.innerHTML = renderCommentListHtml(modalData.comments, postId);
          if (window.lucide) lucide.createIcons();
        }
        const countSpan = document.querySelector('.modal-comment-count');
        if (countSpan) countSpan.innerText = modalData.comments_count;
      }

      // Update all comment counts on page
      document.querySelectorAll(`.comment-count-${postId}, [data-post-id="${postId}"] .comment-count`).forEach(el => {
        el.innerText = data.comments_count;
      });
    }
  } catch (err) {
    console.error('Error submitting comment:', err);
  }
}

/**
 * Social Notifications Engine (Facebook / Dark Slate Theme Style)
 */
window._cachedNotifications = [];
window._currentNotiFilter = 'all';

async function fetchNotifications() {
  try {
    const res = await fetch('/interactions/notifications/');
    if (!res.ok) return;
    const data = await res.json();
    window._cachedNotifications = data.notifications || [];

    const bellBtns = document.querySelectorAll('.btn-icon-circle[title*="แจ้งเตือน"], .nav-notification-btn');
    bellBtns.forEach(btn => {
      let badge = btn.querySelector('.notification-badge');
      if (data.unread_count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notification-badge';
          badge.style.cssText = 'position:absolute;top:2px;right:2px;width:9px;height:9px;background:#EF4444;border-radius:50%;border:2px solid #FFF;';
          btn.style.position = 'relative';
          btn.appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }
      btn.onclick = (e) => openNotificationDrawer(e);
    });
  } catch (err) {
    console.log('Notifications check error:', err.message);
  }
}

function openNotificationDrawer(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  // Dismiss any open map preview card
  if (typeof closeMapCard === 'function') {
    closeMapCard();
  }

  // 1. Immediately hide and remove notification badges on the bell icon
  document.querySelectorAll('.notification-badge, .nav-notification-badge, #navNotiBadge, .badge-count').forEach(badge => {
    badge.remove();
  });

  const drawer = document.getElementById('socialNotiDrawer');
  const backdrop = document.getElementById('socialNotiBackdrop');
  if (drawer && backdrop) {
    drawer.classList.add('show');
    backdrop.classList.add('show');
    if (window.innerWidth <= 1024) {
      document.body.style.overflow = 'hidden';
    }
    renderSocialNotifications(window._currentNotiFilter || 'all');
  }

  // 2. Mark all as read on the backend automatically upon viewing
  fetch('/interactions/notifications/read/', {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') }
  }).then(() => {
    if (window._cachedNotifications && Array.isArray(window._cachedNotifications)) {
      window._cachedNotifications.forEach(n => {
        n.is_read = true;
        n.is_new = false;
      });
      renderSocialNotifications(window._currentNotiFilter || 'all');
    }
  }).catch(err => {
    console.warn('Auto mark read error:', err);
  });

  // 3. Refresh latest notifications in background
  fetch('/interactions/notifications/').then(r => r.json()).then(data => {
    if (data && data.notifications) {
      window._cachedNotifications = data.notifications;
      renderSocialNotifications(window._currentNotiFilter || 'all');
    }
  }).catch(() => {});
}

function closeNotificationDrawer() {
  const drawer = document.getElementById('socialNotiDrawer');
  const backdrop = document.getElementById('socialNotiBackdrop');
  if (drawer) drawer.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  document.body.style.overflow = '';
}

function switchNotiFilter(filter) {
  window._currentNotiFilter = filter;
  const btnAll = document.getElementById('notiFilterAll');
  const btnUnread = document.getElementById('notiFilterUnread');
  if (btnAll && btnUnread) {
    if (filter === 'unread') {
      btnAll.classList.remove('active');
      btnUnread.classList.add('active');
    } else {
      btnAll.classList.add('active');
      btnUnread.classList.remove('active');
    }
  }
  renderSocialNotifications(filter);
}

function renderSocialNotifications(filter = 'all') {
  const container = document.getElementById('socialNotiBody');
  if (!container) return;

  const notifications = window._cachedNotifications || [];
  let filtered = (filter === 'unread')
    ? notifications.filter(n => !n.is_read)
    : notifications;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="social-noti-empty">
        <div class="empty-bell-icon">
          <i data-lucide="bell-off" style="width:32px;height:32px;color:#6B7280;"></i>
        </div>
        <h4>${filter === 'unread' ? 'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน' : 'ไม่มีการแจ้งเตือนในขณะนี้'}</h4>
        <p>เมื่อมีคนกดถูกใจ แสดงความคิดเห็น หรือติดตามคุณ รายการจะปรากฏที่นี่</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Split into New and Earlier sections
  const newItems = filtered.filter(n => n.is_new);
  const earlierItems = filtered.filter(n => !n.is_new);

  function renderNotiItemHtml(n) {
    let badgeBg = '#0D9488';
    let badgeSvg = '<i data-lucide="user-plus" style="width:11px;height:11px;color:#FFF;"></i>';

    if (n.notification_type === 'like') {
      badgeBg = '#EF4444';
      badgeSvg = '<i data-lucide="heart" style="width:11px;height:11px;fill:#FFF;stroke:#FFF;"></i>';
    } else if (n.notification_type === 'comment' || n.notification_type === 'reply') {
      badgeBg = '#159F8C';
      badgeSvg = '<i data-lucide="message-circle" style="width:11px;height:11px;fill:#FFF;stroke:#FFF;"></i>';
    }

    const clickAction = n.post_id 
      ? `onclick="window.location.href='/posts/${n.post_id}/'"`
      : `onclick="window.location.href='/accounts/profile/${n.actor_username || ''}/'"`;

    return `
      <div class="social-noti-item ${n.is_read ? '' : 'unread'}" ${clickAction}>
        <!-- Avatar with corner badge icon -->
        <div class="social-noti-avatar-wrap">
          <img src="${n.actor_avatar || window.DEFAULT_PLACEHOLDER_AVATAR}" alt="${n.actor_name}" class="social-noti-avatar-img">
          <span class="social-noti-badge" style="background:${badgeBg};">
            ${badgeSvg}
          </span>
        </div>

        <!-- Content info -->
        <div class="social-noti-text-wrap">
          <div class="social-noti-message">
            <b class="actor-name">${n.actor_name}</b> ${n.text}
          </div>
          <div class="social-noti-time">${n.created_at}</div>

          ${n.notification_type === 'follow' ? `
            <div class="social-noti-action-row" onclick="event.stopPropagation()">
              ${!n.actor_is_following ? `
                <button class="btn-noti-action confirm" onclick="handleNotiFollowBack('${n.actor_username}', this)">
                  ติดตามกลับ
                </button>
              ` : `
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;padding:4px 0;">กำลังติดตามแล้ว</span>
              `}
              <a href="/accounts/profile/${n.actor_username}/" class="btn-noti-action dismiss">
                ดูโปรไฟล์
              </a>
            </div>
          ` : ''}
        </div>

        <!-- Blue Unread Dot indicator -->
        ${!n.is_read ? '<span class="social-noti-unread-dot" title="ยังไม่ได้อ่าน"></span>' : ''}
      </div>
    `;
  }

  let fullHtml = '';

  if (newItems.length > 0) {
    fullHtml += `
      <div class="social-noti-section-header">
        <span>ใหม่</span>
        <button onclick="switchNotiFilter('all')" class="section-link">ดูทั้งหมด</button>
      </div>
      <div class="social-noti-items-group">
        ${newItems.map(renderNotiItemHtml).join('')}
      </div>
    `;
  }

  if (earlierItems.length > 0) {
    fullHtml += `
      <div class="social-noti-section-header" style="margin-top:14px;">
        <span>ก่อนหน้านี้</span>
      </div>
      <div class="social-noti-items-group">
        ${earlierItems.map(renderNotiItemHtml).join('')}
      </div>
    `;
  }

  container.innerHTML = fullHtml;
  if (window.lucide) lucide.createIcons();
}

async function markAllNotificationsRead(e) {
  if (e) e.stopPropagation();
  try {
    await fetch('/interactions/notifications/read/', {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') }
    });

    window._cachedNotifications.forEach(n => { n.is_read = true; });
    document.querySelectorAll('.notification-badge').forEach(b => b.remove());
    renderSocialNotifications(window._currentNotiFilter || 'all');
  } catch (err) {
    console.error('Mark read error:', err);
  }
}

async function handleNotiFollowBack(username, btnEl) {
  try {
    const res = await fetch(`/accounts/profile/${username}/follow/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        btnEl.outerHTML = '<span style="font-size:12px;color:#10B981;font-weight:700;">✓ ติดตามแล้ว</span>';
        // Update cached object
        const targetNoti = window._cachedNotifications.find(n => n.actor_username === username);
        if (targetNoti) targetNoti.actor_is_following = true;
      }
    }
  } catch (err) {
    console.error('Follow back error:', err);
  }
}

/**
 * Real Navigation / Directions Function
 */
function navigateToLocation(destLat, destLng, placeName) {
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  window.open(gmapsUrl, '_blank');

  if (window.appMap && window.L && window.currentUserLat && window.currentUserLng) {
    if (window.currentRoutePolyline) {
      window.appMap.removeLayer(window.currentRoutePolyline);
    }
    const latlngs = [
      [window.currentUserLat, window.currentUserLng],
      [destLat, destLng]
    ];
    window.currentRoutePolyline = L.polyline(latlngs, {
      color: '#159F8C',
      weight: 5,
      opacity: 0.8,
      dashArray: '8, 8'
    }).addTo(window.appMap);

    const bounds = L.latLngBounds(latlngs);
    window.appMap.fitBounds(bounds, { padding: [50, 50] });
  }
}

/**
 * Social Sharing System (LINE, Facebook, X/Twitter, Native, 1-Click Copy Link)
 */
function openShareModal(options = {}) {
  let shareUrl = window.location.href;
  if (options.id) {
    shareUrl = `${window.location.origin}/posts/${options.id}/`;
  } else if (options.url) {
    shareUrl = options.url.startsWith('http') ? options.url : `${window.location.origin}${options.url}`;
  }

  const title = options.title || document.title || 'ที่นี่มีอะไร? - จุดเช็กอินน่าสนใจ';
  const author = options.author || 'สมาชิก';
  const coverUrl = options.coverUrl || '';
  const text = `ดูจุดเช็กอิน "${title}" บน ที่นี่มีอะไร? 📍✨`;

  const encUrl = encodeURIComponent(shareUrl);
  const encText = encodeURIComponent(`${text}\n${shareUrl}`);

  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encUrl}`;
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
  const twShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encUrl}`;

  const existing = document.getElementById('globalShareModal');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="globalShareModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.68);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="background:#FFFFFF;border-radius:24px;width:100%;max-width:440px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,0.25);position:relative;">
        
        <!-- Close Button -->
        <button type="button" onclick="closeShareModal()" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:none;background:#F1F5F9;color:#64748B;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;transition:all 0.15s;">
          ✕
        </button>

        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <div style="width:46px;height:46px;border-radius:14px;background:#E6F5F3;color:#159F8C;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(21,159,140,0.2);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
          <div>
            <h3 style="font-size:17.5px;font-weight:800;color:#0F172A;margin:0;">แชร์จุดเช็คอิน</h3>
            <p style="font-size:12.5px;color:#64748B;margin:2px 0 0 0;">แชร์ไปยังโซเชียลมีเดียหรือคัดลอกลิงก์</p>
          </div>
        </div>

        <!-- Preview Card -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:12px;display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${coverUrl ? `<img src="${coverUrl}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;flex-shrink:0;border:1px solid #E2E8F0;">` : ''}
          <div style="overflow:hidden;flex:1;">
            <div style="font-size:14px;font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px;">โพสต์โดย ${author}</div>
          </div>
        </div>

        <!-- Social Share Grid (LINE, Facebook, X, Native) -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:20px;text-align:center;">
          <!-- LINE -->
          <a href="${lineShareUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;cursor:pointer;">
            <div style="width:50px;height:50px;border-radius:16px;background:#06C755;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(6,199,85,0.35);transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.066.495.235l2.457 3.332V8.108c0-.345.281-.63.63-.63.348 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            </div>
            <span style="font-size:11.5px;font-weight:700;color:#334155;">LINE</span>
          </a>

          <!-- Facebook -->
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;cursor:pointer;">
            <div style="width:50px;height:50px;border-radius:16px;background:#1877F2;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(24,119,242,0.35);transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <span style="font-size:11.5px;font-weight:700;color:#334155;">Facebook</span>
          </a>

          <!-- Twitter / X -->
          <a href="${twShareUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;cursor:pointer;">
            <div style="width:50px;height:50px;border-radius:16px;background:#0F172A;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(15,23,42,0.35);transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </div>
            <span style="font-size:11.5px;font-weight:700;color:#334155;">X</span>
          </a>

          <!-- Native Share -->
          <div onclick="triggerNativeShare('${encUrl}', '${title.replace(/'/g, "\\'")}', '${text.replace(/'/g, "\\'")}')" style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;">
            <div style="width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg, #159F8C, #0D7A6B);color:#FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(21,159,140,0.35);transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </div>
            <span style="font-size:11.5px;font-weight:700;color:#334155;">เพิ่มเติม</span>
          </div>
        </div>

        <!-- Copy Link Input Bar -->
        <div style="display:flex;align-items:center;gap:8px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:14px;padding:4px 4px 4px 12px;">
          <input type="text" id="shareUrlInputField" value="${shareUrl}" readonly style="flex:1;background:transparent;border:none;outline:none;font-size:13px;color:#334155;font-weight:500;">
          <button id="btnCopyShareLink" type="button" onclick="copyShareLink('${shareUrl}')" style="padding:9px 16px;border-radius:10px;border:none;background:#159F8C;color:#FFFFFF;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;flex-shrink:0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>คัดลอก</span>
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('globalShareModal').addEventListener('click', function(e) {
    if (e.target === this) closeShareModal();
  });
}

function closeShareModal() {
  const modal = document.getElementById('globalShareModal');
  if (modal) modal.remove();
}

function copyShareLink(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      onCopySuccess();
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const el = document.getElementById('shareUrlInputField');
  if (el) {
    el.select();
    document.execCommand('copy');
    onCopySuccess();
  }
}

function onCopySuccess() {
  const btn = document.getElementById('btnCopyShareLink');
  if (btn) {
    btn.style.background = '#059669';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>คัดลอกแล้ว!</span>`;
    setTimeout(() => {
      if (btn) {
        btn.style.background = '#159F8C';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>คัดลอก</span>`;
      }
    }, 2500);
  }
  if (typeof showToast === 'function') {
    showToast('คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว! 📋', 'success');
  }
}

function triggerNativeShare(url, title, text) {
  if (navigator.share) {
    navigator.share({
      title: title,
      text: text,
      url: decodeURIComponent(url)
    }).catch(() => {});
  } else {
    copyShareLink(decodeURIComponent(url));
  }
}

function sharePost(postId, postTitle) {
  openShareModal({
    id: postId,
    title: postTitle || 'โพสต์เช็คอิน',
    author: 'สมาชิก'
  });
}

function shareProfile(username, displayName) {
  openShareModal({
    url: `/accounts/profile/${username}/`,
    title: `โปรไฟล์ของ ${displayName}`,
    author: displayName
  });
}

/**
 * Helper function to retrieve CSRF token from cookies
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  if (!cookieValue && name === 'csrftoken') {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag && metaTag.content) {
      cookieValue = metaTag.content;
    } else {
      const inputTag = document.querySelector('input[name="csrfmiddlewaretoken"]');
      if (inputTag) cookieValue = inputTag.value;
    }
  }
  return cookieValue;
}

/**
 * Cookie Consent Manager
 */
function initCookieConsent() {
  const consent = localStorage.getItem('cookie_consent_status');
  const banner = document.getElementById('cookieConsentBanner');
  if (!banner) return;

  if (!consent) {
    setTimeout(() => {
      banner.style.display = 'flex';
      banner.classList.add('show');
      if (window.lucide) lucide.createIcons();
    }, 600);
  } else {
    banner.style.display = 'none';
  }
}

function openCookieConsentBanner() {
  const banner = document.getElementById('cookieConsentBanner');
  if (banner) {
    banner.style.display = 'flex';
    banner.classList.add('show');
    if (window.lucide) lucide.createIcons();
  }
}

function resetCookieConsent() {
  localStorage.removeItem('cookie_consent_status');
  initCookieConsent();
}

function acceptCookieConsent() {
  localStorage.setItem('cookie_consent_status', 'accepted');
  const banner = document.getElementById('cookieConsentBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => { banner.style.display = 'none'; }, 250);
  }
  if (typeof showToast === 'function') {
    showToast('success', 'บันทึกการตั้งค่าคุกกี้เรียบร้อยแล้ว');
  }
}

function declineCookieConsent() {
  localStorage.setItem('cookie_consent_status', 'declined');
  const banner = document.getElementById('cookieConsentBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => { banner.style.display = 'none'; }, 250);
  }
  if (typeof showToast === 'function') {
    showToast('info', 'คุณได้ปฏิเสธคุกกี้ที่ไม่จำเป็น');
  }
}

function confirmLogout(e, logoutUrl) {
  if (e) e.preventDefault();
  const url = logoutUrl || '/accounts/logout/';
  
  // Close any open popovers, sheets, or settings modals
  if (typeof closeProfileSettingsModal === 'function') closeProfileSettingsModal();
  if (typeof closeUserDropdownMenu === 'function') closeUserDropdownMenu();
  if (typeof closeNotificationDrawer === 'function') closeNotificationDrawer();
  if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();

  showCustomConfirm(
    'ยืนยันการออกจากระบบ',
    'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ?',
    () => { window.location.href = url; },
    { type: 'danger', confirmText: 'ออกจากระบบ', cancelText: 'ยกเลิก', icon: '🚪' }
  );
}

/**
 * Custom Confirm Dialog — replaces browser native confirm()
 * @param {string} title - Dialog title
 * @param {string} message - Dialog description
 * @param {Function} onConfirm - Called when user clicks confirm
 * @param {Object} options - { type: 'danger'|'warning'|'primary', confirmText, cancelText, icon }
 */
function showCustomConfirm(title, message, onConfirm, options = {}) {
  const type = options.type || 'danger';
  const confirmText = options.confirmText || 'ยืนยัน';
  const cancelText = options.cancelText || 'ยกเลิก';
  const icons = {
    danger: '🗑️',
    warning: '⚠️',
    primary: 'ℹ️',
    success: '✅'
  };
  const icon = options.icon || icons[type] || '❓';

  // Remove any existing dialog
  const existing = document.getElementById('customDialogOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'customDialogOverlay';
  overlay.className = 'custom-dialog-overlay';
  overlay.innerHTML = `
    <div class="custom-dialog-box" role="dialog" aria-modal="true">
      <div class="custom-dialog-icon ${type}">${icon}</div>
      <h2 class="custom-dialog-title">${title}</h2>
      <p class="custom-dialog-message">${message}</p>
      <div class="custom-dialog-actions two-col">
        <button class="btn-dialog-cancel" id="dialogCancelBtn">${cancelText}</button>
        <button class="btn-dialog-confirm ${type}" id="dialogConfirmBtn">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('show'));
  });

  function closeDialog() {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 250);
  }

  overlay.querySelector('#dialogCancelBtn').addEventListener('click', closeDialog);
  overlay.querySelector('#dialogConfirmBtn').addEventListener('click', () => {
    closeDialog();
    if (typeof onConfirm === 'function') onConfirm();
  });
  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });
  // Close on Escape key
  const onKey = (e) => {
    if (e.key === 'Escape') { closeDialog(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

/**
 * Custom Toast Notification — replaces browser native alert()
 * @param {string} message - The message to show
 * @param {string} type - 'error'|'success'|'warning'|'' (default dark)
 * @param {number} duration - ms to show, default 3500
 */
function showCustomToast(message, type = '', duration = 3500) {
  const existing = document.getElementById('customToastEl');
  if (existing) existing.remove();

  const toastIcons = { error: '❌', success: '✅', warning: '⚠️' };
  const icon = toastIcons[type] || 'ℹ️';

  const toast = document.createElement('div');
  toast.id = 'customToastEl';
  toast.className = `custom-toast${type ? ' ' + type : ''}`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  if (!cookieValue) {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]');
    if (metaCsrf) cookieValue = metaCsrf.getAttribute('content');
  }
  return cookieValue || '';
}

async function deleteComment(commentId, postId) {
  // Use custom dialog instead of browser native confirm()
  showCustomConfirm(
    'ลบความคิดเห็น',
    'คุณต้องการลบความคิดเห็นนี้ใช่หรือไม่?',
    () => _doDeleteComment(commentId, postId),
    { type: 'danger', confirmText: '🗑️ ลบเลย', cancelText: 'ยกเลิก' }
  );
}

async function _doDeleteComment(commentId, postId) {

  try {
    const res = await fetch(`/interactions/comment/${commentId}/delete/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (res.status === 401) {
      window.location.href = '/accounts/login/';
      return;
    }

    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById(`comment-item-${commentId}`);
      if (el) {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateX(15px)';
        setTimeout(() => el.remove(), 220);
      }

      // Update counters
      const countSpan = document.querySelector('.modal-comment-count');
      if (countSpan) countSpan.innerText = data.comments_count;
      document.querySelectorAll(`.comment-count-${postId}, [data-post-id="${postId}"] .comment-count`).forEach(c => {
        c.innerText = data.comments_count;
      });
    } else {
      const err = await res.json();
      showCustomToast(err.message || 'ไม่สามารถลบความคิดเห็นได้', 'error');
    }
  } catch (err) {
    console.error('Delete comment error:', err);
  }
}

function openPostOptionsMenu(postId, isOwner, placeName = '') {
  const modalHtml = `
    <div style="display:flex;flex-direction:column;gap:6px;padding:8px 4px 16px;">
      <div style="text-align:center;padding-bottom:12px;border-bottom:1px solid #E5E7EB;margin-bottom:8px;">
        <h4 style="font-size:15px;font-weight:700;color:var(--text-main);margin:0;">ตัวเลือกโพสต์</h4>
        ${placeName ? `<span style="font-size:12px;color:var(--text-muted);">${placeName}</span>` : ''}
      </div>

      ${isOwner ? `
        <a href="/posts/${postId}/edit/" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;color:var(--text-main);font-size:14px;font-weight:600;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='transparent'">
          <div style="width:36px;height:36px;border-radius:50%;background:#E6F5F3;color:#159F8C;display:flex;align-items:center;justify-content:center;">
            <i data-lucide="edit-3" style="width:18px;height:18px;"></i>
          </div>
          <span>แก้ไขโพสต์</span>
        </a>

        <button onclick="confirmDeletePost(${postId}, '${placeName.replace(/'/g, "\\'")}')" style="border:none;background:none;width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;color:#EF4444;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='transparent'">
          <div style="width:36px;height:36px;border-radius:50%;background:#FEE2E2;color:#EF4444;display:flex;align-items:center;justify-content:center;">
            <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
          </div>
          <span>ลบโพสต์นี้</span>
        </button>
      ` : ''}

      <button onclick="copyPostLink(${postId})" style="border:none;background:none;width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:14px;color:var(--text-main);font-size:14px;font-weight:600;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:50%;background:#F3F4F6;color:var(--text-main);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="link" style="width:18px;height:18px;"></i>
        </div>
        <span>คัดลอกลิงก์โพสต์</span>
      </button>

      <button onclick="closeMobileBottomSheet()" style="margin-top:8px;border:1px solid #E5E7EB;background:#F9FAFB;width:100%;padding:11px;border-radius:9999px;color:var(--text-muted);font-size:13.5px;font-weight:600;cursor:pointer;">
        ยกเลิก
      </button>
    </div>
  `;

  if (typeof openMobileBottomSheet === 'function') {
    openMobileBottomSheet(modalHtml);
  }
}

async function confirmDeletePost(postId, placeName = '') {
  if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();

  // Use custom dialog instead of browser native confirm()
  showCustomConfirm(
    'ลบโพสต์นี้?',
    `โพสต์ "${placeName || 'นี้'}" และรูปภาพทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้`,
    () => _doDeletePost(postId),
    { type: 'danger', confirmText: '🗑️ ลบถาวร', cancelText: 'ยกเลิก' }
  );
}

async function _doDeletePost(postId) {

  try {
    const res = await fetch(`/posts/${postId}/delete/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (res.ok) {
      // If currently on the post detail page or edit page, redirect to home
      if (window.location.pathname.includes(`/posts/${postId}`)) {
        window.location.href = '/';
        return;
      }

      // Remove the post card from feed on home / my_posts page
      const postCards = document.querySelectorAll(`[data-post-card-id="${postId}"]`);
      postCards.forEach(card => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 320);
      });
    } else {
      const data = await res.json();
      showCustomToast(data.message || 'ไม่สามารถลบโพสต์ได้', 'error');
    }
  } catch (err) {
    console.error('Delete post error:', err);
  }
}

function copyPostLink(postId) {
  const url = `${window.location.origin}/posts/${postId}/`;
  copyToClipboard(url);
}

// World-Class Share Check-in Modal Engine
window._currentShareData = { url: '', title: '', text: '' };

function openShareModal(options = {}) {
  const postId = options.id || options.postId;
  const title = options.title || options.placeName || 'ที่นี่มีอะไร?';
  const author = options.author || options.user || 'ผู้ใช้งาน';
  const coverUrl = options.coverUrl || options.imgUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80';
  const url = options.url || (postId ? `${window.location.origin}/posts/${postId}/` : window.location.href);
  const shareText = `เช็กอินและดูเรื่องราว "${title}" บน ที่นี่มีอะไร?`;

  window._currentShareData = { url, title, text: shareText };

  const modal = document.getElementById('globalShareModalBackdrop');
  if (!modal) return;

  // Populate Preview
  const coverImg = document.getElementById('shareModalCoverImg');
  const titleEl = document.getElementById('shareModalTitle');
  const authorEl = document.getElementById('shareModalAuthor');
  const urlInput = document.getElementById('shareModalUrlInput');

  if (coverImg) coverImg.src = coverUrl;
  if (titleEl) titleEl.textContent = title;
  if (authorEl) authorEl.textContent = `โดย ${author}`;
  if (urlInput) urlInput.value = url;

  // Reset Copy button state
  const copyBtn = document.getElementById('shareModalCopyBtn');
  const copyBtnText = document.getElementById('shareModalCopyBtnText');
  if (copyBtn) {
    copyBtn.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
  }
  if (copyBtnText) copyBtnText.textContent = 'คัดลอก';

  // Encode for social links
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${shareText}\n${url}`);
  const encodedTitle = encodeURIComponent(title);

  const lineBtn = document.getElementById('shareLineBtn');
  if (lineBtn) lineBtn.href = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;

  const fbBtn = document.getElementById('shareFacebookBtn');
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const msgBtn = document.getElementById('shareMessengerBtn');
  if (msgBtn) msgBtn.href = `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`;

  const xBtn = document.getElementById('shareXBtn');
  if (xBtn) xBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`;

  const waBtn = document.getElementById('shareWhatsappBtn');
  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?text=${encodedText}`;

  const tgBtn = document.getElementById('shareTelegramBtn');
  if (tgBtn) tgBtn.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`;

  const emBtn = document.getElementById('shareEmailBtn');
  if (emBtn) emBtn.href = `mailto:?subject=${encodedTitle}&body=${encodedText}`;

  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons();
}

function closeGlobalShareModal() {
  const modal = document.getElementById('globalShareModalBackdrop');
  if (modal) modal.style.display = 'none';
}

function copyShareModalLink() {
  const url = window._currentShareData.url || window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const copyBtn = document.getElementById('shareModalCopyBtn');
    const copyBtnText = document.getElementById('shareModalCopyBtnText');
    if (copyBtn) {
      copyBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    }
    if (copyBtnText) {
      copyBtnText.textContent = 'คัดลอกแล้ว! ✓';
    }
    showCustomToast('📋 คัดลอกลิงก์จุดเช็คอินเรียบร้อยแล้ว!', 'success');
    setTimeout(() => {
      if (copyBtn) copyBtn.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';
      if (copyBtnText) copyBtnText.textContent = 'คัดลอก';
    }, 2500);
  }).catch(() => {
    prompt('คัดลอกลิงก์ได้ที่นี่:', url);
  });
}

async function triggerNativeShareModal() {
  const { url, title, text } = window._currentShareData;
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'ที่นี่มีอะไร?',
        text: text || 'ดูจุดเช็คอินนี้บน ที่นี่มีอะไร?',
        url: url || window.location.href
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  copyShareModalLink();
}

async function sharePost(postId, title = 'ที่นี่มีอะไร?', coverUrl = '', author = '') {
  openShareModal({
    id: postId,
    title: title,
    author: author || 'ผู้ใช้งาน',
    coverUrl: coverUrl,
    url: `${window.location.origin}/posts/${postId}/`
  });
}

async function shareProfile(username, displayName = '') {
  openShareModal({
    title: `โปรไฟล์ ${displayName || username} (@${username})`,
    author: displayName || username,
    url: `${window.location.origin}/accounts/profile/${username}/`
  });
}

function copyToClipboard(url) {
  navigator.clipboard.writeText(url).then(() => {
    showCustomToast('📋 คัดลอกลิงก์เรียบร้อยแล้ว!', 'success');
  }).catch(() => {
    prompt('คัดลอกลิงก์ได้ที่นี่:', url);
  });
}

window.openShareModal = openShareModal;
window.closeGlobalShareModal = closeGlobalShareModal;
window.copyShareModalLink = copyShareModalLink;
window.triggerNativeShareModal = triggerNativeShareModal;

async function toggleFollow(username, btnEl) {
  try {
    const res = await fetch(`/accounts/profile/${username}/follow/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      window.location.href = '/accounts/login/';
      return;
    }

    const data = await res.json();
    if (data.success) {
      if (btnEl) {
        if (data.is_following) {
          btnEl.className = 'btn-tiktok-action following';
          btnEl.innerHTML = '<i data-lucide="check" style="width:16px;height:16px;"></i><span class="follow-btn-text">กำลังติดตาม</span>';
        } else {
          btnEl.className = 'btn-tiktok-action primary';
          btnEl.innerHTML = '<i data-lucide="user-plus" style="width:16px;height:16px;"></i><span class="follow-btn-text">ติดตาม</span>';
        }
        if (window.lucide) lucide.createIcons();
      }

      const followerCountEl = document.getElementById('profileFollowersCount');
      if (followerCountEl && data.followers_count !== undefined) {
        followerCountEl.innerText = data.followers_count;
      }
    } else {
      if (typeof showToast === 'function') {
        showToast('error', data.message || 'ไม่สามารถดำเนินการได้');
      }
    }
  } catch (err) {
    console.error('Toggle follow error:', err);
  }
}

async function openFollowListModal(username, listType = 'followers') {
  const backdrop = document.getElementById('followListModalBackdrop');
  const titleEl = document.getElementById('followListModalTitle');
  const bodyEl = document.getElementById('followListModalBody');

  if (titleEl) titleEl.innerText = (listType === 'following') ? 'กำลังติดตาม' : 'ผู้ติดตาม';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="text-align:center;padding:30px 16px;color:var(--text-muted);">
        <i data-lucide="loader-2" class="spin-icon" style="width:24px;height:24px;color:#159F8C;"></i>
        <div style="margin-top:8px;font-size:13px;">กำลังโหลด...</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  if (backdrop) backdrop.classList.add('show');

  try {
    const res = await fetch(`/accounts/profile/${username}/users-list/?type=${listType}`);
    if (!res.ok) throw new Error('Failed to fetch user list');
    const data = await res.json();

    if (!data.users || data.users.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:40px 16px;color:var(--text-muted);">
          <i data-lucide="users" style="width:36px;height:36px;opacity:0.4;margin-bottom:8px;"></i>
          <p style="font-size:13.5px;margin:0;">ยังไม่มี${data.title}</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0;">
        ${data.users.map(u => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;">
            <a href="/accounts/profile/${u.username}/" style="display:flex;align-items:center;gap:10px;text-decoration:none;flex:1;min-width:0;">
              <img src="${u.avatar_url || window.DEFAULT_PLACEHOLDER_AVATAR}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;">
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:13.5px;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${u.display_name}
                </div>
                <div style="font-size:12px;color:var(--text-muted);">@${u.username}</div>
              </div>
            </a>
            ${!u.is_self ? `
              <button onclick="toggleFollow('${u.username}', this)" class="btn-tiktok-action ${u.is_following ? 'following' : 'primary'}" style="padding:6px 14px;font-size:12px;border-radius:9999px;min-width:86px;">
                ${u.is_following ? 'กำลังติดตาม' : 'ติดตาม'}
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#EF4444;font-size:13px;">ไม่สามารถโหลดข้อมูลได้</div>`;
  }
}

function closeFollowListModal() {
  const backdrop = document.getElementById('followListModalBackdrop');
  if (backdrop) backdrop.classList.remove('show');
}

// Explicitly expose functions to window object
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.triggerInstagramHeart = triggerInstagramHeart;
window.initInstagramDoubleTap = initInstagramDoubleTap;
window.openCommentModal = openCommentModal;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.openPostOptionsMenu = openPostOptionsMenu;
window.confirmDeletePost = confirmDeletePost;
window.copyPostLink = copyPostLink;
window.sharePost = sharePost;
window.shareProfile = shareProfile;
window.openShareModal = openShareModal;
window.openShareBottomSheet = openShareModal;
window.openGlobalShareModal = openShareModal;
window.closeGlobalShareModal = closeGlobalShareModal;
// ==========================================================================
// User Dropdown Menu, Language Switcher, About Modal & PWA
// ==========================================================================
function toggleUserDropdownMenu(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const popover = document.getElementById('userMenuPopover');
  if (!popover) return;
  popover.classList.toggle('show');
}

function closeUserDropdownMenu() {
  const popover = document.getElementById('userMenuPopover');
  if (popover) popover.classList.remove('show');
}

document.addEventListener('click', (e) => {
  const wrapper = e.target.closest('.user-menu-dropdown-wrapper');
  if (!wrapper) {
    closeUserDropdownMenu();
  }
});

function toggleAppLanguage() {
  if (typeof window.applyAppLanguage === 'function') {
    const current = localStorage.getItem('app_lang') || 'th';
    const next = (current === 'th') ? 'en' : 'th';
    window.applyAppLanguage(next);
    const toastMsg = (next === 'en') ? 'Switched language to English' : 'เปลี่ยนภาษาเป็น ภาษาไทย เรียบร้อยแล้ว';
    showCustomToast(toastMsg, 'info');
  } else {
    const current = localStorage.getItem('app_lang') || 'th';
    const next = current === 'th' ? 'en' : 'th';
    localStorage.setItem('app_lang', next);
    
    const thOpt = document.getElementById('langOptTh');
    const enOpt = document.getElementById('langOptEn');
    if (thOpt && enOpt) {
      if (next === 'en') {
        thOpt.classList.remove('active');
        enOpt.classList.add('active');
      } else {
        thOpt.classList.add('active');
        enOpt.classList.remove('active');
      }
    }
    showCustomToast(next === 'en' ? 'Switched language to English' : 'เปลี่ยนภาษาเป็น ภาษาไทย', 'info');
  }
}

function openAboutAppModal() {
  const modal = document.getElementById('aboutAppModalBackdrop');
  if (modal) {
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }
}

function closeAboutAppModal() {
  const modal = document.getElementById('aboutAppModalBackdrop');
  if (modal) modal.style.display = 'none';
}

// Progressive Web App (PWA) Registration & Install Prompt
window._deferredPWAInstallPrompt = null;

function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('PWA Service Worker registered with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    });
  }

  // 2. Handle beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._deferredPWAInstallPrompt = e;
    
    // Show PWA install button in user dropdown and floating banner
    const pwaMenuItem = document.getElementById('pwaInstallMenuItem');
    if (pwaMenuItem) pwaMenuItem.style.display = 'flex';

    const pwaFloatingBtn = document.getElementById('pwaFloatingInstallBanner');
    if (pwaFloatingBtn && !localStorage.getItem('pwa_banner_dismissed')) {
      pwaFloatingBtn.style.display = 'flex';
    }
    if (window.lucide) lucide.createIcons();
  });

  window.addEventListener('appinstalled', () => {
    window._deferredPWAInstallPrompt = null;
    showCustomToast('ติดตั้งแอปพลิเคชัน "ที่นี่มีอะไร?" เรียบร้อยแล้ว!', 'success');
    const pwaMenuItem = document.getElementById('pwaInstallMenuItem');
    if (pwaMenuItem) pwaMenuItem.style.display = 'none';
    const pwaFloatingBtn = document.getElementById('pwaFloatingInstallBanner');
    if (pwaFloatingBtn) pwaFloatingBtn.style.display = 'none';
  });
}

function triggerPWAInstall() {
  if (window._deferredPWAInstallPrompt) {
    window._deferredPWAInstallPrompt.prompt();
    window._deferredPWAInstallPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        showCustomToast('กำลังติดตั้งแอปพลิเคชัน...', 'success');
      }
      window._deferredPWAInstallPrompt = null;
    });
  } else {
    showCustomToast('สำหรับอุปกรณ์มือถือ สามารถกด "เพิ่มลงในหน้าจอหลัก" (Add to Home Screen) ในเมนูของเบราว์เซอร์ได้ทันที', 'info');
  }
}

function dismissPWABanner() {
  const pwaFloatingBtn = document.getElementById('pwaFloatingInstallBanner');
  if (pwaFloatingBtn) pwaFloatingBtn.style.display = 'none';
  localStorage.setItem('pwa_banner_dismissed', 'true');
}

// Window Global Exports
window.toggleUserDropdownMenu = toggleUserDropdownMenu;
window.closeUserDropdownMenu = closeUserDropdownMenu;
window.toggleAppLanguage = toggleAppLanguage;
window.openAboutAppModal = openAboutAppModal;
window.closeAboutAppModal = closeAboutAppModal;
window.triggerPWAInstall = triggerPWAInstall;
window.dismissPWABanner = dismissPWABanner;
window.copyToClipboard = copyToClipboard;
window.toggleFollow = toggleFollow;
window.openFollowListModal = openFollowListModal;
window.closeFollowListModal = closeFollowListModal;
window.setCommentReply = setCommentReply;
window.cancelCommentReply = cancelCommentReply;
window.fetchNotifications = fetchNotifications;
window.openNotificationDrawer = openNotificationDrawer;
window.closeNotificationDrawer = closeNotificationDrawer;
window.switchNotiFilter = switchNotiFilter;
window.markAllNotificationsRead = markAllNotificationsRead;
window.handleNotiFollowBack = handleNotiFollowBack;
window.navigateToLocation = navigateToLocation;
window.initRealTimeGPSDistance = initRealTimeGPSDistance;
window.calculateHaversineDistance = calculateHaversineDistance;
window.getCookie = getCookie;
window.acceptCookieConsent = acceptCookieConsent;
window.declineCookieConsent = declineCookieConsent;
window.initCookieConsent = initCookieConsent;
window.openCookieConsentBanner = openCookieConsentBanner;
window.resetCookieConsent = resetCookieConsent;
window.confirmLogout = confirmLogout;
window.showCustomConfirm = showCustomConfirm;
window.showCustomToast = showCustomToast;

// Real-Time High-Entropy Client Device & Public IP Synchronization
async function syncClientRealDeviceAndIP() {
  try {
    let exactOS = 'Windows 10';
    let exactDevice = 'คอมพิวเตอร์ (Desktop)';
    let exactBrowser = 'Google Chrome';
    const ua = navigator.userAgent || '';
    const uaLower = ua.toLowerCase();

    // 1. High-Entropy Client Hints: Distinguish Windows 11 from Windows 10 precisely
    if (navigator.userAgentData) {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'model', 'architecture']);
        const plat = (navigator.userAgentData.platform || '').toLowerCase();
        if (plat.includes('win')) {
          const major = parseInt((hints.platformVersion || '').split('.')[0], 10);
          // Chromium platformVersion >= 13 is Windows 11 (build >= 22000)
          if (major >= 13) {
            exactOS = 'Windows 11';
          } else {
            exactOS = 'Windows 10';
          }
        } else if (plat.includes('mac')) {
          exactOS = 'macOS';
          exactDevice = 'Mac (คอมพิวเตอร์)';
        } else if (plat.includes('android')) {
          exactOS = hints.model ? `Android (${hints.model})` : 'Android';
          exactDevice = hints.model ? `${hints.model} (มือถือ)` : 'Android (มือถือ)';
        } else if (plat.includes('linux')) {
          exactOS = 'Linux';
        }
      } catch(e) {}
    } else {
      // Fallback for Safari, Firefox, iOS
      if (uaLower.includes('iphone')) {
        const match = ua.match(/OS (\d+[_\.]\d+)/);
        const ver = match ? match[1].replace('_', '.') : '';
        exactOS = ver ? `iOS ${ver} (iPhone)` : 'iOS (iPhone)';
        exactDevice = 'iPhone (มือถือ)';
      } else if (uaLower.includes('ipad')) {
        const match = ua.match(/OS (\d+[_\.]\d+)/);
        const ver = match ? match[1].replace('_', '.') : '';
        exactOS = ver ? `iPadOS ${ver} (iPad)` : 'iPadOS (iPad)';
        exactDevice = 'iPad (แท็บเล็ต)';
      } else if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) {
        exactOS = 'macOS';
        exactDevice = 'Mac (คอมพิวเตอร์)';
      } else if (uaLower.includes('android')) {
        exactOS = 'Android';
        exactDevice = 'Android (มือถือ)';
      } else if (uaLower.includes('windows nt 10.0')) {
        exactOS = 'Windows 10/11';
      }
    }

    // Detect browser
    if (uaLower.includes('line/')) exactBrowser = 'LINE In-App';
    else if (uaLower.includes('edg/')) exactBrowser = 'Microsoft Edge';
    else if (uaLower.includes('samsungbrowser')) exactBrowser = 'Samsung Internet';
    else if (uaLower.includes('chrome') && uaLower.includes('safari')) exactBrowser = 'Google Chrome';
    else if (uaLower.includes('safari') && !uaLower.includes('chrome')) exactBrowser = 'Apple Safari';
    else if (uaLower.includes('firefox')) exactBrowser = 'Mozilla Firefox';

    // 2. Only sync once per browser session to prevent redundant calls
    if (sessionStorage.getItem('device_info_synced')) {
      return;
    }

    // 3. Send client OS, Device and Browser to server
    const csrfToken = (typeof getCookie === 'function') ? getCookie('csrftoken') : '';
    if (csrfToken) {
      fetch('/accounts/api/sync-device/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          real_ip: '',
          real_location: '',
          real_os: exactOS,
          real_device: exactDevice,
          real_browser: exactBrowser
        })
      }).then(() => {
        sessionStorage.setItem('device_info_synced', 'true');
      }).catch(() => {});
    }
  } catch(err) {
    // Graceful silent fallback
  }
}

window.syncClientRealDeviceAndIP = syncClientRealDeviceAndIP;

document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent();
  initPWA();
  fetchNotifications();
  syncClientRealDeviceAndIP();

  // Restore saved language toggle state
  const savedLang = localStorage.getItem('app_lang') || 'th';
  const thOpt = document.getElementById('langOptTh');
  const enOpt = document.getElementById('langOptEn');
  if (thOpt && enOpt) {
    if (savedLang === 'en') {
      thOpt.classList.remove('active');
      enOpt.classList.add('active');
    } else {
      thOpt.classList.add('active');
      enOpt.classList.remove('active');
    }
  }

  // Restore saved theme state
  const savedTheme = localStorage.getItem('app_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUIElements(savedTheme);
});

/* ============================================================
   Dark Theme Toggle Engine
   ============================================================ */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = (current === 'dark') ? 'light' : 'dark';
  setAppTheme(next);
}

function setAppTheme(theme) {
  const targetTheme = (theme === 'dark') ? 'dark' : 'light';
  localStorage.setItem('app_theme', targetTheme);
  document.documentElement.setAttribute('data-theme', targetTheme);
  updateThemeUIElements(targetTheme);

  const isEn = (localStorage.getItem('app_lang') === 'en');
  const msg = targetTheme === 'dark' 
    ? (isEn ? 'Switched to Dark Mode 🌙' : 'เปลี่ยนเป็น โหมดมืด 🌙 เรียบร้อยแล้ว')
    : (isEn ? 'Switched to Light Mode ☀️' : 'เปลี่ยนเป็น โหมดสว่าง ☀️ เรียบร้อยแล้ว');
  
  if (typeof showCustomToast === 'function') {
    showCustomToast(msg, 'info');
  } else if (typeof showToast === 'function') {
    showToast(msg, 'info');
  }
}

function updateThemeUIElements(theme) {
  const isDark = (theme === 'dark');
  const themeToggles = document.querySelectorAll('.theme-toggle-btn, .theme-toggle-switch, .theme-toggle-pill, .theme-switch-toggle');
  themeToggles.forEach(el => {
    if (isDark) {
      el.classList.add('dark-active');
      el.setAttribute('aria-checked', 'true');
    } else {
      el.classList.remove('dark-active');
      el.setAttribute('aria-checked', 'false');
    }
  });

  const textIndicators = document.querySelectorAll('.theme-text-indicator');
  textIndicators.forEach(el => {
    el.textContent = isDark ? 'โหมดมืด' : 'โหมดสว่าง';
  });

  const themeIcons = document.querySelectorAll('.theme-icon-indicator');
  themeIcons.forEach(el => {
    el.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
  });

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

window.toggleTheme = toggleTheme;
window.setAppTheme = setAppTheme;

