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
];

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22',
  '#1abc9c', '#f39c12', '#e84393', '#0984e3', '#6c5ce7',
];

const MIN_SPEED = 0.3;
const MAX_SPEED = 1.2;
const ISLAND_PAD = 12;

function randomSpeed() {
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
  return Math.random() < 0.5 ? speed : -speed;
}

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

  const items = BOUNCERS.map((data) => {
    const el = document.createElement('a');
    el.href = data.url;
    el.textContent = data.label;
    el.className = `bouncer bouncer--${data.category}`;
    if (data.url.startsWith('http')) {
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    }
    arena.appendChild(el);

    const color = randomColor();
    el.style.color = color;

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Place randomly, avoiding center island
    let x, y, attempts = 0;
    do {
      x = Math.random() * (vw - w);
      y = Math.random() * (vh - h);
      attempts++;
    } while (
      attempts < 50 &&
      x + w > islandRect.left && x < islandRect.right &&
      y + h > islandRect.top && y < islandRect.bottom
    );

    return { el, x, y, vx: randomSpeed(), vy: randomSpeed(), w, h, color, hovered: false };
  });

  // Hover tracking
  items.forEach((item) => {
    item.el.addEventListener('mouseenter', () => { item.hovered = true; });
    item.el.addEventListener('mouseleave', () => { item.hovered = false; });
  });

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
      const prevX = item.x;
      const prevY = item.y;
      item.x += item.vx * factor;
      item.y += item.vy * factor;

      // Wall collisions
      if (item.x <= 0) {
        item.x = 0;
        item.vx = Math.abs(item.vx);
        bounceColor(item);
      } else if (item.x + item.w >= currentVW) {
        item.x = currentVW - item.w;
        item.vx = -Math.abs(item.vx);
        bounceColor(item);
      }

      if (item.y <= 0) {
        item.y = 0;
        item.vy = Math.abs(item.vy);
        bounceColor(item);
      } else if (item.y + item.h >= currentVH) {
        item.y = currentVH - item.h;
        item.vy = -Math.abs(item.vy);
        bounceColor(item);
      }

      // Center island collision
      const r = item.x + item.w;
      const b = item.y + item.h;
      const overlapsX = r > islandRect.left && item.x < islandRect.right;
      const overlapsY = b > islandRect.top && item.y < islandRect.bottom;

      if (overlapsX && overlapsY) {
        // Determine which edge was crossed most recently
        const fromLeft = r - islandRect.left;
        const fromRight = islandRect.right - item.x;
        const fromTop = b - islandRect.top;
        const fromBottom = islandRect.bottom - item.y;
        const minPen = Math.min(fromLeft, fromRight, fromTop, fromBottom);

        if (minPen === fromLeft) {
          item.x = islandRect.left - item.w;
          item.vx = -Math.abs(item.vx);
        } else if (minPen === fromRight) {
          item.x = islandRect.right;
          item.vx = Math.abs(item.vx);
        } else if (minPen === fromTop) {
          item.y = islandRect.top - item.h;
          item.vy = -Math.abs(item.vy);
        } else {
          item.y = islandRect.bottom;
          item.vy = Math.abs(item.vy);
        }
        bounceColor(item);
      }

      const scale = item.hovered ? ' scale(1.08)' : '';
      item.el.style.transform = `translate(${item.x}px,${item.y}px)${scale}`;
    }

    requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) lastTime = 0;
  });

  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', initBouncers);
