// Draws the life paths on the home page: the paths behind you, the dot that
// is today, and the paths ahead fanning out to the lives in the demo.
// An original drawing, generated fresh for whatever size it is given.

const NS = 'http://www.w3.org/2000/svg';

// The five lives in the demo, top to bottom. Colors are the worlds' colors.
const FUTURES = [
  { key: 'designer', label: 'Graphic designer' },
  { key: 'agent', label: 'FBI agent' },
  { key: 'monk', label: 'Buddhist monk' },
  { key: 'painter', label: 'Painter' },
  { key: 'founder', label: 'Entrepreneur' },
];

// A small seeded random source, so the drawing is the same on every visit
// and does not jump around when the window is resized.
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  return node;
}

const round = (n) => Math.round(n * 10) / 10;
const curve = (c) => `M ${round(c[0].x)} ${round(c[0].y)} C ${round(c[1].x)} ${round(c[1].y)}, ${round(c[2].x)} ${round(c[2].y)}, ${round(c[3].x)} ${round(c[3].y)}`;

// A point on a curve, and the direction the curve is heading there.
function pointOn(c, t) {
  const u = 1 - t;
  return {
    x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
    y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y,
  };
}

function headingOn(c, t) {
  const u = 1 - t;
  const x = 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x);
  const y = 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

// A branch that leaves `parent` at point t and settles at `end`, leaving in
// the same direction the parent is travelling so the split looks grown.
function branchFrom(parent, t, end, reach) {
  const start = pointOn(parent, t);
  const heading = headingOn(parent, t);
  return [
    start,
    { x: start.x + heading.x * reach, y: start.y + heading.y * reach },
    { x: start.x + (end.x - start.x) * 0.62, y: end.y },
    end,
  ];
}

