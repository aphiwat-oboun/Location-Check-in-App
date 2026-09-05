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
window.openCommentModal = openCommentModal;
window.submitComment = submitComment;
window.setCommentReply = setCommentReply;
window.cancelCommentReply = cancelCommentReply;
window.fetchNotifications = fetchNotifications;
window.toggleNotificationDrawer = toggleNotificationDrawer;
window.navigateToLocation = navigateToLocation;
window.initRealTimeGPSDistance = initRealTimeGPSDistance;
window.requestGPSPermissionPrompt = requestGPSPermissionPrompt;
window.acceptGPSPermission = acceptGPSPermission;
window.declineGPSPermission = declineGPSPermission;
window.calculateHaversineDistance = calculateHaversineDistance;
window.getCookie = getCookie;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Set initial loading GPS badge content
  document.querySelectorAll('.user-gps-location-text').forEach(el => {
    el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:var(--primary);"></i> <span>กำลังระบุพิกัดของคุณ...</span>`;
  });
  if (window.lucide) lucide.createIcons();

  // Initialize Real-time GPS Tracking based on user's actual location
  initRealTimeGPSDistance();

  // Check notifications count
  fetchNotifications();
});

/**
 * Real-Time GPS Distance Calculation (Haversine Formula) & Reverse Geocoding
 */
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
  initRealTimeGPSDistance();
}

function declineGPSPermission() {
  localStorage.setItem('gps_permission_status', 'declined');
  if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
  detectLocationViaIP();
}

function initRealTimeGPSDistance() {
  if (!navigator.geolocation) {
    detectLocationViaIP();
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 10000
  };

  navigator.geolocation.getCurrentPosition(updateDistanceElements, handleGPSError, options);
  navigator.geolocation.watchPosition(updateDistanceElements, handleGPSError, options);
}

function updateDistanceElements(pos) {
  if (!pos || !pos.coords) return;
  window.currentUserLat = pos.coords.latitude;
  window.currentUserLng = pos.coords.longitude;

  // Recalculate distance for all location badges on page
  recalculateAllDistances();

  // Reverse geocode to get city / district name in Thai
  fetchReverseGeocodeAddress(window.currentUserLat, window.currentUserLng);
}

function recalculateAllDistances() {
  if (!window.currentUserLat || !window.currentUserLng) return;

  const distanceBadges = document.querySelectorAll('.distance-badge, [data-lat][data-lng]');
  distanceBadges.forEach(el => {
    const destLat = parseFloat(el.getAttribute('data-lat'));
    const destLng = parseFloat(el.getAttribute('data-lng'));
    if (!isNaN(destLat) && !isNaN(destLng)) {
      const dist = calculateHaversineDistance(window.currentUserLat, window.currentUserLng, destLat, destLng);
      const text = dist < 1 ? `${Math.round(dist * 1000)} ม.` : `${dist.toFixed(1)} กม.`;
      el.textContent = text;
      el.setAttribute('title', `คำนวณจาก GPS ตำแหน่งจริงของคุณ (${text})`);
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

        // Update GPS Location Badge to user's real location
        document.querySelectorAll('.user-gps-location-text').forEach(el => {
          el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:#10B981;stroke-width:2.5;"></i> <span>GPS: ${fullLocationName}</span>`;
          if (window.lucide) lucide.createIcons();
        });
      }
    })
    .catch(err => console.log('Reverse geocode note:', err));
}

function handleGPSError(err) {
  console.log('Browser GPS prompt info:', err.message);
  detectLocationViaIP();
}

function detectLocationViaIP() {
  // Automatic fallback to user's network location so location is accurate even without GPS antenna
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      if (data && data.latitude && data.longitude) {
        window.currentUserLat = data.latitude;
        window.currentUserLng = data.longitude;
        recalculateAllDistances();
        fetchReverseGeocodeAddress(window.currentUserLat, window.currentUserLng);
      } else {
        showDefaultGPSBadge();
      }
    })
    .catch(() => {
      showDefaultGPSBadge();
    });
}

