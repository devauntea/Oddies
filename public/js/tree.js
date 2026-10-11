// Draws the tree as SVG. No data fetching here: give it the state from
// GET /api/state and it draws.

import { assignWorlds } from './worlds.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Every number that decides where things sit. Designers: change spacing here.
// Units are SVG user units (the viewBox is `width` wide).
export const TREE_SPACING = {
  width: 1260,
  rowHeight: 136, // vertical distance between branches
  paddingY: 76, // room above the first branch and below the last
  nowX: 92, // the Now node
  fanEndX: 270, // where a branch stops curving and runs flat
  milestoneStartX: 330, // first milestone on a branch
  milestoneEndX: 880, // last milestone on a branch
  oddieX: 968, // the oddie at the end
  nowRadius: 30,
  milestoneRadius: 10,
  oddieRadius: 18,
  labelOffsetY: 34, // milestone label, distance below its node
  labelLineHeight: 15,
  labelCharWidth: 6.9, // rough width of one label character, used for wrapping
  oddieLabelGap: 14, // space between the oddie and its name
  oddieLabelCharWidth: 9.2,
};

// ALL layout math lives in this one function. It takes the oddies (each with
// its milestones) and returns plain coordinates. Nothing else decides position.
export function layoutTree(oddies, spacing = TREE_SPACING) {
  const s = spacing;
  const height = s.paddingY * 2 + Math.max(oddies.length - 1, 0) * s.rowHeight;
  const now = { x: s.nowX, y: height / 2 };
  const curveX = (s.nowX + s.fanEndX) / 2;

  const branches = oddies.map((oddie, row) => {
    const y = s.paddingY + row * s.rowHeight;
    const count = oddie.milestones.length;
    const gap = count > 1 ? (s.milestoneEndX - s.milestoneStartX) / (count - 1) : s.milestoneEndX - s.milestoneStartX;
    const milestones = oddie.milestones.map((milestone, i) => ({
      id: milestone.id,
      x: count > 1 ? s.milestoneStartX + i * gap : (s.milestoneStartX + s.milestoneEndX) / 2,
      y,
      labelY: y + s.labelOffsetY,
    }));
    return {
      oddieId: oddie.id,
      // Curves out from the Now node, then runs flat to the oddie.
      path: `M ${now.x} ${now.y} C ${curveX} ${now.y}, ${curveX} ${y}, ${s.fanEndX} ${y} L ${s.oddieX} ${y}`,
      milestones,
      milestoneLabelChars: Math.max(8, Math.floor((gap - 14) / s.labelCharWidth)),
      oddie: { x: s.oddieX, y, labelX: s.oddieX + s.oddieRadius + s.oddieLabelGap },
      oddieLabelChars: Math.floor((s.width - s.oddieX - s.oddieRadius - s.oddieLabelGap - 8) / s.oddieLabelCharWidth),
    };
  });

  return { width: s.width, height, now, branches };
}

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function shorten(text, maxChars) {
  return text.length > maxChars ? `${text.slice(0, Math.max(maxChars - 1, 1)).trimEnd()}…` : text;
}

// Breaks a label into at most `maxLines` lines of about `maxChars` characters.
function wrapLabel(text, maxChars, maxLines = 2) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = shorten(`${kept[maxLines - 1]} ${lines[maxLines]}`, maxChars);
    return kept;
  }
  return lines.map((l) => shorten(l, maxChars));
}

export function formatDate(iso, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options);
}

