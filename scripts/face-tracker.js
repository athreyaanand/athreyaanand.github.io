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

  preloadImages(basePath, null, (cache) => {
    imageCache = cache;
    loadingEl.classList.add('hidden');
    img.classList.add('loaded');

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
              if (dead) return;
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

  // --- Gravity toggle reaction ---
  window.addEventListener('gravityToggle', (e) => {
    if (e.detail.on) {
      animateGaze({ x: 0, y: 0 }, { x: 0, y: -9 }, 400, () => {});
    } else {
      animateGaze({ x: 0, y: -9 }, { x: 0, y: 0 }, 400, () => {});
    }
  });

  // --- Konami blast reaction ---
  window.addEventListener('konamiBlast', () => {
    gazeSequence([
      { x: 0, y: 9, duration: 200, pause: 100 },
      { x: -12, y: 6, duration: 250, pause: 80 },
      { x: 12, y: -6, duration: 300, pause: 80 },
      { x: -9, y: -3, duration: 250, pause: 80 },
      { x: 0, y: 0, duration: 300, pause: 0 },
    ], () => {});
  });

  // --- Head petting ---
  const petZone = document.createElement('div');
  petZone.className = 'pet-zone';
  container.appendChild(petZone);

  // Heart pool — appended to center-island so they float above, not clipped
  const HEART_POOL_SIZE = 10;
  const petHearts = [];
  const heartParent = container.closest('.center-island') || container;
  for (let i = 0; i < HEART_POOL_SIZE; i++) {
    const h = document.createElement('div');
    h.className = 'pet-heart';
    h.textContent = '\u2764';
    heartParent.appendChild(h);
    petHearts.push(h);
  }
  let nextHeart = 0;
  let lastHeartTime = 0;

  function spawnPetHeart() {
    const now = performance.now();
    if (now - lastHeartTime < 300) return; // throttle: one heart per 300ms
    lastHeartTime = now;
    const h = petHearts[nextHeart];
    nextHeart = (nextHeart + 1) % HEART_POOL_SIZE;
    h.classList.remove('active');
    void h.offsetWidth;
    // Narrow spawn to head width (~middle 50% of face tracker)
    const rect = container.getBoundingClientRect();
    const parentRect = heartParent.getBoundingClientRect();
    const headLeft = rect.width * 0.25;
    const headWidth = rect.width * 0.5;
    h.style.left = (rect.left - parentRect.left + headLeft + Math.random() * headWidth) + 'px';
    h.style.top = (rect.top - parentRect.top - 5) + 'px';
    h.classList.add('active');
  }

  let petDirs = [];
  let petting = false;
  let petTimeout = null;
  let lastPetX = null;
  let petStartTime = 0;
  const PET_THRESHOLD_MS = 600; // must pet for 600ms before hearts appear

  function stopPetting() {
    petting = false;
    petStartTime = 0;
    petDirs = [];
    lastPetX = null;
    petZone.classList.remove('petting');
    container.classList.remove('being-petted');
  }

  function checkPetting(clientX, clientY) {
    if (lastPetX !== null) {
      const dir = clientX > lastPetX ? 1 : clientX < lastPetX ? -1 : 0;
      if (dir !== 0) {
        const now = performance.now();
        petDirs.push({ dir, t: now });
        petDirs = petDirs.filter(d => now - d.t < 600);

        let changes = 0;
        for (let i = 1; i < petDirs.length; i++) {
          if (petDirs[i].dir !== petDirs[i - 1].dir) changes++;
        }

        // Start tracking pet time after enough direction changes
        if (changes >= 3 && !petStartTime) {
          petStartTime = now;
          petZone.classList.add('petting');
          container.classList.add('being-petted');
        }

        // Hearts + blushing only after sustained petting
        if (petStartTime && now - petStartTime > PET_THRESHOLD_MS) {
          if (!petting) {
            petting = true;
          }
          spawnPetHeart();
        }
      }
    }
    lastPetX = clientX;

    clearTimeout(petTimeout);
    petTimeout = setTimeout(stopPetting, 400);
  }

  petZone.addEventListener('mousemove', (e) => checkPetting(e.clientX, e.clientY));
  petZone.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) checkPetting(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  petZone.addEventListener('mouseleave', () => {
    lastPetX = null;
    petDirs = [];
    stopPetting();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.face-tracker').forEach((el) => initializeFaceTracker(el));
});
