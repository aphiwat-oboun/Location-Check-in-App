/**
 * "ที่นี่มีอะไร?" Interactive Map Engine
 * Leaflet.js with custom Circular Photo Markers & Floating Card
 */

let appMap = null;
let currentMarkers = [];
let activeMarkerId = null;

var DEFAULT_PLACEHOLDER_AVATAR = window.DEFAULT_PLACEHOLDER_AVATAR || "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 fill=%22%23E5E7EB%22 rx=%2264%22/%3E%3Ccircle cx=%2264%22 cy=%2246%22 r=%2222%22 fill=%22%239CA3AF%22/%3E%3Cpath d=%22M24 108c0-22.091 17.909-38 40-38s40 15.909 40 38%22 fill=%22%239CA3AF%22/%3E%3C/svg%3E";

function initWhatsHereMap(containerId = 'map-container', initialLocations = [], selectedLocId = null) {
  const mapElement = document.getElementById(containerId);
  if (!mapElement) return;

  if (typeof L === 'undefined') {
    setTimeout(() => initWhatsHereMap(containerId, initialLocations, selectedLocId), 250);
    return;
  }

  // If container height/width is not yet computed by DOM layout, wait briefly
  if (mapElement.clientHeight === 0 || mapElement.clientWidth === 0) {
    setTimeout(() => initWhatsHereMap(containerId, initialLocations, selectedLocId), 50);
    return;
  }

  // Destroy previous map instance if re-initializing
  if (appMap) {
    try { appMap.remove(); } catch(e) {}
    appMap = null;
  }

  // Default coordinates: center on selected location if available, otherwise Mueang Si Sa Ket
  let defaultLat = 15.1120;
  let defaultLng = 104.3180;
  let defaultZoom = 13.5;

  if (selectedLocId && initialLocations && initialLocations.length > 0) {
    const matched = initialLocations.find(l => l.id === selectedLocId);
    if (matched && matched.lat && matched.lng) {
      defaultLat = matched.lat;
      defaultLng = matched.lng;
      defaultZoom = 14;
    }
  }

  appMap = L.map(containerId, {
    center: [defaultLat, defaultLng],
    zoom: defaultZoom,
    minZoom: 6,
    maxZoom: 19,
    zoomControl: false,
    attributionControl: false
  });
  window.appMap = appMap;

  // Standard OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    minZoom: 6,
    attribution: '© OpenStreetMap contributors'
  }).addTo(appMap);

  // Ensure map fills container dimensions properly upon rendering without requiring manual zoom
  appMap.whenReady(() => {
    appMap.invalidateSize({ animate: false, reset: true });
  });

  [50, 150, 300, 600, 1000].forEach(delay => {
    setTimeout(() => {
      if (appMap) appMap.invalidateSize({ animate: false, reset: false });
    }, delay);
  });

  window.addEventListener('resize', () => {
    if (appMap) appMap.invalidateSize();
  });

  if (initialLocations && initialLocations.length > 0) {
    renderPhotoMarkers(initialLocations, selectedLocId);
  } else {
    // Fetch from API
    fetch('/locations/api/list/')
      .then(res => res.json())
      .then(data => {
        renderPhotoMarkers(data.locations, selectedLocId);
      })
      .catch(err => console.error('Error fetching map markers:', err));
  }
}

