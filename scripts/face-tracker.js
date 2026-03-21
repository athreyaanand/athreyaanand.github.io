// Grid configuration (must match your generated images)
const P_MIN = -15;
const P_MAX = 15;
const STEP = 3;
const SIZE = 256;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function quantizeToGrid(val) {
  const raw = P_MIN + (val + 1) * (P_MAX - P_MIN) / 2;
  const snapped = Math.round(raw / STEP) * STEP;
  return clamp(snapped, P_MIN, P_MAX);
}

function sanitize(val) {
  const str = Number(val).toFixed(1);
  return str.replace('-', 'm').replace('.', 'p');
}

function gridToFilename(px, py) {
  return `gaze_px${sanitize(px)}_py${sanitize(py)}_${SIZE}.webp`;
}

// Generate all possible filenames for preloading
function getAllFilenames() {
  const filenames = [];
  for (let px = P_MIN; px <= P_MAX; px += STEP) {
    for (let py = P_MIN; py <= P_MAX; py += STEP) {
      filenames.push(gridToFilename(px, py));
    }
  }
  return filenames;
}

// Preload all images into an in-memory cache
function preloadImages(basePath, onProgress, onComplete) {
  const filenames = getAllFilenames();
  const cache = new Map();
  let loaded = 0;
  const total = filenames.length;

  filenames.forEach((filename) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      cache.set(filename, img);
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (loaded === total && onComplete) onComplete(cache);
    };
    img.src = `${basePath}${filename}`;
  });

  return cache;
}

function initializeFaceTracker(container) {
  const basePath = container.dataset.basePath || '/faces/';

  // Create the display image
  const img = document.createElement('img');
  img.className = 'face-image';
  img.alt = 'Face following gaze';
  img.draggable = false;
  container.appendChild(img);

  // Loading overlay
  const loadingEl = document.createElement('div');
  loadingEl.className = 'face-loading';
  loadingEl.innerHTML = '<div class="face-loading-spinner"></div>';
  container.appendChild(loadingEl);

  let imageCache = null;
  let rafId = null;
  let pendingX = null;
  let pendingY = null;
  let currentFilename = '';

  function applyGaze() {
    rafId = null;
    if (pendingX === null) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const nx = clamp((pendingX - centerX) / (rect.width / 2), -1, 1);
    const ny = clamp((centerY - pendingY) / (rect.height / 2), -1, 1);

    const px = quantizeToGrid(nx);
    const py = quantizeToGrid(ny);
    const filename = gridToFilename(px, py);

    if (filename !== currentFilename) {
      currentFilename = filename;
      if (imageCache && imageCache.has(filename)) {
        img.src = imageCache.get(filename).src;
      } else {
        img.src = `${basePath}${filename}`;
      }
    }
  }

  function scheduleUpdate(clientX, clientY) {
    pendingX = clientX;
    pendingY = clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(applyGaze);
    }
  }

  function handleMouseMove(e) {
    scheduleUpdate(e.clientX, e.clientY);
  }

  function handleTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      const t = e.touches[0];
      scheduleUpdate(t.clientX, t.clientY);
    }
  }

  // Show center image immediately, then preload all
  const centerFilename = gridToFilename(0, 0);
  currentFilename = centerFilename;
  img.src = `${basePath}${centerFilename}`;
  img.onload = () => {
    img.classList.add('loaded');
  };

  preloadImages(basePath, null, (cache) => {
    imageCache = cache;
    loadingEl.classList.add('hidden');
    img.classList.add('loaded');

    // Start tracking only after images are cached
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.face-tracker').forEach((el) => initializeFaceTracker(el));
});
