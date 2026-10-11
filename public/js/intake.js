// Runs intake.html: pasted text in, editable draft cards out, then save.
import { api, setNotice } from './api.js';
import { createPathFields } from './path-form.js';

const $ = (selector) => document.querySelector(selector);

const els = {
  form: $('[data-role="intake-form"]'),
  text: $('[data-role="intake-text"]'),
  build: $('[data-action="build-oddies"]'),
  manual: $('[data-action="draft-manual"]'),
  status: $('[data-role="intake-status"]'),
  error: $('[data-role="intake-error"]'),
  errorText: $('[data-role="intake-error-text"]'),
  retry: $('[data-action="intake-retry"]'),
  drafts: $('[data-role="drafts"]'),
  draftsHeading: $('#drafts-heading'),
  draftsForm: $('[data-role="drafts-form"]'),
  draftList: $('[data-role="draft-list"]'),
  draftAdd: $('[data-action="draft-add"]'),
  draftsError: $('[data-role="drafts-error"]'),
  save: $('[data-action="save-oddies"]'),
  selfName: $('[data-field="self-name"]'),
  selfCity: $('[data-field="self-city"]'),
  selfSummary: $('[data-field="self-summary"]'),
};

const MAX_PATHS = 8;
let cards = []; // { element, fields }

function showError(message) {
  els.errorText.textContent = message || '';
  els.error.hidden = !message;
}

function renumber() {
  cards.forEach((card, index) => {
    card.element.dataset.draftIndex = index;
    card.legend.textContent = `Path ${index + 1}`;
  });
  els.draftAdd.disabled = cards.length >= MAX_PATHS;
}

function addCard(oddie) {
  const element = document.createElement('fieldset');
  element.className = 'draft-card';
  element.dataset.role = 'draft-card';

  const legend = document.createElement('legend');
  legend.className = 'draft-card__legend';

  const fieldsBox = document.createElement('div');
  fieldsBox.className = 'path-form__fields';
  const fields = createPathFields(fieldsBox);
  if (oddie) fields.set(oddie);
  else fields.clear();

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'draft-card__remove';
  remove.dataset.action = 'draft-remove';
  remove.textContent = 'Remove this path';

  const card = { element, legend, fields };
  remove.addEventListener('click', () => {
    cards = cards.filter((c) => c !== card);
    element.remove();
    renumber();
    els.draftAdd.focus();
  });

  element.append(legend, fieldsBox, remove);
  els.draftList.append(element);
  cards.push(card);
  renumber();
  return card;
}

function showDrafts({ self, oddies }) {
  els.selfName.value = self.name || '';
  els.selfCity.value = self.city || '';
  els.selfSummary.value = self.summary || '';
  cards = [];
  els.draftList.replaceChildren();
  oddies.forEach(addCard);
  els.drafts.hidden = false;
  els.draftsHeading.focus();
  els.drafts.scrollIntoView({ block: 'start' });
}

async function build() {
  const text = els.text.value.trim();
  if (!text) return;
  showError('');
  els.build.disabled = true;
  setNotice(els.status, 'Drafting your oddies. This can take up to half a minute.');
  try {
    showDrafts(await api.intake(text));
  } catch (error) {
    showError(error.message);
  } finally {
    els.build.disabled = false;
    setNotice(els.status, '');
  }
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  build();
});

els.retry.addEventListener('click', build);

els.manual.addEventListener('click', () => {
  showError('');
  showDrafts({ self: {}, oddies: [null] });
});

els.draftAdd.addEventListener('click', () => {
  const card = addCard(null);
  card.element.querySelector('input')?.focus();
});

els.draftsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setNotice(els.draftsError, '');
  if (!cards.length) {
    setNotice(els.draftsError, 'Add at least one path before saving.');
    return;
  }
  els.save.disabled = true;
  try {
    await api.saveOddies({
      self: { name: els.selfName.value, city: els.selfCity.value, summary: els.selfSummary.value },
      oddies: cards.map((card) => card.fields.get()),
    });
    window.location.href = '/tree';
  } catch (error) {
    setNotice(els.draftsError, error.message);
    els.save.disabled = false;
  }
});
