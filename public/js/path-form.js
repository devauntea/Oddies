// The fields for one path (one oddie). Used to edit a path and add a path on
// the tree page, and for each draft card on the intake page.

const FIELDS = [
  { name: 'name', label: 'Name', tag: 'input', required: true, maxlength: 80 },
  { name: 'life', label: 'This life in one line', tag: 'input', required: true, maxlength: 240 },
  { name: 'interests', label: 'Interests, separated by commas', tag: 'input' },
  { name: 'persona_brief', label: 'Who this version of you is. The oddie speaks from this.', tag: 'textarea', rows: 5, maxlength: 2000 },
  { name: 'horizon_years', label: 'Years from now', tag: 'input', type: 'number', min: 1, max: 60, required: true },
  { name: 'milestones', label: 'Milestones, one per line, in order', tag: 'textarea', rows: 6, required: true },
];

const lines = (value, separator) =>
  value
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);

// Builds the fields inside `container` and returns { set(oddie), get(), clear() }.
export function createPathFields(container) {
  const inputs = {};
  for (const field of FIELDS) {
    const label = document.createElement('label');
    label.className = `path-form__field path-form__field--${field.name}`;

    const caption = document.createElement('span');
    caption.className = 'path-form__label';
    caption.textContent = field.label;

    const input = document.createElement(field.tag);
    input.className = 'path-form__input';
    input.name = field.name;
    input.dataset.field = field.name;
    for (const key of ['type', 'rows', 'maxlength', 'min', 'max']) {
      if (field[key] !== undefined) input.setAttribute(key, field[key]);
    }
    input.required = Boolean(field.required);

    label.append(caption, input);
    container.append(label);
    inputs[field.name] = input;
  }

  return {
    set(oddie) {
      inputs.name.value = oddie.name || '';
      inputs.life.value = oddie.life || '';
      inputs.interests.value = (oddie.interests || []).join(', ');
      inputs.persona_brief.value = oddie.persona_brief || '';
      inputs.horizon_years.value = oddie.horizon_years || 10;
      inputs.milestones.value = (oddie.milestones || []).map((m) => (typeof m === 'string' ? m : m.title)).join('\n');
    },
    get() {
      return {
        name: inputs.name.value.trim(),
        life: inputs.life.value.trim(),
        interests: lines(inputs.interests.value, ','),
        persona_brief: inputs.persona_brief.value.trim(),
        horizon_years: Number(inputs.horizon_years.value) || 10,
        milestones: lines(inputs.milestones.value, '\n'),
      };
    },
    clear() {
      for (const input of Object.values(inputs)) input.value = '';
      inputs.horizon_years.value = 10;
    },
  };
}
