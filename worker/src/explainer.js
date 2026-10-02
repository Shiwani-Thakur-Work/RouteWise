/**
 * explainer.js
 * Generates a human-readable explanation of why a particular route was chosen.
 * This is a deliberate product feature — not a black-box recommendation.
 */

const CATEGORY_LABELS = {
  pharmacy:       '💊 Pharmacy',
  restaurant:     '🍽️ Restaurant',
  grocery:        '🛒 Grocery',
  gift_shop:      '🎁 Gift shop',
  coffee:         '☕ Café',
  atm:            '🏧 ATM',
  petrol_station: '⛽ Petrol station',
  other:          '📍 Stop'
};

/**
 * Generate an explanation for the recommended route.
 *
 * @param {Array} orderedStops - ordered selected stops
 * @param {number} totalDetour - total additional minutes
 * @param {number} maxDetour - user's constraint
 * @param {boolean} withinConstraint
 * @returns {string}
 */
export function generateExplanation(orderedStops, totalDetour, maxDetour, withinConstraint) {
  const stopDescriptions = orderedStops.map(s => {
    const label = CATEGORY_LABELS[s.task.category] || CATEGORY_LABELS.other;
    return `${label}: **${s.candidate.name}** (${s.detour_min} min detour)`;
  });

  const constraintLine = withinConstraint
    ? `All stops fit within your ${maxDetour}-minute limit — total additional travel is approximately **${totalDetour} minutes**.`
    : `Note: we couldn't satisfy all tasks within ${maxDetour} minutes. Best available route adds **${totalDetour} minutes** of travel.`;

  const stopList = stopDescriptions.join(', ');

  return `We selected ${stopList}. ${constraintLine} Stops are ordered to minimise backtracking along your route.`;
}

/**
 * Get the emoji icon for a category (for use in frontend).
 */
export function getCategoryIcon(category) {
  const icons = {
    pharmacy:       '💊',
    restaurant:     '🍽️',
    grocery:        '🛒',
    gift_shop:      '🎁',
    coffee:         '☕',
    atm:            '🏧',
    petrol_station: '⛽',
    other:          '📍'
  };
  return icons[category] || '📍';
}
