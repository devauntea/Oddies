// The home map: the present self among four worlds, assembled from the shared
// layer pack in /assets. Placement, draw order, hit areas and motion values all
// come from scene-layout.json, the same file the Expo app reads, so both apps
// stack every layer identically. See assets/README.md.

const ASSET_BASE = '/assets/';
const SVG_NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const root = document.querySelector('[data-role="world-map"]');
if (root) {
  buildMap(root).catch((error) => {
    root.querySelector('.world-map__fallback').textContent = 'The map could not load. Refresh to try again.';
    if (window.Sentry) window.Sentry.captureException(error);
  });
}

async function buildMap(root) {
  const response = await fetch(`${ASSET_BASE}scene-layout.json`);
  if (!response.ok) throw new Error(`scene-layout.json: ${response.status}`);
  const layout = await response.json();
  const { width: W, height: H } = layout.canvas;
  const motion = layout.motion;

  // Canvas units become percentages of the 2:3 canvas, so the map scales with its box.
  const place = (node, rect) => {
    node.style.left = `${(rect.x / W) * 100}%`;
    node.style.top = `${(rect.y / H) * 100}%`;
    node.style.width = `${(rect.width / W) * 100}%`;
    node.style.height = `${(rect.height / H) * 100}%`;
  };
  const layerRect = (layer) => ({ x: layer.x, y: layer.y, width: W * layer.scale, height: H * layer.scale });
  // A point in canvas units, as a transform-origin inside a layer's box.
  const originIn = (layer, point) => {
    const rect = layerRect(layer);
    return `${((point.x - rect.x) / rect.width) * 100}% ${((point.y - rect.y) / rect.height) * 100}%`;
  };

  root.style.setProperty('--wm-edge-top', layout.canvas.edgeTop);
  root.style.setProperty('--wm-edge-bottom', layout.canvas.edgeBottom);
  root.style.setProperty('--wm-breathe-ms', `${motion.breathe.durationMs}ms`);
  root.style.setProperty('--wm-breathe-scale', motion.breathe.scaleY);
  root.style.setProperty('--wm-bob-ms', `${motion.worldBob.durationMs}ms`);
  root.style.setProperty('--wm-bob-amp', motion.worldBob.amplitude);
  root.style.setProperty('--wm-select-ms', `${motion.select.durationMs}ms`);
  root.style.setProperty('--wm-select-scale', motion.select.scale);
  root.style.setProperty('--wm-enter-ms', `${motion.enter.durationMs}ms`);
  root.style.setProperty('--wm-exit-ms', `${motion.exit.durationMs}ms`);
  root.style.setProperty('--wm-accent-ms', `${motion.pathAccent.durationMs}ms`);
  root.style.setProperty('--wm-arrive-ms', `${motion.arrive.durationMs}ms`);
  root.style.setProperty('--wm-hello-ms', `${motion.hello.durationMs}ms`);
  root.style.setProperty('--wm-hello-lift', motion.hello.lift);
  root.style.setProperty('--wm-rise', motion.arrive.rise);

  const camera = el('div', 'world-map__camera');
  const canvas = el('div', 'world-map__canvas');
  camera.append(canvas);

  const worldsById = new Map(layout.worlds.map((world) => [world.id, world]));
  const worldNodes = new Map();
  let characterNode = null;

  const layers = [...layout.layers].sort((a, b) => a.z - b.z);
  layers.forEach((layer, index) => {
    const img = document.createElement('img');
    img.src = ASSET_BASE + layer.file;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.className = 'world-map__art';

    // Three nested boxes so motions never fight over one transform:
    // layer = arrive and hello, motion = idle loop, art = selection scale.
    const node = el('div', `world-map__layer world-map__layer--${layer.id}`);
    node.style.zIndex = layer.z;
    node.style.setProperty('--wm-arrive-delay', `${index * motion.arrive.staggerMs}ms`);
    place(node, layerRect(layer));
    const loop = el('div', 'world-map__motion');
    loop.append(img);
    node.append(loop);

    if (layer.world) {
      const world = worldsById.get(layer.world);
      node.classList.add('world-map__layer--world');
      node.dataset.world = layer.world;
      loop.style.setProperty('--wm-phase', `${-(layer.phase || 0) * motion.worldBob.durationMs}ms`);
      img.style.transformOrigin = originIn(layer, world.focus);
      if (motion.worldBob.enabled) node.classList.add('world-map__layer--bob');
      worldNodes.set(layer.world, node);
    }
    if (layer.id === layout.character.layer) {
      node.classList.add('world-map__layer--character');
      loop.style.transformOrigin = originIn(layer, layout.character.pivot);
      node.style.transformOrigin = originIn(layer, layout.character.pivot);
      characterNode = node;
    }
    canvas.append(node);
  });

  // Path highlights sit between the meadow (z 0) and the worlds (z 10), so a
  // highlight disappears under its world patch just like the painted path does.
  const paths = document.createElementNS(SVG_NS, 'svg');
  paths.setAttribute('class', 'world-map__paths');
  paths.setAttribute('viewBox', `0 0 ${W} ${H}`);
  paths.setAttribute('aria-hidden', 'true');
  const accents = new Map();
  for (const world of layout.worlds) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'world-map__accent');
    group.style.setProperty('--wm-path-length', world.path.length);
    for (const part of ['glow', 'core']) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', world.path.d);
      path.setAttribute('class', `world-map__accent-${part}`);
      group.append(path);
    }
    paths.append(group);
    accents.set(world.id, group);
  }
  canvas.append(paths);

  const label = el('p', 'world-map__label');
  label.hidden = true;
  canvas.append(label);

  for (const world of layout.worlds) {
    const hit = el('button', 'world-map__hit');
    hit.type = 'button';
    hit.dataset.world = world.id;
    hit.setAttribute('aria-label', `${world.name}: ${world.personality}. ${world.traits.join(', ')}.`);
    place(hit, world.hit);
    hit.addEventListener('click', () => enterWorld(world.id));
    canvas.append(hit);
  }

  const you = el('button', 'world-map__hit world-map__hit--you');
  you.type = 'button';
  you.setAttribute('aria-label', 'You, today');
  place(you, layout.character.hit);
  you.addEventListener('click', () => {
    if (reduceMotion.matches || !characterNode) return;
    characterNode.classList.remove('is-hello');
    void characterNode.offsetWidth; // restart the animation on repeated taps
    characterNode.classList.add('is-hello');
  });
  characterNode?.addEventListener('animationend', (event) => {
    if (event.animationName === 'wm-hello') characterNode.classList.remove('is-hello');
  });
  canvas.append(you);

  // Show the scene only once every layer is decoded, so it never assembles piecemeal.
  await Promise.allSettled([...canvas.querySelectorAll('img')].map((img) => img.decode()));

  const intro = buildIntro();
  root.replaceChildren(camera, intro.node);
  root.classList.add('is-ready');
  if (!reduceMotion.matches) root.classList.add('is-arriving');
  setTimeout(() => root.classList.remove('is-arriving'), motion.arrive.durationMs + layers.length * motion.arrive.staggerMs);

  // ---------- select, enter, return ----------

  let active = null;
  let busy = false;

  function enterWorld(id) {
    if (busy || active) return;
    const world = worldsById.get(id);
    busy = true;
    active = id;
    root.classList.add('has-selection');
    worldNodes.get(id).classList.add('is-selected');
    accents.get(id).classList.add('is-lit');
    label.textContent = `${world.name} · ${world.personality}`;
    label.style.left = `${((world.bounds.x + world.bounds.width / 2) / W) * 100}%`;
    label.style.top = `${((world.bounds.y + world.bounds.height) / H) * 100}%`;
    label.hidden = false;

    if (reduceMotion.matches) {
      intro.open(world);
      busy = false;
      return;
    }
    setTimeout(() => {
      const zoom = motion.enter.zoom;
      const tx = (zoom * (W / 2 - world.focus.x) * 100) / W;
      const ty = (zoom * (H / 2 - world.focus.y) * 100) / H;
      camera.style.transform = `translate(${tx}%, ${ty}%) scale(${zoom})`;
      root.classList.add('is-entering');
      setTimeout(() => {
        intro.open(world);
        busy = false;
      }, motion.enter.durationMs);
    }, motion.select.durationMs);
  }

  function returnToMap() {
    if (!active) return;
    const id = active;
    intro.close();
    camera.style.transform = '';
    root.classList.remove('is-entering');
    const settle = reduceMotion.matches ? 0 : motion.exit.durationMs;
    setTimeout(() => {
      root.classList.remove('has-selection');
      worldNodes.get(id).classList.remove('is-selected');
      accents.get(id).classList.remove('is-lit');
      label.hidden = true;
      active = null;
      canvas.querySelector(`.world-map__hit[data-world="${id}"]`)?.focus({ preventScroll: true });
    }, settle);
  }

  // ---------- world introduction ----------

  function buildIntro() {
    const node = el('section', 'world-intro');
    node.hidden = true;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'false');
    node.setAttribute('aria-labelledby', 'world-intro-title');
    node.innerHTML = `
      <img class="world-intro__portrait" alt="">
      <div class="world-intro__card">
        <h2 class="world-intro__title" id="world-intro-title" tabindex="-1"></h2>
        <p class="world-intro__who"></p>
        <p class="world-intro__invite"></p>
        <p class="world-intro__route-title">One possible route</p>
        <ol class="world-intro__route"></ol>
        <div class="world-intro__actions">
          <a class="button world-intro__primary" href="/tree">Open my paths</a>
          <button type="button" class="button world-intro__back">Back to the map</button>
        </div>
      </div>`;
    const q = (selector) => node.querySelector(selector);
    q('.world-intro__back').addEventListener('click', returnToMap);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') returnToMap();
    });

    return {
      node,
      open(world) {
        node.style.setProperty('--wm-world-accent', world.accent);
        node.style.setProperty('--wm-world-patch', world.patch);
        const portrait = q('.world-intro__portrait');
        portrait.src = ASSET_BASE + world.portrait;
        portrait.alt = `${world.personality}: the same you, in ${world.name}`;
        q('.world-intro__title').textContent = world.name;
        q('.world-intro__who').textContent = `${world.personality} · ${world.traits.join(' · ')}`;
        q('.world-intro__invite').textContent = world.invitation;
        q('.world-intro__route').replaceChildren(
          ...world.route.map((step, index) => {
            const item = el('li', 'world-intro__step');
            // An illustrative route: where it could start, the next step, then later steps.
            // Nothing here is marked done; only the person can confirm progress.
            item.dataset.state = index === 0 ? 'start' : index === 1 ? 'next' : 'later';
            item.textContent = step;
            return item;
          }),
        );
        node.hidden = false;
        requestAnimationFrame(() => node.classList.add('is-open'));
        q('.world-intro__title').focus({ preventScroll: true });
      },
      close() {
        node.classList.remove('is-open');
        node.hidden = true;
      },
    };
  }
}

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
