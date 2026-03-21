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
  // Social
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/athreyaanand/', category: 'social' },
  { label: 'GitHub', url: 'https://github.com/athreyaanand', category: 'social' },
  { label: 'X', url: 'https://twitter.com/athreya_dev', category: 'social' },
  { label: 'Medium', url: 'https://medium.com/@athreyaanand', category: 'social' },
  { label: 'Email', url: 'mailto:athreyaanand@gmail.com', category: 'social' },
  { label: 'Resume', url: 'old/files/AthreyaAnandResume.pdf', category: 'social' },
];

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22',
  '#1abc9c', '#f39c12', '#e84393', '#0984e3', '#6c5ce7',
];

const MIN_SPEED = 0.3;
const MAX_SPEED = 1.2;

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

function initBouncers() {
  const arena = document.getElementById('bouncing-arena');
  if (!arena) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Get center island bounds for initial placement avoidance
  const island = document.querySelector('.center-island');
  let islandRect = { left: vw * 0.3, right: vw * 0.7, top: vh * 0.3, bottom: vh * 0.7 };
  if (island) {
    const r = island.getBoundingClientRect();
    const pad = 20;
    islandRect = { left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad };
  }

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

    return {
      el,
      x,
      y,
      vx: randomSpeed(),
      vy: randomSpeed(),
      w,
      h,
      color,
      hovered: false,
    };
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

    // Cap delta to avoid jumps after tab switch
    const delta = lastTime ? Math.min(timestamp - lastTime, 32) : 16;
    lastTime = timestamp;
    const factor = delta / 16; // normalize to ~60fps

    const currentVW = window.innerWidth;
    const currentVH = window.innerHeight;

    for (const item of items) {
      item.x += item.vx * factor;
      item.y += item.vy * factor;

      // Wall collision
      if (item.x <= 0) {
        item.x = 0;
        item.vx = Math.abs(item.vx);
        item.color = randomColor(item.color);
        item.el.style.color = item.color;
      } else if (item.x + item.w >= currentVW) {
        item.x = currentVW - item.w;
        item.vx = -Math.abs(item.vx);
        item.color = randomColor(item.color);
        item.el.style.color = item.color;
      }

      if (item.y <= 0) {
        item.y = 0;
        item.vy = Math.abs(item.vy);
        item.color = randomColor(item.color);
        item.el.style.color = item.color;
      } else if (item.y + item.h >= currentVH) {
        item.y = currentVH - item.h;
        item.vy = -Math.abs(item.vy);
        item.color = randomColor(item.color);
        item.el.style.color = item.color;
      }

      const scale = item.hovered ? 'scale(1.08)' : '';
      item.el.style.transform = `translate(${item.x}px,${item.y}px)${scale}`;
    }

    requestAnimationFrame(tick);
  }

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) lastTime = 0;
  });

  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', initBouncers);
