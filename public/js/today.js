// The Today panel: choose a branch, see the steps found for it, tick them off,
// and see which branch got each past day.
import { api, setNotice } from './api.js';
import { formatDate } from './tree.js';
import { worldFor } from './worlds.js';
import { LANE_LABELS } from './research-panel.js';

export function initToday(panel, { refresh, onError, onShowSources = () => {} }) {
  const $ = (selector) => panel.querySelector(selector);
  const els = {
    date: $('[data-role="today-date"]'),
    pick: $('[data-role="today-pick"]'),
    branches: $('[data-role="branch-list"]'),
    status: $('[data-role="today-status"]'),
    error: $('[data-role="today-error"]'),
    errorText: $('[data-role="today-error-text"]'),
    retry: $('[data-action="today-retry"]'),
    stepEmpty: $('[data-role="step-empty"]'),
    steps: $('[data-role="step-list"]'),
    refreshSteps: $('[data-action="today-refresh"]'),
    reflect: $('[data-role="today-reflect"]'),
    research: $('[data-role="today-research"]'),
    researchText: $('[data-role="today-research-text"]'),
    showSources: $('[data-action="today-sources"]'),
    history: $('[data-role="history-strip"]'),
  };

  let state = null;
  let busy = false;
  let lastRequest = null; // what "Try again" repeats
  // Pages opened for reading in the app, by step id: { status, text }
  const readers = new Map();
  const READABLE_TYPES = ['read', 'practice'];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderBranches() {
    const pickedId = state.today_pick ? state.today_pick.oddie_id : null;
    els.branches.replaceChildren(
      ...state.oddies.map((oddie) => {
        const picked = oddie.id === pickedId;
        const next = oddie.milestones.find((m) => !m.reached);
        const item = element('li', `branch-list__item${picked ? ' branch-list__item--picked' : ''}`);
        item.dataset.oddieId = oddie.id;
        item.dataset.picked = picked;
        item.dataset.status = oddie.status;
        item.dataset.world = worldFor(state, oddie.id).key;

        const button = element('button', 'branch-list__choose', "Choose today's path");
        button.type = 'button';
        button.dataset.action = 'choose-today';
        button.dataset.oddieId = oddie.id;
        button.disabled = busy;
        button.setAttribute('aria-pressed', picked);
        button.setAttribute('aria-label', `Choose today's path: ${oddie.name}`);

        item.append(
          element('span', 'branch-list__name', oddie.name),
          element('span', 'branch-list__next', next ? `Next: ${next.title}` : 'Every milestone reached'),
          button
        );
        if (picked) item.append(element('span', 'branch-list__picked', "Today's pick"));
        return item;
      })
    );
  }

  function renderSteps() {
    const pick = state.today_pick;
    const oddie = pick && state.oddies.find((o) => o.id === pick.oddie_id);
    els.pick.textContent = oddie ? `Today goes to ${oddie.name}.` : 'No branch chosen yet today.';

    els.steps.replaceChildren(
      ...state.today_steps.map((step) => {
        const item = element('li', `step step--${step.type}${step.done ? ' step--done' : ''}`);
        item.dataset.stepId = step.id;
        item.dataset.stepType = step.type;
        item.dataset.done = step.done;

        const check = element('input', 'step__check');
        check.type = 'checkbox';
        check.checked = step.done;
        check.dataset.action = 'toggle-step';
        check.dataset.stepId = step.id;

        const label = element('label', 'step__label');
        label.append(check, element('span', 'step__type', step.type), element('span', 'step__title', step.title));

        const link = element('a', 'step__link', `Open: ${step.source}`);
        link.href = step.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        item.append(label, link);

        // Articles and guides can be read right here. Events, communities and
        // applications open in the browser.
        if (READABLE_TYPES.includes(step.type)) {
          const reader = readers.get(step.id);
          const read = element('button', 'step__read', reader ? 'Close reader' : 'Read here');
          read.type = 'button';
          read.dataset.action = 'read-step';
          read.dataset.stepId = step.id;
          read.setAttribute('aria-expanded', Boolean(reader));
          item.append(read);
          if (reader) {
            const box = element('div', `step__reader step__reader--${reader.status}`, reader.text);
            box.dataset.role = 'step-reader';
            box.dataset.status = reader.status;
            box.setAttribute('role', reader.status === 'error' ? 'alert' : 'status');
            box.tabIndex = 0;
            item.append(box);
          }
        }
        return item;
      })
    );

    const has = state.today_steps.length > 0;
    els.refreshSteps.hidden = !has;
    els.reflect.hidden = !has;

    // Where these steps came from: the research on the milestone they belong to.
    const milestoneId = has ? state.today_steps[0].milestone_id : null;
    const research = oddie && (oddie.research || []).find((r) => r.milestone_id === milestoneId);
    els.research.hidden = !research;
    if (research) {
      const lanes = research.lanes.map((lane) => `${(LANE_LABELS[lane.lane] || lane.lane).toLowerCase()} (${lane.count})`).join(', ');
      els.researchText.textContent = `Picked from ${research.sources.length} pages Nimble found: ${lanes}. `;
      els.showSources.onclick = () => onShowSources(oddie, oddie.milestones.find((m) => m.id === milestoneId));
    }
    els.refreshSteps.disabled = busy;
    els.stepEmpty.hidden = has;
    els.stepEmpty.textContent = oddie
      ? 'No steps yet for this branch today.'
      : 'Choose a branch and Oddies will search for real things you can do today.';
  }

  function renderHistory() {
    els.history.replaceChildren(
      ...state.history.map((day) => {
        const isToday = day.date === state.today;
        const item = element('li', `history-strip__day${isToday ? ' history-strip__day--today' : ''}`);
        item.dataset.date = day.date;
        item.dataset.oddieId = day.oddie_id;
        item.dataset.world = worldFor(state, day.oddie_id).key;
        item.dataset.today = isToday;
        item.append(
          element('span', 'history-strip__date', isToday ? 'Today' : formatDate(day.date, { month: 'short', day: 'numeric' })),
          element('span', 'history-strip__oddie', day.oddie_name)
        );
        return item;
      })
    );
  }

  function render(nextState) {
    state = nextState;
    els.date.textContent = formatDate(state.today, { weekday: 'long', month: 'long', day: 'numeric' });
    renderBranches();
    renderSteps();
    renderHistory();
  }

  function showError(message) {
    els.errorText.textContent = message || '';
    els.error.hidden = !message;
  }

  // Records the pick and asks the server for steps. This can take a while:
  // it is one model call, three live searches, then another model call.
  async function choose(oddieId, refreshSteps = false) {
    if (busy) return;
    busy = true;
    lastRequest = { oddieId, refreshSteps };
    panel.dataset.busy = true;
    panel.setAttribute('aria-busy', 'true');
    showError('');
    setNotice(els.status, 'Searching for real things you can do today. This can take up to half a minute.');
    render(state);
    let failed = null;
    try {
      await api.today(oddieId, refreshSteps);
    } catch (error) {
      failed = error;
    }
    busy = false;
    panel.dataset.busy = false;
    panel.removeAttribute('aria-busy');
    setNotice(els.status, '');
    // The pick is saved even when the search fails, so always reload.
    await refresh().catch(onError);
    if (failed) {
      showError(failed.message);
      els.retry.focus();
    }
  }

  els.branches.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="choose-today"]');
    if (button) choose(Number(button.dataset.oddieId));
  });

  els.retry.addEventListener('click', () => {
    if (lastRequest) choose(lastRequest.oddieId, lastRequest.refreshSteps);
  });

  els.refreshSteps.addEventListener('click', () => {
    if (state.today_pick) choose(state.today_pick.oddie_id, true);
  });

  els.steps.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="read-step"]');
    if (!button) return;
    const id = Number(button.dataset.stepId);
    const refocus = () => els.steps.querySelector(`[data-action="read-step"][data-step-id="${id}"]`)?.focus();
    if (readers.has(id)) {
      readers.delete(id);
      render(state);
      refocus();
      return;
    }
    readers.set(id, { status: 'loading', text: 'Loading the page…' });
    render(state);
    refocus();
    try {
      const doc = await api.readStep(id);
      if (!readers.has(id)) return; // closed while loading
      const note = doc.truncated ? '\n\n[Cut short here. Open the link for the rest.]' : '';
      readers.set(id, { status: 'ready', text: doc.markdown + note });
    } catch (error) {
      if (!readers.has(id)) return;
      readers.set(id, { status: 'error', text: error.message });
    }
    render(state);
    refocus();
  });

  els.steps.addEventListener('change', async (event) => {
    const check = event.target.closest('[data-action="toggle-step"]');
    if (!check) return;
    check.disabled = true;
    try {
      await api.setStepDone(Number(check.dataset.stepId), check.checked);
      await refresh();
      // The list was redrawn, so put focus back on the same checkbox.
      els.steps.querySelector(`[data-action="toggle-step"][data-step-id="${check.dataset.stepId}"]`)?.focus();
    } catch (error) {
      check.checked = !check.checked;
      check.disabled = false;
      onError(error);
    }
  });

  return { render };
}
