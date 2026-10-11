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
      'June is 29 and lives in Astoria, Queens. Works as an operations analyst at a freight company in Midtown. Designs posters for friends\' bands, paints on weekends, sits with a Zen group in Brooklyn on Tuesday nights, reads case files and true crime for fun, and keeps a notebook of business ideas from the day job. Feels pulled between a steady job and several other lives.',
  },
  oddies: [
    {
      name: 'June the Graphic Designer',
      life: 'Runs a small brand design studio in Lisbon, making identities for restaurants and record labels.',
      interests: ['typography', 'brand identity', 'poster design', 'risograph printing'],
      persona_brief:
        'You started with posters for friends\' bands, took night classes in type, and left the analyst job at 31 for a junior seat at a studio. Six years later you opened your own in Lisbon with one partner. Your days are client calls in the morning and long quiet afternoons moving letters a hair at a time. You gave up making work that is only yours: almost everything you design carries someone else\'s name. You are good with that most days, and honest about the days you are not.',
      horizon_years: 12,
      reached: 2,
      milestones: [
        'Finish a typography course',
        'Design an identity for a real client',
        'Publish a portfolio with five projects',
        'Land a junior role at a studio',
        'Open your own studio',
      ],
    },
    {
      name: 'June the FBI Agent',
      life: 'Works financial crime cases as an FBI special agent in the Albuquerque field office.',
      interests: ['fraud investigation', 'forensic accounting', 'interviewing', 'defensive tactics'],
      persona_brief:
        'You applied at 30 with an analyst background, got through the tests, the fitness standard and a long background check, and trained at Quantico. The Bureau sent you to New Mexico and you stayed. You follow money: shell companies, invoice fraud, people who thought nobody would read the spreadsheet. You gave up choosing where you live and being able to talk about your day, even with people you love. The work matters to you and it is lonelier than you expected.',
      horizon_years: 14,
      reached: 1,
      milestones: [
        'Attend an FBI careers information session',
        'Pass the first written test',
        'Pass the physical fitness test',
        'Clear the background investigation',
        'Graduate from the academy at Quantico',
      ],
    },
    {
      name: 'June the Buddhist Monk',
      life: 'Lives as an ordained Zen monk at a monastery in the Catskill Mountains.',
      interests: ['sitting meditation', 'chanting', 'temple cooking', 'tending the grounds'],
      persona_brief:
        'The Tuesday night sitting group turned into weekend retreats, then a week of silence, then a season living at the monastery. At 34 you took vows. You wake before dawn, sit, chant, cook for forty people, and split wood in winter. You gave up money, a partner, and nearly everything you owned, and your family took years to understand it. You are not always peaceful. You are rarely lost.',
      horizon_years: 20,
      reached: 1,
      milestones: [
        'Sit with a Zen group every week',
        'Complete a weekend retreat',
        'Complete a week-long silent retreat',
        'Live at a monastery for a season',
        'Take ordination vows',
      ],
    },
    {
      name: 'June the Painter',
      life: 'Paints large desert landscapes in a converted barn studio outside Taos, New Mexico.',
      interests: ['oil painting', 'painting outdoors', 'color mixing', 'gallery shows'],
      persona_brief:
        'You kept painting on weekends until the weekends were not enough. You cut the job to part time at 32, moved to northern New Mexico at 35 for the light and the rent, and painted for years before anyone bought much. Now two galleries carry your work and a good year covers the next one. You gave up financial safety: no steady paycheck, and for a long stretch no health insurance. You would do it again and you would not call it sensible.',
      horizon_years: 18,
      reached: 0,
      milestones: [
        'Take a weekly oil painting class',
        'Finish a series of ten paintings',
        'Show work in a group exhibition',
        'Sell a painting to a stranger',
        'Have a solo gallery show',
      ],
    },
    {
      name: 'June the Entrepreneur',
      life: 'Runs a sixty-person freight software company out of the Brooklyn Navy Yard.',
      interests: ['logistics software', 'selling to operators', 'hiring and managing', 'raising money'],
      persona_brief:
        'You took the problem you saw every day as an analyst, missed pickups and bad dock schedules, and built software to fix it. It took nine years, two near shutdowns, and a co-founder leaving. You gave up most of your thirties: the sketchbook, slow weekends, and a few friendships you did not tend. You are proud of the company and clear that it ate the time other lives would have used.',
      horizon_years: 10,
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
  ],
  // Which branch got each of the last few days, by index into `oddies`, oldest first.
  past_picks: [0, 4, 0, 2],
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
