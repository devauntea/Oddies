// Runs tree.html: loads the state, draws the tree, and wires the oddie panel,
// the Today panel, path editing, and the demo reset.
import { api, setNotice } from './api.js';
import { renderTree } from './tree.js';
import { initChat } from './chat.js';
import { initToday } from './today.js';
import { createPathFields } from './path-form.js';
import { renderMap } from './map.js';
import { worldFor } from './worlds.js';
import { mountRig } from './rig.js';

const $ = (selector) => document.querySelector(selector);

const els = {
  notice: $('[data-role="notice"]'),
  selfLine: $('[data-role="self-line"]'),
  tree: $('[data-role="tree"]'),
  map: $('[data-role="world-map"]'),
  morePaths: $('[data-role="more-paths"]'),
  rig: $('[data-role="chat-rig"]'),
  world: $('[data-role="chat-world"]'),
  panel: $('[data-panel="chat"]'),
  name: $('[data-role="chat-name"]'),
  life: $('[data-role="chat-life"]'),
  interests: $('[data-role="chat-interests"]'),
  milestones: $('[data-role="chat-milestones"]'),
  close: $('[data-action="chat-close"]'),
  toggleStatus: $('[data-action="oddie-toggle-status"]'),
  remove: $('[data-action="oddie-delete"]'),
  reset: $('[data-action="demo-reset"]'),
  edit: $('[data-role="path-edit"]'),
  editForm: $('[data-role="path-edit-form"]'),
  editError: $('[data-role="path-edit-error"]'),
  add: $('[data-role="path-add"]'),
  addForm: $('[data-role="path-add-form"]'),
  addError: $('[data-role="path-add-error"]'),
};

const chat = initChat(els.panel);
const today = initToday($('[data-panel="today"]'), {
  refresh: () => refresh(),
  onError: (error) => setNotice(els.notice, error.message),
});
const editFields = createPathFields($('[data-role="path-edit-fields"]'));
const addFields = createPathFields($('[data-role="path-add-fields"]'));
addFields.clear();

let state = null;
let openOddieId = null;
let editFilledFor = null; // the oddie whose values are in the edit form
let rig = null; // the character drawn in the panel
let rigKey = null;

const openOddie = () => state.oddies.find((o) => o.id === openOddieId) || null;

function listItems(list, items, build) {
  list.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');
      build(li, item);
      return li;
    })
  );
}

function renderPanel() {
  const oddie = openOddie();
  els.panel.hidden = !oddie;
  if (!oddie) {
    editFilledFor = null;
    return;
  }
  const world = worldFor(state, oddie.id);
  els.panel.dataset.oddieId = oddie.id;
  els.panel.dataset.status = oddie.status;
  els.panel.dataset.world = world.key;
  els.world.textContent = world.name;
  // Same person, different outfit. Redraw only when the outfit changes.
  if (rigKey !== `${oddie.id}:${world.outfit}`) {
    if (rig) rig.stop();
    rig = mountRig(els.rig, world.outfit, { bust: true });
    rigKey = `${oddie.id}:${world.outfit}`;
  }
  els.name.textContent = oddie.name;
  els.life.textContent = oddie.life;
  els.toggleStatus.textContent = oddie.status === 'active' ? 'Mark dormant' : 'Mark active';
  listItems(els.interests, oddie.interests, (li, interest) => {
    li.className = 'oddie-interests__item';
    li.textContent = interest;
  });
  listItems(els.milestones, oddie.milestones, (li, milestone) => {
    li.className = `oddie-milestones__item oddie-milestones__item--${milestone.reached ? 'reached' : 'unreached'}`;
    li.dataset.milestoneId = milestone.id;
    li.dataset.reached = milestone.reached;
    li.textContent = `${milestone.title}${milestone.reached ? ' (reached)' : ''}`;
  });
  // Only refill the edit form when a different oddie opens, so a redraw never
  // wipes what someone is typing.
  if (editFilledFor !== oddie.id) {
    editFields.set(oddie);
    editFilledFor = oddie.id;
    els.edit.open = false;
    setNotice(els.editError, '');
  }
}

function render() {
  const count = state.oddies.length;
  els.selfLine.textContent = `${state.self.name}, in ${state.self.city}. ${count} ${count === 1 ? 'path' : 'paths'} open, none of them closed.`;
  renderMap(els.map, els.morePaths, state, { openOddieId, onOddieSelect: selectOddie });
  renderTree(els.tree, state, { openOddieId, onOddieSelect: selectOddie });
  renderPanel();
  today.render(state);
}

// Hands focus back to whatever opens this oddie: its world on the map, its
// chip under the map, or its node on the milestone board.
function focusOddieNode(id) {
  const opener =
    document.querySelector(`[data-role="world"][data-oddie-id="${id}"], [data-role="path-chip"][data-oddie-id="${id}"]`) ||
    els.tree.querySelector(`.tree-oddie[data-oddie-id="${id}"]`);
  opener?.focus();
}

function selectOddie(oddie) {
  const changed = openOddieId !== oddie.id;
  openOddieId = oddie.id;
  render();
  if (changed) chat.open(oddie);
  els.name.focus();
  els.panel.scrollIntoView({ block: 'nearest' });
}

function closePanel() {
  const id = openOddieId;
  openOddieId = null;
  render();
  focusOddieNode(id);
}

async function refresh() {
  state = await api.state();
  if (!openOddie()) openOddieId = null;
  render();
}

// Runs a server call, then reloads the state. Errors go to the page notice.
async function act(work, done) {
  setNotice(els.notice, '');
  try {
    await work();
    await refresh();
    if (done) setNotice(els.notice, done);
  } catch (error) {
    setNotice(els.notice, error.message);
  }
}

els.close.addEventListener('click', closePanel);

els.toggleStatus.addEventListener('click', () => {
  const oddie = openOddie();
  if (!oddie) return;
  act(() => api.updateOddie(oddie.id, { status: oddie.status === 'active' ? 'dormant' : 'active' }));
});

els.remove.addEventListener('click', () => {
  const oddie = openOddie();
  if (!oddie) return;
  const ok = window.confirm(`Remove ${oddie.name} and everything on that path? This cannot be undone.`);
  if (ok) act(() => api.deleteOddie(oddie.id), `Removed ${oddie.name}.`);
});

els.editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const oddie = openOddie();
  if (!oddie) return;
  setNotice(els.editError, '');
  try {
    const { oddie: saved } = await api.updateOddie(oddie.id, editFields.get());
    editFilledFor = null; // refill the form with what the server saved
    await refresh();
    setNotice(els.notice, `Saved ${saved.name}.`);
  } catch (error) {
    setNotice(els.editError, error.message);
  }
});

els.addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setNotice(els.addError, '');
  try {
    const { oddie } = await api.addOddie(addFields.get());
    addFields.clear();
    els.add.open = false;
    await refresh();
    setNotice(els.notice, `Added ${oddie.name}.`);
    focusOddieNode(oddie.id);
  } catch (error) {
    setNotice(els.addError, error.message);
  }
});

els.reset.addEventListener('click', () => {
  const ok = window.confirm('Reset to the demo? This wipes the current paths, chats, steps and picks.');
  if (!ok) return;
  openOddieId = null;
  act(() => api.resetDemo(), 'Demo reset.');
});

refresh().catch((error) => setNotice(els.notice, error.message));
