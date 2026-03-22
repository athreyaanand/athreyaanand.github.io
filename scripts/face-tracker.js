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
    e.preventDefault();
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

    // Ease-in-out cubic for smooth acceleration/deceleration
    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Animate gaze using rAF with easing — supports X and Y
    function animateGaze(from, to, duration, onDone) {
      const fromX = from.x || 0, fromY = from.y || 0;
      const toX = to.x || 0, toY = to.y || 0;
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = easeInOut(t);
        const rawPx = fromX + (toX - fromX) * eased;
        const rawPy = fromY + (toY - fromY) * eased;
        const px = clamp(Math.round(rawPx / STEP) * STEP, P_MIN, P_MAX);
        const py = clamp(Math.round(rawPy / STEP) * STEP, P_MIN, P_MAX);
        const fn = gridToFilename(px, py);
        if (fn !== currentFilename && imageCache.has(fn)) {
          img.src = imageCache.get(fn).src;
          currentFilename = fn;
        }
        if (t < 1) {
          requestAnimationFrame(tick);
        } else if (onDone) {
          onDone();
        }
      }
      requestAnimationFrame(tick);
    }

    // Chain a sequence of gaze movements: [{x, y, duration, pause, onStart}]
    function gazeSequence(steps, onDone) {
      let i = 0;
      function next() {
        if (i >= steps.length) { if (onDone) onDone(); return; }
        const step = steps[i++];
        const prev = i >= 2 ? steps[i - 2] : { x: 0, y: 0 };
        if (step.onStart) step.onStart();
        animateGaze(
          { x: prev.x || 0, y: prev.y || 0 },
          { x: step.x || 0, y: step.y || 0 },
          step.duration,
          () => setTimeout(next, step.pause || 0)
        );
      }
      next();
    }

    // Trigger entrance animation
    const island = container.closest('.center-island');
    if (island) island.classList.add('ready');

    // After face slides up (0.8s delay + 0.6s duration), begin choreography
    setTimeout(() => {
      // Look down → plaque drops → look up → bouncers → look around in awe
      animateGaze({ y: 0 }, { y: -12 }, 350, () => {
        if (island) island.classList.add('plaque-in');
        setTimeout(() => {
          animateGaze({ y: -12 }, { y: 0 }, 350, () => {
            function launchPills(x, y) {
              window.dispatchEvent(new CustomEvent('pillLaunch', { detail: { x, y } }));
            }

            // Signal bouncers to prepare (arena visible, pills hidden)
            window.dispatchEvent(new CustomEvent('faceTrackerReady'));

            // Look around — pills shoot out with each glance
            setTimeout(() => {
              gazeSequence([
                { x: -12, y: 3, duration: 300, pause: 150,
                  onStart: () => launchPills(-12, 3) },
                { x: 9, y: 6, duration: 350, pause: 100,
                  onStart: () => launchPills(9, 6) },
                { x: -6, y: -6, duration: 300, pause: 120,
                  onStart: () => launchPills(-6, -6) },
                { x: 12, y: -3, duration: 350, pause: 150,
                  onStart: () => launchPills(12, -3) },
                { x: 0, y: 0, duration: 400, pause: 0 },
              ], () => {
                // Enable cursor tracking
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('touchmove', handleTouchMove, { passive: false });
              });
            }, 500);

            // --- Hearts / Lives easter egg ---
            let lives = 3;
            let heartsRevealed = false;
            let flinching = false;
            let dead = false;
            let reviveTimer = null;
            const islandEl = container.closest('.center-island');
            const heartsEl = document.getElementById('hearts');
            const heartSpans = heartsEl ? heartsEl.querySelectorAll('.heart') : [];

            function revealHearts() {
              if (heartsRevealed || !heartsEl) return;
              heartsRevealed = true;
              heartsEl.classList.add('visible');
            }

            function loseHeart() {
              if (lives <= 0) return;
              lives--;
              const idx = lives;
              if (heartSpans[idx]) heartSpans[idx].classList.add('lost');
            }

            function resetHearts() {
              lives = 3;
              heartSpans.forEach((h) => h.classList.remove('lost'));
            }

            function hitFlash() {
              // Shake whole island + red background
              islandEl.classList.add('hit');
              setTimeout(() => {
                islandEl.classList.remove('hit');
                container.style.background = '';
              }, 400);
            }

            function revive() {
              if (reviveTimer) { clearTimeout(reviveTimer); reviveTimer = null; }
              islandEl.classList.remove('dying');
              islandEl.classList.add('reviving');
              resetHearts();

              // Reset gaze to center
              const centerFn = gridToFilename(0, 0);
              if (imageCache.has(centerFn)) img.src = imageCache.get(centerFn).src;
              currentFilename = centerFn;

              // After slide-back animation completes
              setTimeout(() => {
                islandEl.classList.remove('reviving');
                dead = false;
                flinching = false;
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('touchmove', handleTouchMove, { passive: false });
              }, 600);
            }

            function deathSequence() {
              dead = true;
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('touchmove', handleTouchMove);

              // Face looks shocked, then whole island slides off screen
              animateGaze({ x: 0, y: 0 }, { x: 0, y: 9 }, 200, () => {
                islandEl.classList.add('dying');
                // Revive after 5 seconds or on next pill impact
                reviveTimer = setTimeout(revive, 5000);
              });
            }

            window.addEventListener('pillImpact', (e) => {
              // If dead, a pill hit revives
              if (dead) {
                revive();
                return;
              }
              if (flinching) return;

              // Reveal hearts on first hit
              revealHearts();

              // Flash and shake
              hitFlash();
              loseHeart();

              // Flinch
              flinching = true;
              const d = e.detail;
              const fx = clamp(-(d.x || 0) * 0.5, P_MIN, P_MAX);
              const fy = clamp(-(d.y || 0) * 0.5, P_MIN, P_MAX);
              animateGaze({ x: 0, y: 0 }, { x: fx, y: fy }, 150, () => {
                animateGaze({ x: fx, y: fy }, { x: 0, y: 0 }, 200, () => {
                  flinching = false;
                  if (lives <= 0) deathSequence();
                });
              });
            });
          });
        }, 800);
      });
    }, 1400);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.face-tracker').forEach((el) => initializeFaceTracker(el));
});
