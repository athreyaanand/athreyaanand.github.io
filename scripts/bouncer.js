const BOUNCERS = [
  // Projects
  { label: 'Daily Briefing Engine', url: './briefings/', category: 'project' },
  { label: 'Mindless', url: 'https://github.com/athreyaanand/mindless', category: 'project' },
  { label: 'Binder', url: 'https://github.com/athreyaanand/binder', category: 'project' },
  { label: 'Cuex', url: 'https://github.com/athreyaanand/cuex', category: 'project' },
  { label: 'Earthy', url: 'https://github.com/athreyaanand/earthy', category: 'project' },
  // Companies
  { label: 'Cedar', url: 'https://www.cedar.com/', category: 'company' },
  { label: 'Amazon', url: 'https://aws.amazon.com/', category: 'company' },
  { label: 'Tesla', url: 'https://www.tesla.com/', category: 'company' },
  { label: 'Esri', url: 'https://www.esri.com/', category: 'company' },
  { label: 'Boingo Wireless', url: 'https://boingo.com', category: 'company' },
  { label: 'Calicom Video Intelligence', url: 'https://calicom.com', category: 'company' },
  { label: 'Elite Magazine', url: 'https://www.scvelitemagazine.com/', category: 'company' },
  { label: 'TRACE Studios', url: 'https://tracestudios.xyz/', category: 'company' },
  { label: 'Georgia Tech', url: 'https://www.gatech.edu/', category: 'company' },
  // Meta
  { label: 'Old Site', url: './old/index.html', category: 'project' },
];

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22',
  '#1abc9c', '#f39c12', '#e84393', '#0984e3', '#6c5ce7',
];

const MIN_SPEED = 0.3;
const MAX_SPEED = 1.2;
const ISLAND_PAD = 12;
const LAUNCH_SPEED_MIN = 4;
const LAUNCH_SPEED_MAX = 6;
const LAUNCH_FRICTION = 0.997;
const LAUNCH_DECAY_MS = 2000;
const FLING_MAX = 8;
const FLING_DECAY_MS = 1500;
const REPULSION_RADIUS = 80;
const REPULSION_FORCE = 0.08;
const SQUASH_MS = 150;

function randomColor(exclude) {
  let color;
  do {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
  } while (color === exclude && COLORS.length > 1);
  return color;
}

function bounceColor(item) {
  item.color = randomColor(item.color);
  item.el.style.color = item.color;
}

function getIslandRect() {
  const island = document.querySelector('.center-island');
  if (!island) return null;
  const r = island.getBoundingClientRect();
  return {
    left: r.left - ISLAND_PAD,
    right: r.right + ISLAND_PAD,
    top: r.top - ISLAND_PAD,
    bottom: r.bottom + ISLAND_PAD,
  };
}

