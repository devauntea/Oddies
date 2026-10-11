// Runs tree.html: loads the state, draws the tree, and opens the oddie panel.
import { api, setNotice } from './api.js';
import { renderTree } from './tree.js';
import { initChat } from './chat.js';

const $ = (selector) => document.querySelector(selector);

const els = {
  notice: $('[data-role="notice"]'),
  selfLine: $('[data-role="self-line"]'),
  tree: $('[data-role="tree"]'),
  panel: $('[data-panel="chat"]'),
  name: $('[data-role="chat-name"]'),
  life: $('[data-role="chat-life"]'),
  interests: $('[data-role="chat-interests"]'),
  milestones: $('[data-role="chat-milestones"]'),
  close: $('[data-action="chat-close"]'),
  toggleStatus: $('[data-action="oddie-toggle-status"]'),
  remove: $('[data-action="oddie-delete"]'),
};

const chat = initChat(els.panel);

let state = null;
let openOddieId = null;

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
  if (!oddie) return;
  els.panel.dataset.oddieId = oddie.id;
  els.panel.dataset.status = oddie.status;
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
}

function render() {
  els.selfLine.textContent = `${state.self.name}, ${state.self.city}. ${state.oddies.length} branches open.`;
  renderTree(els.tree, state, { openOddieId, onOddieSelect: selectOddie });
  renderPanel();
}

function focusOddieNode(id) {
  els.tree.querySelector(`.tree-oddie[data-oddie-id="${id}"]`)?.focus();
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
async function act(work) {
  setNotice(els.notice, '');
  try {
    await work();
    await refresh();
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
  const ok = window.confirm(`Remove ${oddie.name} and everything on that branch? This cannot be undone.`);
  if (ok) act(() => api.deleteOddie(oddie.id));
});

refresh().catch((error) => setNotice(els.notice, error.message));
