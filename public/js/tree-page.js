// Runs tree.html: loads the state, draws the tree, and opens the oddie panel.
import { api, setNotice } from './api.js';
import { renderTree } from './tree.js';

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
};

let state = null;
let openOddieId = null;

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
  const oddie = state.oddies.find((o) => o.id === openOddieId);
  els.panel.hidden = !oddie;
  if (!oddie) return;
  els.panel.dataset.oddieId = oddie.id;
  els.panel.dataset.status = oddie.status;
  els.name.textContent = oddie.name;
  els.life.textContent = oddie.life;
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
  renderTree(els.tree, state, { openOddieId, onOddieSelect: openOddie });
  renderPanel();
}

function openOddie(oddie) {
  openOddieId = oddie.id;
  render();
  els.name.focus();
  els.panel.scrollIntoView({ block: 'nearest' });
}

function closePanel() {
  const opener = els.tree.querySelector(`.tree-oddie[data-oddie-id="${openOddieId}"]`);
  openOddieId = null;
  render();
  // Re-rendering replaced the node, so find the new one to hand focus back.
  if (opener) els.tree.querySelector(`.tree-oddie[data-oddie-id="${opener.dataset.oddieId}"]`)?.focus();
}

async function refresh() {
  state = await api.state();
  if (!state.oddies.some((o) => o.id === openOddieId)) openOddieId = null;
  render();
}

els.close.addEventListener('click', closePanel);

refresh().catch((error) => setNotice(els.notice, error.message));