function initBouncers() {
  const arena = document.getElementById('bouncing-arena');
  if (!arena) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let islandRect = getIslandRect() || { left: vw * 0.3, right: vw * 0.7, top: vh * 0.3, bottom: vh * 0.7 };
  const islandCX = (islandRect.left + islandRect.right) / 2;
  const islandCY = (islandRect.top + islandRect.bottom) / 2;

  // Cursor position for repulsion
  let cursorX = -9999, cursorY = -9999;
  window.addEventListener('mousemove', (e) => { cursorX = e.clientX; cursorY = e.clientY; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) { cursorX = e.touches[0].clientX; cursorY = e.touches[0].clientY; }
  }, { passive: true });

  // Create all pill elements — start hidden at center
  const items = BOUNCERS.map((data) => {
    const el = document.createElement('a');
    el.href = data.url;
    el.textContent = data.label;
    el.className = `bouncer bouncer--${data.category}`;
    el.style.opacity = '0';
    if (data.url.startsWith('http')) {
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    }
    arena.appendChild(el);

    const color = randomColor();
    el.style.color = color;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    return {
      el, w, h, color,
      x: islandCX - w / 2,
      y: islandCY - h / 2,
      vx: 0, vy: 0,
      launched: false,
      launching: false,
      launchTime: 0,
      flung: false,
      flungTime: 0,
      dragging: false,
      dragOffsetX: 0, dragOffsetY: 0,
      dragHistory: [],
      wasDragged: false,
      hovered: false,
      squashAxis: null,
      squashEnd: 0,
    };
  });

  // Split items into batches for staggered launch
  const batchSize = Math.ceil(items.length / 4);
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  let batchIndex = 0;

  // Launch a batch in a gaze direction
  function launchBatch(gazeX, gazeY) {
    if (batchIndex >= batches.length) return;
    const batch = batches[batchIndex++];
    const baseAngle = Math.atan2(-gazeY, gazeX); // screen Y inverted
    const now = performance.now();

    // Spawn from the edge of the island the face is looking toward
    const iw = islandRect.right - islandRect.left;
    const ih = islandRect.bottom - islandRect.top;
    const primaryX = gazeX > 0; // looking right → spawn from right edge
    const primaryLeft = gazeX < 0; // looking left → spawn from left edge

    batch.forEach((item) => {
      const spread = (Math.random() - 0.5) * (Math.PI / 3);
      const angle = baseAngle + spread;
      const speed = LAUNCH_SPEED_MIN + Math.random() * (LAUNCH_SPEED_MAX - LAUNCH_SPEED_MIN);
      item.vx = Math.cos(angle) * speed;
      item.vy = -Math.sin(angle) * speed;

      // Position at the edge the face is looking toward, vertically centered with slight randomness
      const yJitter = (Math.random() - 0.5) * ih * 0.3;
      if (primaryX) {
        item.x = islandRect.right;
        item.y = islandCY - item.h / 2 + yJitter;
      } else if (primaryLeft) {
        item.x = islandRect.left - item.w;
        item.y = islandCY - item.h / 2 + yJitter;
      } else {
        // Looking mostly up/down — spawn from top or bottom edge
        item.x = islandCX - item.w / 2 + (Math.random() - 0.5) * iw * 0.3;
        item.y = gazeY > 0 ? islandRect.top - item.h : islandRect.bottom;
      }

      item.launched = true;
      item.launching = true;
      item.launchTime = now;
      item.el.style.opacity = '1';
    });
  }

  window.addEventListener('pillLaunch', (e) => {
    launchBatch(e.detail.x, e.detail.y);
  });

  // --- Drag and throw ---
  let draggedItem = null;

  function onGrabStart(item, clientX, clientY) {
    item.dragging = true;
    item.dragOffsetX = clientX - item.x;
    item.dragOffsetY = clientY - item.y;
    item.dragHistory = [{ x: clientX, y: clientY, t: performance.now() }];
    item.wasDragged = false;
    item.el.style.zIndex = '100';
    draggedItem = item;
  }

  function onGrabMove(clientX, clientY) {
    if (!draggedItem) return;
    draggedItem.x = clientX - draggedItem.dragOffsetX;
    draggedItem.y = clientY - draggedItem.dragOffsetY;
    const now = performance.now();
    draggedItem.dragHistory.push({ x: clientX, y: clientY, t: now });
    if (draggedItem.dragHistory.length > 5) draggedItem.dragHistory.shift();
    // Check if moved enough to count as drag
    const first = draggedItem.dragHistory[0];
    if (Math.abs(clientX - first.x) > 5 || Math.abs(clientY - first.y) > 5) {
      draggedItem.wasDragged = true;
    }
  }

  function onGrabEnd() {
    if (!draggedItem) return;
    const item = draggedItem;
    item.dragging = false;
    item.el.style.zIndex = '';
    draggedItem = null;

    const h = item.dragHistory;
    if (h.length >= 2) {
      const first = h[0];
      const last = h[h.length - 1];
      const dt = (last.t - first.t) || 1;
      item.vx = ((last.x - first.x) / dt) * 16;
      item.vy = ((last.y - first.y) / dt) * 16;
      const speed = Math.sqrt(item.vx * item.vx + item.vy * item.vy);
      if (speed > FLING_MAX) {
        item.vx = (item.vx / speed) * FLING_MAX;
        item.vy = (item.vy / speed) * FLING_MAX;
      }
      if (speed > MAX_SPEED) {
        item.flung = true;
        item.flungTime = performance.now();
      }
    }
  }

  items.forEach((item) => {
    // Hover
    item.el.addEventListener('mouseenter', () => { item.hovered = true; });
    item.el.addEventListener('mouseleave', () => { item.hovered = false; });

    // Mouse drag
    item.el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onGrabStart(item, e.clientX, e.clientY);
    });

    // Touch drag
    item.el.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        onGrabStart(item, e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Prevent click navigation on drag
    item.el.addEventListener('click', (e) => {
      if (item.wasDragged) {
        e.preventDefault();
        item.wasDragged = false;
      }
    });
  });

  document.addEventListener('mousemove', (e) => onGrabMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', onGrabEnd);
  document.addEventListener('touchmove', (e) => {
    if (draggedItem && e.touches.length > 0) {
      e.preventDefault();
      onGrabMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  document.addEventListener('touchend', onGrabEnd);

  // --- Squash helper ---
  function applySqaush(item, axis) {
    item.squashAxis = axis;
    item.squashEnd = performance.now() + SQUASH_MS;
  }

  // --- Main tick loop ---
  let running = true;
  let lastTime = 0;

  function tick(timestamp) {
    if (!running) {
      lastTime = 0;
      requestAnimationFrame(tick);
      return;
    }

    const delta = lastTime ? Math.min(timestamp - lastTime, 32) : 16;
    lastTime = timestamp;
    const factor = delta / 16;

    const currentVW = window.innerWidth;
    const currentVH = window.innerHeight;
    islandRect = getIslandRect() || islandRect;

    for (const item of items) {
      if (!item.launched) continue;

      // Skip physics for dragged items
      if (item.dragging) {
        item.el.style.transform = `translate(${item.x}px,${item.y}px) scale(1.12)`;
        continue;
      }

      // Launch friction decay
      if (item.launching) {
        const elapsed = timestamp - item.launchTime;
        if (elapsed > LAUNCH_DECAY_MS) {
          item.launching = false;
          const speed = Math.sqrt(item.vx * item.vx + item.vy * item.vy);
          if (speed > 0.01) {
            const target = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
            item.vx = (item.vx / speed) * target;
            item.vy = (item.vy / speed) * target;
          }
        } else {
          item.vx *= LAUNCH_FRICTION;
          item.vy *= LAUNCH_FRICTION;
        }
      }

      // Fling speed decay
      if (item.flung) {
        const elapsed = timestamp - item.flungTime;
        if (elapsed > FLING_DECAY_MS) {
          item.flung = false;
          const speed = Math.sqrt(item.vx * item.vx + item.vy * item.vy);
          if (speed > 0.01) {
            const target = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
            item.vx = (item.vx / speed) * target;
            item.vy = (item.vy / speed) * target;
          }
        }
      }

      // Cursor repulsion (disabled while dragging any pill or hovering this pill)
      if (!draggedItem && !item.hovered) {
        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;
        const dx = cx - cursorX;
        const dy = cy - cursorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPULSION_RADIUS && dist > 0) {
          const strength = (1 - dist / REPULSION_RADIUS) * REPULSION_FORCE;
          item.vx += (dx / dist) * strength * factor;
          item.vy += (dy / dist) * strength * factor;
        }
      }

      item.x += item.vx * factor;
      item.y += item.vy * factor;

      // Wall collisions
      if (item.x <= 0) {
        item.x = 0;
        item.vx = Math.abs(item.vx);
        bounceColor(item);
        applySqaush(item, 'x');
      } else if (item.x + item.w >= currentVW) {
        item.x = currentVW - item.w;
        item.vx = -Math.abs(item.vx);
        bounceColor(item);
        applySqaush(item, 'x');
      }

      if (item.y <= 0) {
        item.y = 0;
        item.vy = Math.abs(item.vy);
        bounceColor(item);
        applySqaush(item, 'y');
      } else if (item.y + item.h >= currentVH) {
        item.y = currentVH - item.h;
        item.vy = -Math.abs(item.vy);
        bounceColor(item);
        applySqaush(item, 'y');
      }

      // Center island collision
      const r = item.x + item.w;
      const b = item.y + item.h;
      if (r > islandRect.left && item.x < islandRect.right &&
          b > islandRect.top && item.y < islandRect.bottom) {
        const fromLeft = r - islandRect.left;
        const fromRight = islandRect.right - item.x;
        const fromTop = b - islandRect.top;
        const fromBottom = islandRect.bottom - item.y;
        const minPen = Math.min(fromLeft, fromRight, fromTop, fromBottom);

        if (minPen === fromLeft) {
          item.x = islandRect.left - item.w;
          item.vx = -Math.abs(item.vx);
          applySqaush(item, 'x');
        } else if (minPen === fromRight) {
          item.x = islandRect.right;
          item.vx = Math.abs(item.vx);
          applySqaush(item, 'x');
        } else if (minPen === fromTop) {
          item.y = islandRect.top - item.h;
          item.vy = -Math.abs(item.vy);
          applySqaush(item, 'y');
        } else {
          item.y = islandRect.bottom;
          item.vy = Math.abs(item.vy);
          applySqaush(item, 'y');
        }
        bounceColor(item);

        // Face flinch on flung pill impact
        if (item.flung) {
          const impactX = item.vx > 0 ? 6 : -6;
          const impactY = item.vy > 0 ? -6 : 6;
          window.dispatchEvent(new CustomEvent('pillImpact', {
            detail: { x: impactX, y: impactY }
          }));
        }
      }

      // Pill-to-pill collisions
      for (const other of items) {
        if (other === item || !other.launched || other.dragging) continue;
        const ox = other.x, oy = other.y;
        if (item.x < ox + other.w && item.x + item.w > ox &&
            item.y < oy + other.h && item.y + item.h > oy) {
          // Swap velocities
          const tvx = item.vx, tvy = item.vy;
          item.vx = other.vx;
          item.vy = other.vy;
          other.vx = tvx;
          other.vy = tvy;
          // Separate
          const sepX = (item.x + item.w / 2) - (ox + other.w / 2);
          const sepY = (item.y + item.h / 2) - (oy + other.h / 2);
          const sepDist = Math.sqrt(sepX * sepX + sepY * sepY) || 1;
          item.x += (sepX / sepDist) * 2;
          item.y += (sepY / sepDist) * 2;
          other.x -= (sepX / sepDist) * 2;
          other.y -= (sepY / sepDist) * 2;
          bounceColor(item);
          bounceColor(other);
        }
      }

      // Gentle drag — pills above normal speed gradually slow down
      if (!item.launching && !item.flung) {
        const spd = Math.sqrt(item.vx * item.vx + item.vy * item.vy);
        if (spd > MAX_SPEED) {
          const drag = 0.995; // ~1% per frame, smooth decel
          item.vx *= drag;
          item.vy *= drag;
        }
      }

      // Build transform with squash-and-stretch
      let squash = '';
      if (item.squashAxis && timestamp < item.squashEnd) {
        const t = 1 - (item.squashEnd - timestamp) / SQUASH_MS;
        const s = 1 + 0.2 * (1 - t); // 1.2 → 1.0
        const inv = 1 - 0.15 * (1 - t); // 0.85 → 1.0
        squash = item.squashAxis === 'x'
          ? ` scaleX(${inv.toFixed(2)}) scaleY(${s.toFixed(2)})`
          : ` scaleX(${s.toFixed(2)}) scaleY(${inv.toFixed(2)})`;
      } else {
        item.squashAxis = null;
      }

      const hover = item.hovered ? ' scale(1.08)' : '';
      item.el.style.transform = `translate(${item.x}px,${item.y}px)${squash || hover}`;
    }

    requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) lastTime = 0;
  });

  // Start tick loop immediately (pills are hidden until launched)
  function start() {
    requestAnimationFrame(tick);
  }

  if (document.querySelector('.center-island.ready')) {
    start();
  } else {
    window.addEventListener('faceTrackerReady', start, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', initBouncers);
