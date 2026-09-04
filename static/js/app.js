/**
 * "ที่นี่มีอะไร?" Global App Scripts
 * Real-time GPS Distance, AJAX Like/Comment/Notifications, and Map Directions
 */

window.currentUserLat = null;
window.currentUserLng = null;
window.activeReplyParentId = null;

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
window.calculateHaversineDistance = calculateHaversineDistance;
window.getCookie = getCookie;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Initialize Real-time GPS Distance Tracking
  initRealTimeGPSDistance();

  // Attach event listeners to existing like buttons
  document.querySelectorAll('.btn-like-action, .btn-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      if (postId) toggleLike(e, postId);
    });
  });

  // Attach event listeners to existing save buttons
  document.querySelectorAll('.btn-save-action, .btn-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      if (postId) toggleSave(e, postId);
    });
  });

  // Check notifications count
  fetchNotifications();
});

/**
 * Real-Time GPS Distance Calculation (Haversine Formula)
 */
function initRealTimeGPSDistance() {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser.');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  };

  navigator.geolocation.getCurrentPosition(updateDistanceElements, handleGPSError, options);
  navigator.geolocation.watchPosition(updateDistanceElements, handleGPSError, options);
}

function updateDistanceElements(pos) {
  if (!pos || !pos.coords) return;
  window.currentUserLat = pos.coords.latitude;
  window.currentUserLng = pos.coords.longitude;

  const distanceBadges = document.querySelectorAll('.distance-badge, [data-lat][data-lng]');
  distanceBadges.forEach(el => {
    const destLat = parseFloat(el.getAttribute('data-lat'));
    const destLng = parseFloat(el.getAttribute('data-lng'));
    if (!isNaN(destLat) && !isNaN(destLng)) {
      const dist = calculateHaversineDistance(window.currentUserLat, window.currentUserLng, destLat, destLng);
      el.textContent = dist < 1 ? `${Math.round(dist * 1000)} ม.` : `${dist.toFixed(1)} กม.`;
    }
  });
}

function handleGPSError(err) {
  console.log('GPS location info:', err.message);
  if (!window.currentUserLat) {
    window.currentUserLat = 15.1120;
    window.currentUserLng = 104.3180;
  }
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

    const commentsHtml = renderCommentListHtml(data.comments);

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

function renderCommentListHtml(comments) {
  if (!comments || comments.length === 0) {
    return `<div style="text-align:center;padding:24px 12px;color:var(--text-muted);font-size:13.5px;">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย! 💬</div>`;
  }

  return comments.map(c => `
    <div style="display:flex;gap:10px;font-size:13.5px;">
      <img src="${c.author_avatar || 'https://ui-avatars.com/api/?name=U&background=159F8C&color=fff'}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">
      <div style="flex:1;">
        <div style="background:#F3F4F6;padding:10px 14px;border-radius:14px;display:inline-block;max-width:100%;">
          <div style="font-weight:700;color:var(--text-main);font-size:13px;margin-bottom:2px;">${c.author_name}</div>
          <div style="color:var(--text-main);line-height:1.4;word-break:break-word;">${c.content}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px;font-size:11.5px;color:var(--text-muted);padding-left:4px;">
          <span>${c.created_at}</span>
          <button onclick="setCommentReply(${c.id}, '${c.author_name.replace(/'/g, "\\'")}')" style="border:none;background:none;color:var(--primary);font-weight:600;cursor:pointer;padding:0;">ตอบกลับ</button>
        </div>

        ${c.replies && c.replies.length > 0 ? `
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;padding-left:12px;border-left:2px solid #E5E7EB;">
            ${c.replies.map(r => `
              <div style="display:flex;gap:8px;font-size:13px;">
                <img src="${r.author_avatar || 'https://ui-avatars.com/api/?name=U&background=159F8C&color=fff'}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div>
                  <div style="background:#F9FAFB;padding:8px 12px;border-radius:12px;display:inline-block;">
                    <div style="font-weight:700;color:var(--text-main);font-size:12.5px;">${r.author_name}</div>
                    <div style="color:var(--text-main);line-height:1.4;">${r.content}</div>
                  </div>
                  <div style="margin-top:2px;font-size:11px;color:var(--text-muted);">${r.created_at}</div>
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
        if (container) container.innerHTML = renderCommentListHtml(modalData.comments);
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
 * Notifications Engine (Fetch & Drawer)
 */
async function fetchNotifications() {
  try {
    const res = await fetch('/interactions/notifications/');
    if (!res.ok) return;
    const data = await res.json();

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

      // Attach click handler to toggle notifications drawer
      btn.onclick = (e) => {
        e.preventDefault();
        toggleNotificationDrawer(data.notifications);
      };
    });
  } catch (err) {
    console.log('Notifications check:', err.message);
  }
}

async function toggleNotificationDrawer(notifications) {
  // Mark as read via API
  fetch('/interactions/notifications/read/', {
    method: 'POST',
    headers: { 'X-CSRFToken': getCookie('csrftoken') }
  });

  // Remove badges
  document.querySelectorAll('.notification-badge').forEach(b => b.remove());

  const listHtml = (!notifications || notifications.length === 0)
    ? `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13.5px;">ไม่มีการแจ้งเตือนในขณะนี้ 🔔</div>`
    : notifications.map(n => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:${n.is_read ? '#FFFFFF' : '#E6F5F3'};margin-bottom:8px;border:1px solid #E5E7EB;">
        <img src="${n.actor_avatar || 'https://ui-avatars.com/api/?name=U&background=159F8C&color=fff'}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">
        <div style="flex:1;">
          <div style="font-size:13px;color:var(--text-main);line-height:1.3;">
            <b style="font-weight:700;">${n.actor_name}</b> ${n.text}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${n.created_at}</div>
        </div>
      </div>
    `).join('');

  const drawerHtml = `
    <div style="padding:10px 4px 20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <h3 style="font-size:17px;font-weight:700;color:var(--text-main);margin:0;">การแจ้งเตือน 🔔</h3>
        <button onclick="closeMobileBottomSheet()" class="btn-icon-circle" style="width:32px;height:32px;">
          <i data-lucide="x" style="width:16px;height:16px;"></i>
        </button>
      </div>
      <div style="max-height:60vh;overflow-y:auto;">
        ${listHtml}
      </div>
    </div>
  `;

  openMobileBottomSheet(drawerHtml);
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
  return cookieValue;
}

// Explicitly expose functions to window object
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
window.calculateHaversineDistance = calculateHaversineDistance;
window.getCookie = getCookie;