// Draws into `svg`.
//   today: { x, y } where the today dot sits, in the svg's own pixels
//   dotRadius: how big the today dot is
//   em: the headline's font size, so the path can run under the words
//   compact: the small layout used under the words on phones
//   animate: grow the paths in (false redraws them already grown)
//   motion: allow the looping motion (travelling dots, the pulse)
export function drawPaths(svg, { today, dotRadius = 11, em = 100, compact = false, animate = true, motion = true }) {
  const width = svg.clientWidth;
  const height = svg.clientHeight;
  if (!width || !height) return;
  const random = seeded(11);
  const between = (min, max) => min + random() * (max - min);

  svg.setAttribute('viewBox', `0 0 ${round(width)} ${round(height)}`);
  svg.replaceChildren();
  svg.classList.toggle('paths--settled', !animate);
  svg.dataset.layout = compact ? 'compact' : 'wide';

  const layers = { past: el('g', { class: 'paths__past' }), future: el('g', { class: 'paths__future' }), marks: el('g', { class: 'paths__marks' }) };
  // How long after the start each part begins to grow, in seconds.
  const YOUR_PATH_S = 0.15;
  const TODAY_S = 1.0;
  const FUTURE_S = 1.15;
  const MAIN_GROW_S = 1.5;

  const line = (points, className, delay, duration, extra = {}) =>
    el('path', {
      class: `paths__line ${className}`,
      d: typeof points === 'string' ? points : curve(points),
      pathLength: 1,
      style: `--delay: ${round(delay)}s; --grow: ${round(duration)}s`,
      ...extra,
    });

  // ---------- Behind you ----------
  // Faint paths that start at the left edge and stop short of today: closed.
  const pastCount = compact ? 4 : 7;
  for (let i = 0; i < pastCount; i += 1) {
    const startY = height * (0.08 + (0.84 * i) / (pastCount - 1)) + between(-10, 10);
    const endX = today.x - between(today.x * 0.12, today.x * 0.55);
    const endY = startY + (today.y - startY) * between(0.25, 0.7);
    layers.past.append(
      line(
        [
          { x: -20, y: startY },
          { x: endX * 0.35, y: startY + between(-24, 24) },
          { x: endX * 0.7, y: endY + between(-30, 30) },
          { x: endX, y: endY },
        ],
        'paths__line--closed',
        between(0, 0.5),
        1.1
      )
    );
  }
  // The one you actually took. It wanders, then arrives at today.
  let yours;
  if (compact) {
    const bend = { x: today.x * 0.5, y: today.y + height * 0.2 };
    yours =
      `M -20 ${round(height * 0.86)} ` +
      `C ${round(today.x * 0.16)} ${round(height * 0.9)}, ${round(today.x * 0.3)} ${round(bend.y + 30)}, ${round(bend.x)} ${round(bend.y)} ` +
      `S ${round(today.x * 0.82)} ${round(today.y + 4)}, ${round(today.x)} ${round(today.y)}`;
  } else {
    // On wide screens it climbs the left margin, then runs under "One you"
    // like an underline and ends at the full stop.
    const under = today.y + em * 0.27;
    yours =
      `M -20 ${round(today.y + em * 2.3)} ` +
      `C ${round(em * 0.25)} ${round(today.y + em * 1.5)}, ${round(em * 0.1)} ${round(under + em * 0.1)}, ${round(em * 1.25)} ${round(under)} ` +
      `S ${round(today.x - em * 1.5)} ${round(under - em * 0.05)}, ${round(today.x - em * 0.75)} ${round(under)} ` +
      `S ${round(today.x - em * 0.12)} ${round(today.y + em * 0.2)}, ${round(today.x)} ${round(today.y)}`;
  }
  layers.past.append(line(yours, 'paths__line--yours', YOUR_PATH_S, 0.9));

  // ---------- Still open ----------
  const edge = width - (compact ? 14 : Math.max(48, width * 0.045));
  const reach = edge - today.x;
  const top = height * (compact ? 0.1 : 0.12);
  const bottom = height * (compact ? 0.9 : 0.88);
  const gap = (bottom - top) / (FUTURES.length - 1);

  FUTURES.forEach((future, i) => {
    const group = el('g', { class: `paths__family paths__family--${future.key}`, 'data-path': future.key });
    const end = { x: edge, y: top + gap * i + between(-6, 6) };
    const main = [
      today,
      { x: today.x + reach * 0.3, y: today.y + (end.y - today.y) * 0.04 },
      { x: today.x + reach * 0.6, y: end.y + (today.y - end.y) * 0.14 + between(-10, 10) },
      end,
    ];

    // Two side branches per life, one above and one below, and one twig.
    const sides = [];
    [-1, 1].forEach((side, n) => {
      const leaveAt = between(0.42, 0.62) + n * 0.06;
      const sideEnd = { x: edge - between(0, reach * 0.1), y: end.y + side * gap * between(0.26, 0.44) };
      const points = branchFrom(main, leaveAt, sideEnd, reach * 0.16);
      sides.push({ points, leaveAt });
    });
    const twigFrom = sides[i % 2];
    const twigEnd = { x: edge - between(reach * 0.02, reach * 0.14), y: twigFrom.points[3].y + (i % 2 ? 1 : -1) * gap * 0.16 };
    const twig = branchFrom(twigFrom.points, 0.5, twigEnd, reach * 0.08);

    const twigStart = FUTURE_S + twigFrom.leaveAt * MAIN_GROW_S + 0.45;
    group.append(line(twig, 'paths__line--twig', twigStart, 0.7));
    for (const { points, leaveAt } of sides) {
      const start = FUTURE_S + leaveAt * MAIN_GROW_S;
      group.append(line(points, 'paths__line--side', start, 0.9));
      group.append(el('circle', { class: 'paths__end paths__end--small', cx: round(points[3].x), cy: round(points[3].y), r: compact ? 2.5 : 3.5, style: `--delay: ${round(start + 0.85)}s` }));
    }
    const id = `life-${future.key}`;
    group.append(line(main, 'paths__line--main', FUTURE_S + i * 0.07, MAIN_GROW_S, { id }));

    const arrive = FUTURE_S + i * 0.07 + MAIN_GROW_S - 0.1;
    group.append(el('circle', { class: 'paths__end', cx: round(end.x), cy: round(end.y), r: compact ? 5 : 7.5, style: `--delay: ${round(arrive)}s` }));
    const label = el('text', {
      class: 'paths__label',
      x: round(end.x - (compact ? 10 : 16)),
      y: round(end.y - (compact ? 10 : 15)),
      'text-anchor': 'end',
      style: `--delay: ${round(arrive + 0.1)}s; --drift: ${round(between(5, 8))}s`,
    });
    label.textContent = future.label;
    group.append(label);

    // A small dot that keeps setting out from today along this life.
    if (motion) {
      const traveller = el('circle', { class: 'paths__traveller', r: compact ? 2.5 : 3.5, opacity: 0 });
      const duration = round(between(8, 12));
      const begin = round(FUTURE_S + MAIN_GROW_S + 0.6 + i * 1.3);
      const move = el('animateMotion', { dur: `${duration}s`, begin: `${begin}s`, repeatCount: 'indefinite' });
      move.append(el('mpath', { href: `#${id}` }));
      traveller.append(move, el('animate', { attributeName: 'opacity', values: '0;0.9;0.9;0', keyTimes: '0;0.08;0.8;1', dur: `${duration}s`, begin: `${begin}s`, repeatCount: 'indefinite' }));
      group.append(traveller);
    }
    layers.future.append(group);
  });

  // ---------- Today ----------
  layers.marks.append(el('line', { class: 'paths__today-line', x1: round(today.x), y1: 0, x2: round(today.x), y2: round(height) }));
  const radius = compact ? 7 : dotRadius;
  if (motion) layers.marks.append(el('circle', { class: 'paths__pulse', cx: round(today.x), cy: round(today.y), r: radius }));
  layers.marks.append(el('circle', { class: 'paths__today', cx: round(today.x), cy: round(today.y), r: radius, style: `--delay: ${TODAY_S}s` }));
  const caption = (text, x, anchor, className) => {
    const node = el('text', { class: `paths__caption ${className}`, x: round(x), y: round(height - (compact ? 8 : 26)), 'text-anchor': anchor });
    node.textContent = text;
    return node;
  };
  const todayLabel = el('text', { class: 'paths__caption paths__caption--today', x: round(today.x), y: round(compact ? 14 : 34), 'text-anchor': 'middle' });
  todayLabel.textContent = 'Today';
  layers.marks.append(todayLabel, caption('Still open', today.x + (compact ? 10 : 18), 'start', 'paths__caption--future'));
  // There is no room for this one to the left of today on a phone.
  if (!compact) layers.marks.append(caption('Behind you', today.x - 18, 'end', 'paths__caption--past'));

  svg.append(layers.past, layers.future, layers.marks);
}
