// Draws the tree as SVG: Now on the left, one branch per oddie, milestones
// along each branch. No data fetching here: give it the state from
// GET /api/state and it draws.
import { assignWorlds } from './worlds.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Every number that decides where things sit. Designers: change spacing here.
// Units are SVG user units (the viewBox is `width` wide).
//
// WIDE is for tablets and up: every milestone has its label under it and the
// oddie's name sits at the end of the branch.
export const TREE_SPACING = {
  compact: false,
  width: 1260,
  rowHeight: 140, // vertical distance between branches
  paddingY: 80, // room above the first branch and below the last
  nowX: 92, // the Now node
  fanEndX: 270, // where a branch stops curving and runs flat
  milestoneStartX: 330, // first milestone on a branch
  milestoneEndX: 880, // last milestone on a branch
  oddieX: 968, // the oddie at the end
  nowRadius: 30,
  milestoneRadius: 11,
  oddieRadius: 18,
  labelOffsetY: 36, // milestone label, distance below its node
  labelLineHeight: 15,
  labelCharWidth: 6.9, // rough width of one label character, used for wrapping
  oddieLabelGap: 14, // space between the oddie and its name
  oddieLabelCharWidth: 9.2,
};

// COMPACT is for phones. The whole tree fits the screen width with no
// sideways scrolling. The oddie's name sits above its branch and one line
// under it says what comes next.
export const TREE_SPACING_COMPACT = {
  compact: true,
  width: 390,
  rowHeight: 112,
  paddingY: 66,
  nowX: 30,
  fanEndX: 66,
  milestoneStartX: 88,
  milestoneEndX: 316,
  oddieX: 358,
  nowRadius: 22,
  milestoneRadius: 10,
  oddieRadius: 13,
  nameOffsetY: -26, // the oddie's name, above the branch
  nextOffsetY: 34, // the "Next: ..." line, under the branch
  textCharWidth: 6.9,
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
      labelY: y + (s.labelOffsetY || 0),
    }));
    const branch = {
      oddieId: oddie.id,
      // Curves out from the Now node, then runs flat to the oddie.
      path: `M ${now.x} ${now.y} C ${curveX} ${now.y}, ${curveX} ${y}, ${s.fanEndX} ${y} L ${s.oddieX} ${y}`,
      milestones,
      oddie: { x: s.oddieX, y },
    };
    if (s.compact) {
      const textX = s.milestoneStartX - s.milestoneRadius;
      const chars = Math.floor((s.width - textX - 8) / s.textCharWidth);
      branch.name = { x: textX, y: y + s.nameOffsetY, chars: chars - 6 };
      branch.next = { x: textX, y: y + s.nextOffsetY, chars };
    } else {
      branch.milestoneLabelChars = Math.max(8, Math.floor((gap - 14) / s.labelCharWidth));
      branch.name = {
        x: s.oddieX + s.oddieRadius + s.oddieLabelGap,
        y: y - 3,
        chars: Math.floor((s.width - s.oddieX - s.oddieRadius - s.oddieLabelGap - 8) / s.oddieLabelCharWidth),
      };
      branch.horizon = { x: branch.name.x, y: y + 17 };
    }
    return branch;
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

function textNode(className, x, y, content, extra = {}) {
  const node = el('text', { class: className, x, y, ...extra });
  node.textContent = content;
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

// Makes an SVG group act as a button for mouse, touch and keyboard.
function actAsButton(node, label, onActivate) {
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', 0);
  node.setAttribute('aria-label', label);
  node.addEventListener('click', onActivate);
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  });
}