// Draws the whole tree into `svg`.
//   state: the object from GET /api/state
//   options.openOddieId: the oddie whose panel is open, if any
//   options.onOddieSelect(oddie): called when an oddie is clicked or
//     activated with Enter or Space
export function renderTree(svg, state, { openOddieId = null, onOddieSelect = () => {} } = {}) {
  const { oddies, self, today_pick: pick } = state;
  const layout = layoutTree(oddies);
  const s = TREE_SPACING;
  const worlds = assignWorlds(oddies);

  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('aria-label', `Tree of ${oddies.length} possible lives for ${self.name}`);

  layout.branches.forEach((branch, index) => {
    const oddie = oddies[index];
    const picked = Boolean(pick && pick.oddie_id === oddie.id);

    const classes = ['tree-branch', `tree-branch--${oddie.status}`];
    if (picked) classes.push('tree-branch--picked');

    const group = el('g', {
      class: classes.join(' '),
      'data-oddie-id': oddie.id,
      'data-status': oddie.status,
      'data-picked': picked,
      // Which illustrated world this path belongs to. Sets its color in CSS.
      'data-world': worlds.get(oddie.id) || 'none',
    });
    group.append(el('path', { class: 'tree-branch__line', d: branch.path }));

    branch.milestones.forEach((point, i) => {
      const milestone = oddie.milestones[i];
      const label = el('text', { class: 'tree-milestone__label', x: point.x, y: point.labelY, 'text-anchor': 'middle' });
      wrapLabel(milestone.title, branch.milestoneLabelChars).forEach((line, lineIndex) => {
        const tspan = el('tspan', { x: point.x, dy: lineIndex === 0 ? 0 : s.labelLineHeight });
        tspan.textContent = line;
        label.append(tspan);
      });
      const title = el('title');
      title.textContent = `${milestone.title} (${milestone.reached ? 'reached' : 'not reached yet'})`;
      group.append(
        el(
          'g',
          {
            class: `tree-milestone tree-milestone--${milestone.reached ? 'reached' : 'unreached'}`,
            'data-milestone-id': milestone.id,
            'data-reached': milestone.reached,
          },
          [title, el('circle', { class: 'tree-milestone__node', cx: point.x, cy: point.y, r: s.milestoneRadius }), label]
        )
      );
    });

    const name = el('text', { class: 'tree-oddie__label', x: branch.oddie.labelX, y: branch.oddie.y - 3 });
    name.textContent = shorten(oddie.name, branch.oddieLabelChars);
    const horizon = el('text', { class: 'tree-oddie__horizon', x: branch.oddie.labelX, y: branch.oddie.y + 17 });
    horizon.textContent = `${oddie.horizon_years} years out${oddie.status === 'dormant' ? ', dormant' : ''}${picked ? ', today' : ''}`;
    const oddieTitle = el('title');
    oddieTitle.textContent = `${oddie.name}. ${oddie.life}`;

    const open = openOddieId === oddie.id;
    const node = el(
      'g',
      {
        class: `tree-oddie${open ? ' tree-oddie--open' : ''}`,
        'data-oddie-id': oddie.id,
        'data-open': open,
        role: 'button',
        tabindex: 0,
        'aria-label': `Talk to ${oddie.name}`,
      },
      [
        oddieTitle,
        el('circle', { class: 'tree-oddie__node', cx: branch.oddie.x, cy: branch.oddie.y, r: s.oddieRadius }),
        name,
        horizon,
      ]
    );
    node.addEventListener('click', () => onOddieSelect(oddie));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOddieSelect(oddie);
      }
    });
    group.append(node);
    svg.append(group);
  });

  // Drawn last so it sits on top of where the branches start.
  const nowLabel = el('text', { class: 'tree-now__label', x: layout.now.x, y: layout.now.y + 6, 'text-anchor': 'middle' });
  nowLabel.textContent = 'Now';
  const nowDate = el('text', { class: 'tree-now__date', x: layout.now.x, y: layout.now.y + s.nowRadius + 22, 'text-anchor': 'middle' });
  nowDate.textContent = formatDate(self.now_date);
  const nowTitle = el('title');
  nowTitle.textContent = `${self.name}, today`;
  svg.append(
    el('g', { class: 'tree-now' }, [
      nowTitle,
      el('circle', { class: 'tree-now__node', cx: layout.now.x, cy: layout.now.y, r: s.nowRadius }),
      nowLabel,
      nowDate,
    ])
  );
}