function showDefaultGPSBadge() {
  document.querySelectorAll('.user-gps-location-text').forEach(el => {
    el.innerHTML = `<i data-lucide="crosshair" style="width:13px;height:13px;color:var(--primary);"></i> <span>คลิกเพื่อเปิด GPS</span>`;
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
 */
async function toggleLike(arg1, arg2) {
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
    const res = await fetch(`/interactions/like/${postId}/`, {
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
      const btns = document.querySelectorAll(`[data-post-id="${postId}"].btn-like-action, [data-post-id="${postId}"].btn-like, .like-btn-${postId}`);
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
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid #E5E7EB;margin-bottom:12px;">
          <h3 style="font-size:17px;font-weight:700;color:var(--text-main);margin:0;">ความคิดเห็น (<span class="modal-comment-count">${data.comments_count}</span>)</h3>
          <button onclick="closeMobileBottomSheet()" class="btn-icon-circle" style="width:32px;height:32px;">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </div>

        <div id="commentListContainer" style="flex:1;overflow-y:auto;padding-right:4px;margin-bottom:14px;display:flex;flex-direction:column;gap:14px;min-height:120px;">
          ${commentsHtml}
        </div>

        <!-- Reply Tag Bar -->
        <div id="replyingPillBar" style="display:none;align-items:center;justify-content:space-between;background:#E6F5F3;padding:6px 12px;border-radius:8px;font-size:12.5px;color:#117A70;margin-bottom:8px;">
          <span>กำลังตอบกลับ <b id="replyingAuthorName"></b></span>
          <button onclick="cancelCommentReply()" style="border:none;background:none;color:#991B1B;font-weight:700;cursor:pointer;">✕</button>
        </div>

        <!-- Comment Input Bar -->
        <form onsubmit="submitComment(event, ${postId})" style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="commentTextInput" placeholder="เขียนความคิดเห็น..." required style="flex:1;min-height:44px;padding:10px 14px;border-radius:9999px;border:1px solid #E5E7EB;background:#F9FAFB;font-size:14px;outline:none;" onfocus="this.style.borderColor='#159F8C';this.style.background='#FFFFFF'">
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
        <div style="background:#F3F4F6;padding:10px 14px;border-radius:14px;display:inline-block;max-width:100%;">
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
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;padding-left:12px;border-left:2px solid #E5E7EB;">
            ${c.replies.map(r => `
              <div id="comment-item-${r.id}" style="display:flex;gap:8px;font-size:13px;">
                <a href="/accounts/profile/${r.author_username || ''}/" style="text-decoration:none;flex-shrink:0;">
                  <img src="${r.author_avatar || DEFAULT_PLACEHOLDER_AVATAR}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                </a>
                <div>
                  <div style="background:#F9FAFB;padding:8px 12px;border-radius:12px;display:inline-block;">
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
  const drawer = document.getElementById('socialNotiDrawer');
  const backdrop = document.getElementById('socialNotiBackdrop');
  if (drawer && backdrop) {
    drawer.classList.add('show');
    backdrop.classList.add('show');
    renderSocialNotifications(window._currentNotiFilter || 'all');
  }

  // Refresh latest notifications in background
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
    let badgeBg = '#2563EB';
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
    }, 800);
  } else {
    banner.style.display = 'none';
  }
}

function acceptCookieConsent() {
  localStorage.setItem('cookie_consent_status', 'accepted');
  const banner = document.getElementById('cookieConsentBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => { banner.style.display = 'none'; }, 300);
  }
}

function declineCookieConsent() {
  localStorage.setItem('cookie_consent_status', 'declined');
  const banner = document.getElementById('cookieConsentBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => { banner.style.display = 'none'; }, 300);
  }
}

function confirmLogout(e, logoutUrl) {
  if (e) e.preventDefault();
  const url = logoutUrl || '/accounts/logout/';
  
  const modalHtml = `
    <div style="text-align:center;padding:16px 8px 8px;">
      <div style="width:54px;height:54px;border-radius:50%;background:#FEE2E2;color:#EF4444;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 4px 14px rgba(239,68,68,0.2);">
        <i data-lucide="log-out" style="width:26px;height:26px;"></i>
      </div>
      <h3 style="font-size:18px;font-weight:700;color:var(--text-main);margin-bottom:6px;">ยืนยันการออกจากระบบ</h3>
      <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:22px;line-height:1.45;">
        คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ?
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button onclick="closeMobileBottomSheet()" style="padding:11px 16px;border-radius:9999px;border:1px solid #E5E7EB;background:#F9FAFB;color:#4B5563;font-size:14px;font-weight:600;cursor:pointer;">
          ยกเลิก
        </button>
        <a href="${url}" style="padding:11px 16px;border-radius:9999px;border:none;background:#EF4444;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(239,68,68,0.3);">
          ออกจากระบบ
        </a>
      </div>
    </div>
  `;

  if (typeof openMobileBottomSheet === 'function') {
    openMobileBottomSheet(modalHtml);
  } else {
    showCustomConfirm(
      'ออกจากระบบ',
      'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ?',
      () => { window.location.href = url; },
      { type: 'danger', confirmText: 'ออกจากระบบ', cancelText: 'ยกเลิก', icon: '🚪' }
    );
  }
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

async function sharePost(postId, title = 'ที่นี่มีอะไร?') {
  const url = `${window.location.origin}/posts/${postId}/`;
  const shareTitle = title || 'ที่นี่มีอะไร? - ค้นพบสถานที่น่าสนใจ';
  const shareText = `เช็กอินและดูเรื่องราว "${shareTitle}" บน ที่นี่มีอะไร?`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: url
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  openShareBottomSheet(url, shareTitle);
}

async function shareProfile(username, displayName = '') {
  const url = `${window.location.origin}/accounts/profile/${username}/`;
  const shareTitle = `โปรไฟล์ ${displayName || username} (@${username})`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: `ดูโปรไฟล์และการเช็กอินของ ${displayName || username} บน ที่นี่มีอะไร?`,
        url: url
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  openShareBottomSheet(url, shareTitle);
}

function openShareBottomSheet(url, title = 'แชร์เรื่องราว') {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const modalHtml = `
    <div style="padding: 10px 4px 18px;">
      <div style="text-align: center; padding-bottom: 14px; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0 0 4px 0;">แชร์ไปยัง</h3>
        <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">${title}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; text-align: center;">
        <!-- Copy Link -->
        <button onclick="copyToClipboard('${url}')" style="display: flex; flex-direction: column; align-items: center; gap: 8px; border: none; background: none; cursor: pointer; padding: 4px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #F3F4F6; color: #374151; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <i data-lucide="link" style="width: 20px; height: 20px;"></i>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main);">คัดลอกลิงก์</span>
        </button>

        <!-- LINE -->
        <a href="https://social-plugins.line.me/lineit/share?url=${encodedUrl}" target="_blank" style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; padding: 4px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #06C755; color: #FFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(6,199,85,0.3);">
            <i data-lucide="message-circle" style="width: 20px; height: 20px;"></i>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main);">LINE</span>
        </a>

        <!-- Facebook -->
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; padding: 4px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #1877F2; color: #FFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(24,119,242,0.3);">
            <i data-lucide="facebook" style="width: 20px; height: 20px;"></i>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main);">Facebook</span>
        </a>

        <!-- X (Twitter) -->
        <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; padding: 4px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #000000; color: #FFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <i data-lucide="twitter" style="width: 20px; height: 20px;"></i>
          </div>
          <span style="font-size: 11.5px; font-weight: 600; color: var(--text-main);">X (Twitter)</span>
        </a>
      </div>

      <button onclick="closeMobileBottomSheet()" style="width: 100%; padding: 11px; border-radius: 9999px; border: 1px solid #E5E7EB; background: #F9FAFB; color: var(--text-muted); font-size: 13.5px; font-weight: 600; cursor: pointer;">
        ยกเลิก
      </button>
    </div>
  `;

  openMobileBottomSheet(modalHtml);
}

function copyToClipboard(url) {
  navigator.clipboard.writeText(url).then(() => {
    if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
    alert('📋 คัดลอกลิงก์เรียบร้อยแล้ว!');
  }).catch(() => {
    prompt('คัดลอกลิงก์ได้ที่นี่:', url);
  });
}

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
      alert(data.message || 'ไม่สามารถดำเนินการได้');
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
window.openCommentModal = openCommentModal;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.openPostOptionsMenu = openPostOptionsMenu;
window.confirmDeletePost = confirmDeletePost;
window.copyPostLink = copyPostLink;
window.sharePost = sharePost;
window.shareProfile = shareProfile;
window.openShareBottomSheet = openShareBottomSheet;
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
window.confirmLogout = confirmLogout;
window.showCustomConfirm = showCustomConfirm;
window.showCustomToast = showCustomToast;

document.addEventListener('DOMContentLoaded', () => {
  initCookieConsent();
  fetchNotifications();
});
