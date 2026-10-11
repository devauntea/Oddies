// Draws the meadow map: the person today in the middle, one illustrated
// world per oddie around them. The art is in layers so each world is its own
// tappable piece. Where each layer sits is set in CSS (see "Map" in base.css).
import { WORLDS, assignWorlds } from './worlds.js';
import { formatDate } from './tree.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function image(className, src) {
  const img = element('img', className);
  img.src = src;
  img.alt = '';
  img.draggable = false;
  return img;
}

// Builds the layers once. Later calls reuse them, so the pictures never
// reload or flicker when the state changes.
function scaffold(container) {
  if (container.map) return container.map;
  const worldButtons = new Map();
  const before = image('world-map__layer world-map__foliage', '/img/map/foliage.webp');
  const self = image('world-map__self', '/img/map/june.webp');
  const now = element('span', 'world-map__now');
  container.replaceChildren(image('world-map__layer world-map__meadow', '/img/map/meadow.webp'), before, self, now);
  container.map = { worldButtons, before, self, now };
  return container.map;
}

function worldButton(world) {
  const button = element('button', 'world');
  button.type = 'button';
  button.dataset.role = 'world';
  button.dataset.world = world.key;
  const label = element('span', 'world__label');
  label.append(element('span', 'world__name'), element('span', 'world__note'));
  button.append(image('world__art', `/img/map/world-${world.key}.webp`), label);
  return button;
}

// Draws the map into `container` and the paths that have no world into
// `extras` (a block holding a [data-role="path-chips"] list). Options:
//   openOddieId: the oddie whose panel is open, if any
//   onOddieSelect(oddie): called when a world or an extra path is chosen
export function renderMap(container, extras, state, { openOddieId = null, onOddieSelect = () => {} } = {}) {
  const map = scaffold(container);
  const worlds = assignWorlds(state.oddies);
  const pickedId = state.today_pick ? state.today_pick.oddie_id : null;

  map.self.alt = `${state.self.name}, today`;
  map.now.textContent = `Now, ${formatDate(state.self.now_date, { month: 'short', day: 'numeric' })}`;

  for (const world of WORLDS) {
    const oddie = state.oddies.find((o) => worlds.get(o.id) === world.key);
    let button = map.worldButtons.get(world.key);
    if (!oddie) {
      // No one lives here: the world is not on this person's map.
      if (button) button.remove();
      map.worldButtons.delete(world.key);
      continue;
    }
    if (!button) {
      button = worldButton(world);
      map.worldButtons.set(world.key, button);
      container.insertBefore(button, map.before);
    }

    const picked = oddie.id === pickedId;
    const open = oddie.id === openOddieId;
    const classes = ['world', `world--${world.key}`, `world--${oddie.status}`];
    if (picked) classes.push('world--picked');
    if (open) classes.push('world--open');
    button.className = classes.join(' ');
    button.dataset.oddieId = oddie.id;
    button.dataset.status = oddie.status;
    button.dataset.picked = picked;
    button.dataset.open = open;
    button.setAttribute('aria-label', `Talk to ${oddie.name}, in ${world.name}`);
    button.setAttribute('aria-pressed', open);
    button.onclick = () => onOddieSelect(oddie);

    const note = [picked ? 'today' : '', oddie.status === 'dormant' ? 'resting' : ''].filter(Boolean).join(', ');
    button.querySelector('.world__name').textContent = oddie.name;
    const noteNode = button.querySelector('.world__note');
    noteNode.textContent = note;
    noteNode.hidden = !note;
  }

  // Paths beyond the four worlds still get a way in.
  const rest = state.oddies.filter((oddie) => !worlds.get(oddie.id));
  extras.hidden = rest.length === 0;
  extras.querySelector('[data-role="path-chips"]').replaceChildren(
    ...rest.map((oddie) => {
      const item = element('li', 'path-chips__item');
      const button = element('button', `path-chip${oddie.id === openOddieId ? ' path-chip--open' : ''}`, oddie.name);
      button.type = 'button';
      button.dataset.role = 'path-chip';
      button.dataset.oddieId = oddie.id;
      button.dataset.world = 'none';
      button.dataset.picked = oddie.id === pickedId;
      button.setAttribute('aria-label', `Talk to ${oddie.name}`);
      button.setAttribute('aria-pressed', oddie.id === openOddieId);
      button.addEventListener('click', () => onOddieSelect(oddie));
      item.append(button);
      return item;
    })
  );
}