// Draws the whole tree into `svg`.
//   state: the object from GET /api/state
//   options.compact: use the phone layout
//   options.openOddieId: the oddie whose sheet is open, if any
//   options.openMilestoneId: the milestone whose research is open, if any
//   options.onOddieSelect(oddie): an oddie was chosen
//   options.onMilestoneSelect(oddie, milestone): a milestone was chosen
export function renderTree(
  svg,
  state,
  { compact = false, openOddieId = null, openMilestoneId = null, onOddieSelect = () => {}, onMilestoneSelect = () => {} } = {}
) {
  const { oddies, self, today_pick: pick } = state;
  const s = compact ? TREE_SPACING_COMPACT : TREE_SPACING;
  const layout = layoutTree(oddies, s);
  const worlds = assignWorlds(oddies);

  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('aria-label', `Tree of ${oddies.length} possible lives for ${self.name}`);
  svg.dataset.layout = compact ? 'compact' : 'wide';

  layout.branches.forEach((branch, index) => {
    const oddie = oddies[index];
    const picked = Boolean(pick && pick.oddie_id === oddie.id);
    const nextMilestone = oddie.milestones.find((m) => !m.reached) || null;
    const researched = new Map((oddie.research || []).map((r) => [r.milestone_id, r]));

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
      const research = researched.get(milestone.id);
      const isNext = Boolean(nextMilestone && nextMilestone.id === milestone.id);
      const sourceCount = research ? research.sources.length : 0;

      const states = [milestone.reached ? 'reached' : 'unreached'];
      if (isNext) states.push('next');
      if (research) states.push('researched');
      if (milestone.id === openMilestoneId) states.push('open');

      const node = el('g', {
        class: `tree-milestone ${states.map((state) => `tree-milestone--${state}`).join(' ')}`,
        'data-milestone-id': milestone.id,
        'data-reached': milestone.reached,
        'data-next': isNext,
        'data-researched': Boolean(research),
        'data-sources': sourceCount,
      });

      const title = el('title');
      title.textContent = `${milestone.title} (${milestone.reached ? 'reached' : 'not reached yet'}${research ? `, ${sourceCount} sources found` : ''})`;
      node.append(title);

      // A wide invisible disc so the milestone is easy to tap.
      node.append(el('circle', { class: 'tree-milestone__hit', cx: point.x, cy: point.y, r: 22 }));
      // A ring around milestones Nimble has researched.
      if (research) node.append(el('circle', { class: 'tree-milestone__halo', cx: point.x, cy: point.y, r: s.milestoneRadius + 7 }));
      node.append(el('circle', { class: 'tree-milestone__node', cx: point.x, cy: point.y, r: s.milestoneRadius }));

      if (!s.compact) {
        const label = el('text', { class: 'tree-milestone__label', x: point.x, y: point.labelY, 'text-anchor': 'middle' });
        wrapLabel(milestone.title, branch.milestoneLabelChars).forEach((line, lineIndex) => {
          const tspan = el('tspan', { x: point.x, dy: lineIndex === 0 ? 0 : s.labelLineHeight });
          tspan.textContent = line;
          label.append(tspan);
        });
        node.append(label);
        if (research) {
          node.append(
            textNode('tree-milestone__sources', point.x, point.y - s.milestoneRadius - 14, `${sourceCount} sources`, {
              'text-anchor': 'middle',
            })
          );
        }
      }

      actAsButton(
        node,
        `${milestone.title}. ${milestone.reached ? 'Reached' : isNext ? 'Next milestone' : 'Not reached yet'}${
          research ? `, ${sourceCount} sources found` : ''
        }. On the path of ${oddie.name}`,
        () => onMilestoneSelect(oddie, milestone)
      );
      group.append(node);
    });

    const open = openOddieId === oddie.id;
    const oddieNode = el('g', { class: `tree-oddie${open ? ' tree-oddie--open' : ''}`, 'data-oddie-id': oddie.id, 'data-open': open });
    const oddieTitle = el('title');
    oddieTitle.textContent = `${oddie.name}. ${oddie.life}`;
    oddieNode.append(
      oddieTitle,
      el('circle', { class: 'tree-oddie__hit', cx: branch.oddie.x, cy: branch.oddie.y, r: 22 }),
      el('circle', { class: 'tree-oddie__node', cx: branch.oddie.x, cy: branch.oddie.y, r: s.oddieRadius }),
      textNode('tree-oddie__label', branch.name.x, branch.name.y, shorten(oddie.name, branch.name.chars))
    );
    if (s.compact) {
      // One line under the branch: what comes next, and whether it is researched.
      const research = nextMilestone && researched.get(nextMilestone.id);
      const suffix = research ? ` · ${research.sources.length} sources` : '';
      const line = nextMilestone
        ? shorten(`Next: ${nextMilestone.title}`, branch.next.chars - suffix.length) + suffix
        : 'Every milestone reached';
      group.append(textNode('tree-branch__next', branch.next.x, branch.next.y, line));
    } else {
      const note = `${oddie.horizon_years} years out${oddie.status === 'dormant' ? ', dormant' : ''}${picked ? ', today' : ''}`;
      oddieNode.append(textNode('tree-oddie__horizon', branch.horizon.x, branch.horizon.y, note));
    }
    actAsButton(oddieNode, `Talk to ${oddie.name}`, () => onOddieSelect(oddie));
    group.append(oddieNode);
    svg.append(group);
  });

  // Drawn last so it sits on top of where the branches start.
  const nowTitle = el('title');
  nowTitle.textContent = `${self.name}, today`;
  const nowGroup = el('g', { class: 'tree-now' }, [
    nowTitle,
    el('circle', { class: 'tree-now__node', cx: layout.now.x, cy: layout.now.y, r: s.nowRadius }),
    textNode('tree-now__label', layout.now.x, layout.now.y + (s.compact ? 4.5 : 6), 'Now', { 'text-anchor': 'middle' }),
  ]);
  if (!s.compact) {
    nowGroup.append(
      textNode('tree-now__date', layout.now.x, layout.now.y + s.nowRadius + 22, formatDate(self.now_date), { 'text-anchor': 'middle' })
    );
  }
  svg.append(nowGroup);
}
