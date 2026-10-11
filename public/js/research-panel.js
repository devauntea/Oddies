// The research sheet: what Nimble searched for one milestone and every page
// it found, with links. Opens when a milestone on the tree is chosen.
import { api, setNotice } from './api.js';
import { formatDate } from './tree.js';
import { worldFor } from './worlds.js';

// Plain names for the search lanes (see src/research.js on the server).
export const LANE_LABELS = {
  overview: 'Getting started',
  documents: 'Study documents',
  practice: 'Hands-on practice',
  community: 'People to ask',
  events: 'Classes and events',
  apply: 'Places to apply',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initResearch(panel, { refresh, onError }) {
  const $ = (selector) => panel.querySelector(selector);
  const els = {
    world: $('[data-role="research-world"]'),
    title: $('[data-role="research-title"]'),
    summary: $('[data-role="research-summary"]'),
    run: $('[data-action="research-run"]'),
    status: $('[data-role="research-status"]'),
    error: $('[data-role="research-error"]'),
    lanes: $('[data-role="research-lanes"]'),
    close: $('[data-action="research-close"]'),
  };

  let state = null;
  let selected = null; // { oddieId, milestoneId }
  let busy = false;

  const current = () => {
    if (!state || !selected) return null;
    const oddie = state.oddies.find((o) => o.id === selected.oddieId);
    const milestone = oddie && oddie.milestones.find((m) => m.id === selected.milestoneId);
    return oddie && milestone ? { oddie, milestone } : null;
  };

  function sourceItem(source) {
    const item = element('li', `source source--${source.kind}${source.is_step ? ' source--step' : ''}`);
    item.dataset.sourceId = source.id;
    item.dataset.kind = source.kind;
    item.dataset.step = source.is_step;

    const link = element('a', 'source__link', source.title);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const meta = element('p', 'source__meta');
    meta.append(element('span', 'source__host', source.source));
    if (source.is_step) meta.append(element('span', 'source__badge', 'Picked as a step'));

    item.append(link, meta);
    if (source.snippet) item.append(element('p', 'source__snippet', source.snippet));
    return item;
  }

  function render(nextState) {
    state = nextState;
    const found = current();
    panel.hidden = !found;
    if (!found) {
      selected = null;
      return;
    }
    const { oddie, milestone } = found;
    const world = worldFor(state, oddie.id);
    const research = (oddie.research || []).find((r) => r.milestone_id === milestone.id);
    const next = oddie.milestones.find((m) => !m.reached);
    const isNext = Boolean(next && next.id === milestone.id);

    panel.dataset.world = world.key;
    panel.dataset.oddieId = oddie.id;
    panel.dataset.milestoneId = milestone.id;
    panel.dataset.researched = Boolean(research);
    els.world.textContent = `${oddie.name}, ${world.name}`;
    els.title.textContent = milestone.title;

    if (research) {
      const steps = research.sources.filter((s) => s.is_step).length;
      els.summary.textContent =
        `Nimble ran ${research.lanes.length} live ${research.lanes.length === 1 ? 'search' : 'searches'} on ` +
        `${formatDate(research.found_on, { month: 'long', day: 'numeric' })} and found ${research.sources.length} pages. ` +
        `${steps} ${steps === 1 ? 'was' : 'were'} picked as steps. Every link below is a real result.`;
    } else if (isNext) {
      els.summary.textContent = 'This is the next milestone on this path. Nothing has been researched for it yet.';
    } else if (milestone.reached) {
      els.summary.textContent = 'Reached. There is no research on record for this one.';
    } else {
      els.summary.textContent = `Not yet. Research starts with the next milestone on this path: ${next ? next.title : 'none left'}.`;
    }

    // Research always works on the path's next milestone, so only offer it there.
    els.run.hidden = !isNext;
    els.run.disabled = busy;
    els.run.textContent = research ? 'Search again with Nimble' : 'Research this with Nimble';

    els.lanes.replaceChildren(
      ...(research ? research.lanes : []).map((lane) => {
        const block = element('section', `lane lane--${lane.lane}`);
        block.dataset.lane = lane.lane;
        block.append(
          element('h3', 'lane__title', `${LANE_LABELS[lane.lane] || lane.lane} (${lane.count})`),
          element('p', 'lane__query', `Searched for: ${lane.query}`)
        );
        const list = element('ul', 'source-list');
        list.append(...research.sources.filter((s) => s.lane === lane.lane).map(sourceItem));
        block.append(list);
        return block;
      })
    );
  }

  function open(oddie, milestone) {
    selected = { oddieId: oddie.id, milestoneId: milestone.id };
    setNotice(els.error, '');
    render(state);
    els.title.focus();
    panel.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    selected = null;
    render(state);
  }

  async function run() {
    const found = current();
    if (!found || busy) return;
    busy = true;
    panel.setAttribute('aria-busy', 'true');
    setNotice(els.error, '');
    setNotice(els.status, 'Searching the live web with Nimble. This usually takes about five seconds.');
    render(state);
    let failed = null;
    try {
      await api.research(found.oddie.id);
    } catch (error) {
      failed = error;
    }
    busy = false;
    panel.removeAttribute('aria-busy');
    setNotice(els.status, '');
    await refresh().catch(onError);
    if (failed) setNotice(els.error, `${failed.message} Press the button to try again.`);
  }

  els.run.addEventListener('click', run);
  els.close.addEventListener('click', close);

  return {
    render,
    open,
    close,
    get openMilestoneId() {
      return selected ? selected.milestoneId : null;
    },
  };
}
