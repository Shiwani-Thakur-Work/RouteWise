/**
 * candidateScorer.js
 * Scores each candidate place using a weighted multi-factor model.
 *
 * Weights are a V1 product hypothesis — to be validated through user experiments.
 * See docs/ProblemStatement.md §7 for rationale.
 */

const WEIGHTS = {
  travel_cost:      0.40, // detour added — most important for urban users
  task_satisfaction: 0.25, // does the place fulfil the errand?
  place_quality:    0.15, // rating / quality signals
  budget_fit:       0.10, // within stated budget constraint
  preference_match: 0.10  // dietary / style preferences
};

/**
 * Score a single candidate for a given task.
 *
 * @param {object} candidate - { id, name, lat, lng, tags }
 * @param {object} task - { category, preferences, budget_inr }
 * @param {number} detour_min - detour this candidate adds in minutes
 * @param {number} maxDetour - user's max acceptable detour
 * @returns {number} score between 0 and 1
 */
export function scoreCandidate(candidate, task, detour_min, maxDetour) {
  // 1. Travel cost: lower detour = higher score
  const travelScore = 1 - Math.min(detour_min / Math.max(maxDetour, 1), 1);

  // 2. Task satisfaction: named place = fully satisfies task
  const taskScore = candidate.name ? 1 : 0.5;

  // 3. Place quality: use OSM stars tag if present, otherwise neutral 0.5
  let qualityScore = 0.5;
  if (candidate.tags?.stars) {
    qualityScore = Math.min(parseFloat(candidate.tags.stars) / 5, 1);
  } else if (candidate.tags?.['rating']) {
    qualityScore = Math.min(parseFloat(candidate.tags['rating']) / 5, 1);
  }

  // 4. Budget fit: if no budget constraint, full score; else placeholder until price data available
  const budgetScore = task.budget_inr ? 0.8 : 1.0;

  // 5. Preference match: check dietary/style preferences against OSM tags
  const prefScore = scorePreferences(candidate.tags, task.preferences || []);

  const total =
    travelScore  * WEIGHTS.travel_cost +
    taskScore    * WEIGHTS.task_satisfaction +
    qualityScore * WEIGHTS.place_quality +
    budgetScore  * WEIGHTS.budget_fit +
    prefScore    * WEIGHTS.preference_match;

  return Math.round(total * 1000) / 1000; // 3 decimal places
}

/**
 * Score preference matching against OSM tags.
 * @param {object} tags - OSM tags for the place
 * @param {string[]} preferences - e.g. ['vegetarian', 'vegan']
 * @returns {number} 0–1
 */
function scorePreferences(tags = {}, preferences = []) {
  if (preferences.length === 0) return 1.0;

  const tagString = JSON.stringify(tags).toLowerCase();
  let matched = 0;

  for (const pref of preferences) {
    if (tagString.includes(pref.toLowerCase())) matched++;
  }

  return matched / preferences.length;
}

/**
 * Given a list of scored candidates, return the best one.
 * @param {Array<{candidate, score, detour_min, route_geometry}>} scored
 * @returns {object} best scored candidate entry
 */
export function selectBest(scored) {
  return scored.sort((a, b) => b.score - a.score)[0];
}
