// The four illustrated worlds on the map, and which oddie lives in which.
// World names, places and themes come from the team's playbook (temporal/style.md).

export const WORLDS = [
  {
    key: 'serenity',
    name: 'Quiet Peaks',
    outfit: 'monk',
    match: /monk|zen|buddh|meditat|temple|monast|retreat|spirit|priest|yoga|contemplat/gi,
  },
  {
    key: 'midnight',
    name: 'Midnight City',
    outfit: 'agent',
    match: /fbi|agent|detective|investigat|police|officer|forensic|spy|intelligence|journalis|lawyer|attorney/gi,
  },
  {
    key: 'artist',
    name: 'Color Valley',
    outfit: 'painter',
    match: /paint|artist|illustrat|design|craft|ceramic|sculpt|photograph|music|writer|poet|film|studio art|gallery/gi,
  },
  {
    key: 'founder',
    name: 'Idea Gardens',
    outfit: 'founder',
    match: /founder|entrepreneur|startup|business|company|ceo|invent|venture|software|product/gi,
  },
];

const byKey = Object.fromEntries(WORLDS.map((world) => [world.key, world]));

function score(world, oddie) {
  const count = (text) => (String(text || '').match(world.match) || []).length;
  // The name says most about who this oddie is, so it counts for more.
  return count(oddie.name) * 5 + count(oddie.life) * 2 + count((oddie.interests || []).join(' '));
}

// Gives each oddie a world. Returns a Map of oddie id to world key, or to
// null for oddies beyond the four worlds.
//   1. Each world goes to the oddie that fits it best, if any fits.
//   2. Oddies still without a world take the free worlds in order, so a set
//      of paths that matches none of the art still fills the map.
export function assignWorlds(oddies) {
  const assigned = new Map(oddies.map((oddie) => [oddie.id, null]));
  const taken = new Set();

  const pairs = [];
  for (const world of WORLDS) {
    for (const oddie of oddies) {
      const points = score(world, oddie);
      if (points > 0) pairs.push({ world: world.key, oddie: oddie.id, points });
    }
  }
  pairs.sort((a, b) => b.points - a.points);
  for (const pair of pairs) {
    if (taken.has(pair.world) || assigned.get(pair.oddie)) continue;
    assigned.set(pair.oddie, pair.world);
    taken.add(pair.world);
  }

  const free = WORLDS.map((world) => world.key).filter((key) => !taken.has(key));
  for (const oddie of oddies) {
    if (!assigned.get(oddie.id) && free.length) assigned.set(oddie.id, free.shift());
  }
  return assigned;
}

// The world for one oddie: { key, name, outfit }. Oddies with no world get
// key "none" and the everyday outfit.
export function worldFor(state, oddieId) {
  const key = assignWorlds(state.oddies).get(oddieId);
  return byKey[key] || { key: 'none', name: 'The meadow', outfit: 'base' };
}