function renderPhotoMarkers(locations, defaultSelectedId = null) {
  // Clear existing
  currentMarkers.forEach(m => {
    if (appMap) appMap.removeLayer(m);
  });
  currentMarkers = [];

  locations.forEach(loc => {
    const iconHtml = `
      <div class="photo-marker ${defaultSelectedId === loc.id ? 'active' : ''}" id="marker-dom-${loc.id}">
        <div class="photo-marker-inner">
          <img class="photo-marker-img" src="${loc.cover_url}" alt="${loc.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';">
        </div>
        <div class="photo-marker-pointer"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-marker',
      iconSize: [46, 52],
      iconAnchor: [23, 50]
    });

    const marker = L.marker([loc.lat, loc.lng], { 
      icon: customIcon,
      zIndexOffset: defaultSelectedId === loc.id ? 1000 : 0
    }).addTo(appMap);

    marker.on('click', () => {
      selectLocationOnMap(loc);
    });

    marker.locationData = loc;
    currentMarkers.push(marker);

    // Initial select
    if (defaultSelectedId === loc.id) {
      selectLocationOnMap(loc, false, false);
    }
  });

  if (appMap) {
    appMap.invalidateSize();
  }
}

function selectLocationOnMap(loc, smoothPan = true, isUserClick = true) {
  activeMarkerId = loc.id;

  // Update DOM marker classes
  document.querySelectorAll('.photo-marker').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`marker-dom-${loc.id}`);
  if (activeEl) {
    activeEl.classList.add('active');
  }

  // Pan map
  if (smoothPan && appMap) {
    appMap.flyTo([loc.lat, loc.lng], 14, {
      duration: 0.8
    });
  } else if (appMap && !smoothPan) {
    appMap.setView([loc.lat, loc.lng], 14);
  }

  const post = loc.latest_post || {};

  // Calculate current distance if user position is available
  let calculatedDist = `${loc.distance_km || 1.2} กม.`;
  if (window.currentUserLat && window.currentUserLng) {
    const d = calculateHaversineDistance(window.currentUserLat, window.currentUserLng, loc.lat, loc.lng);
    calculatedDist = d < 1 ? `${Math.round(d * 1000)} ม.` : `${d.toFixed(1)} กม.`;
  }

  // If Mobile screen (width <= 1024) AND user explicitly clicked, trigger Mobile Bottom Sheet Drawer
  if (isUserClick && window.innerWidth <= 1024 && typeof openMobileBottomSheet === 'function') {
    const bottomSheetHtml = `
      <div style="position:relative;">
        <div style="width:100%;height:180px;border-radius:16px;overflow:hidden;margin-bottom:14px;position:relative;background:#f0f0f0;">
          <img src="${loc.cover_url}" alt="${loc.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';">
          <button onclick="closeMobileBottomSheet()" class="btn-icon-circle" style="position:absolute;top:10px;right:10px;width:34px;height:34px;background:rgba(255,255,255,0.9);backdrop-filter:blur(4px);">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </div>
        <h3 style="font-size:20px;font-weight:700;color:var(--text-main);margin-bottom:2px;">${loc.name}</h3>
        <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:8px;">${loc.city} • <span class="distance-badge" data-lat="${loc.lat}" data-lng="${loc.lng}">${calculatedDist}</span></p>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);margin-bottom:10px;">
          <img src="${post.author_avatar || DEFAULT_PLACEHOLDER_AVATAR}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
          <span>โดย ${post.author_name || 'ผู้ใช้'}</span>
        </div>
        <p style="font-size:14px;color:var(--text-main);line-height:1.5;margin-bottom:16px;">${post.caption || 'บรรยากาศดีมาก น่าแวะมาเที่ยว 🌿'}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button onclick="navigateToLocation(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')" class="btn-primary" style="background:#159F8C;color:#FFF;border-radius:9999px;min-height:48px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">
            <i data-lucide="navigation" style="width:18px;height:18px;"></i>
            <span>นำทาง</span>
          </button>
          <a href="/locations/${loc.id}/" class="btn-secondary" style="text-decoration:none;border-radius:9999px;min-height:48px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span>ดูรายละเอียด</span>
            <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
          </a>
        </div>
      </div>
    `;
    openMobileBottomSheet(bottomSheetHtml);
    return;
  }

  // Update Floating Card for Desktop
  const card = document.getElementById('selected-map-card');
  if (card) {
    card.style.display = 'block';
    card.innerHTML = `
      <div class="map-card-image-wrap">
        <img class="map-card-image" src="${loc.cover_url}" alt="${loc.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';">
        <button class="btn-icon-circle" onclick="closeMapCard(event)" style="position:absolute;top:8px;right:8px;width:28px;height:28px;background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);">
          <i data-lucide="x" style="width:14px;height:14px;"></i>
        </button>
      </div>
      <div class="map-card-content">
        <div class="map-card-header">
          <div>
            <h4 class="map-card-title">${loc.name}</h4>
            <span class="map-card-city">${loc.city} • <span class="distance-badge" data-lat="${loc.lat}" data-lng="${loc.lng}">${calculatedDist}</span></span>
          </div>
        </div>
        <div class="map-card-author">
          <img class="map-card-author-avatar" src="${post.author_avatar || DEFAULT_PLACEHOLDER_AVATAR}" alt="">
          <span>โดย ${post.author_name || 'ผู้ใช้'}</span>
        </div>
        <p class="map-card-caption">${post.caption || 'บรรยากาศดีมาก น่าแวะมาเที่ยว 🌿'}</p>
        <div class="map-card-footer" style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button onclick="navigateToLocation(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')" class="btn-primary" style="flex:1;padding:8px 12px;font-size:13px;border-radius:9999px;display:flex;align-items:center;justify-content:center;gap:4px;">
            <i data-lucide="navigation" style="width:15px;height:15px;"></i>
            <span>นำทาง</span>
          </button>
          <a href="/locations/${loc.id}/" class="btn-secondary" style="padding:8px 14px;font-size:12.5px;border-radius:9999px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:var(--text-main);font-weight:600;">
            <span>ดูรายละเอียด</span>
          </a>
        </div>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

function closeMapCard(e) {
  if (e) e.stopPropagation();
  const card = document.getElementById('selected-map-card');
  if (card) {
    card.style.display = 'none';
  }
  document.querySelectorAll('.photo-marker').forEach(el => el.classList.remove('active'));
}

// Map Controls
function mapZoomIn() {
  if (appMap) appMap.zoomIn();
}

function mapZoomOut() {
  if (appMap) appMap.zoomOut();
}

function mapCurrentLocation() {
  if (!navigator.geolocation) {
    alert('อุปกรณ์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (appMap) {
        appMap.flyTo([lat, lng], 15);
        L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#159F8C',
          color: '#FFFFFF',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(appMap).bindPopup('ตำแหน่งของคุณ').openPopup();
      }
    },
    err => {
      alert('ไม่สามารถเข้าถึงตำแหน่งของคุณได้');
    }
  );
}

function mapCenterDefault() {
  if (appMap) {
    appMap.flyTo([15.1120, 104.3180], 13.5);
  }
}