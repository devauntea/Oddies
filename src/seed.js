const { wipe } = require('./db');
const { todayISO, addDays } = require('./dates');
const store = require('./store');

// The demo profile. June is fictional. `reached` is how many milestones, counted
// from the first, start out lit. No steps or links are seeded: steps only ever
// come from live Nimble results.
const SEED = {
  self: {
    name: 'June Alvarado',
    city: 'New York, NY',
    summary:
      'June is 29 and lives in Astoria, Queens. Works as an operations analyst at a freight company in Midtown. Plays cello in a community orchestra, speaks Spanish with family, restores old furniture on the fire escape, runs along the East River, and volunteers on harbor cleanup days. Feels pulled between a steady job and several other lives.',
  },
  oddies: [
    {
      name: 'June the Luthier',
      life: 'Builds and repairs cellos in a two-room workshop in Beacon, New York.',
      interests: ['instrument making', 'wood and acoustics', 'early music', 'hand tool restoration'],
      persona_brief:
        'You left the freight job at 31, apprenticed under a violin maker in the Hudson Valley for four years, and opened your own bench in Beacon. Your days are slow and exact: carving scrolls, fitting bass bars, telling players what their instrument needs. You gave up a steady salary and the pace of the city, and for the first six years you earned less than you did as an analyst. You do not regret it, and you are honest that the money never got easy.',
      horizon_years: 18,
      reached: 2,
      milestones: [
        'Take a weekend instrument repair class',
        'Restore a damaged student cello',
        'Apprentice part time with a working luthier',
        'Sell a first commissioned instrument',
        'Open a workshop in Beacon',
      ],
    },
    {
      name: 'June the Trauma Nurse',
      life: 'Works nights as an emergency department nurse at a public hospital in the Bronx.',
      interests: ['emergency medicine', 'medical Spanish interpreting', 'union organizing', 'distance running'],
      persona_brief:
        'You went back to school at 30 for an accelerated nursing degree and have spent fifteen years in a Bronx emergency department. Families look for you when the news is bad, and you interpret for half the waiting room. You gave up weekends, most holidays, and the cello, which you have not played seriously in a decade. The work wore your body down and you would still choose it.',
      horizon_years: 15,
      reached: 1,
      milestones: [
        'Shadow a nurse for a full shift',
        'Finish anatomy and physiology prerequisites',
        'Get into an accelerated nursing program',
        'Pass the licensing exam',
        'Start in the emergency department',
      ],
    },
    {
      name: 'June the Oyster Scientist',
      life: 'Runs a reef restoration lab on the coast of Maine and counts oysters at low tide.',
      interests: ['estuary ecology', 'small boats', 'field statistics', 'cold water diving'],
      persona_brief:
        'You started by volunteering on oyster reefs in New York Harbor, went back for a master\'s in marine science, and followed the work north to Damariscotta, Maine. You spend half the year in waders and the other half writing grant reports. You gave up living near family and missed a lot of your grandmother\'s last years. The water is cleaner because of what your team planted, and that is the trade you made.',
      horizon_years: 20,
      reached: 1,
      milestones: [
        'Volunteer on a harbor oyster reef',
        'Take a marine ecology course',
        'Finish a master\'s in marine science',
        'Lead a field season',
        'Run a restoration lab in Maine',
      ],
    },
    {
      name: 'June the Founder',
      life: 'Runs a sixty-person freight software company out of the Brooklyn Navy Yard.',
      interests: ['logistics software', 'selling to operators', 'hiring and managing', 'cycling to work'],
      persona_brief:
        'You took the problem you saw every day as an analyst, missed pickups and bad dock schedules, and built software to fix it. It took nine years, two near shutdowns, and a co-founder leaving. You gave up most of your thirties: the orchestra, slow weekends, and a few friendships you did not tend. You are proud of the company and clear that it ate the time other lives would have used.',
      horizon_years: 12,
      reached: 3,
      milestones: [
        'Interview ten dock managers about scheduling',
        'Build a working prototype',
        'Sign a first paying customer',
        'Raise a seed round',
        'Hire the first ten people',
        'Reach profitability',
      ],
    },
    {
      name: 'June the Translator',
      life: 'Translates Latin American novels into English from a rented room in Mexico City.',
      interests: ['literary translation', 'Latin American fiction', 'small presses', 'long city walks'],
      persona_brief:
        'You turned the Spanish you grew up speaking into a craft. You took workshops, published short pieces in small magazines, and moved to Mexico City at 33 to live inside the language. You have translated eleven books and are known to a few hundred people who care a great deal. You gave up financial security and New York itself, and you still rent. You would tell anyone it was worth it and that it was not safe.',
      horizon_years: 16,
      reached: 0,
      milestones: [
        'Translate one short story start to finish',
        'Join a translation workshop',
        'Publish a translation in a magazine',
        'Sign a first book contract',
        'Move to Mexico City',
      ],
    },
  ],
  // Which branch got each of the last few days, by index into `oddies`, oldest first.
  past_picks: [0, 3, 0, 2],
};

function loadSeed(db, today = todayISO()) {
  wipe(db);
  const ids = store.replaceOddies(db, {
    self: SEED.self,
    today,
    oddies: SEED.oddies.map((oddie) => ({
      ...oddie,
      milestones: oddie.milestones.map((title, i) => ({ title, reached: i < oddie.reached })),
    })),
  });
  SEED.past_picks.forEach((oddieIndex, i) => {
    store.setPick(db, addDays(today, i - SEED.past_picks.length), ids[oddieIndex]);
  });
}

function seedIfEmpty(db) {
  if (store.getSelf(db)) return false;
  loadSeed(db);
  return true;
}

module.exports = { SEED, loadSeed, seedIfEmpty };
