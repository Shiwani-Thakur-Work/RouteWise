/**
 * ItineraryPanel.jsx
 * Full ordered itinerary with journey spine, stop cards,
 * explanation banner, and feedback widget.
 */

import StopCard from './StopCard';
import ExplanationBanner from './ExplanationBanner';

export default function ItineraryPanel({ planData, onRemove, onFeedback, feedbackGiven }) {
  const { route, explanation } = planData;
  const { stops, start, destination, total_detour_min, within_constraint, notFound } = route;
  const maxDetour = planData.requirements.constraints.max_detour_minutes ?? 60;

  return (
    <div className="itinerary-panel">
      {/* Header summary */}
      <div className="itinerary-header">
        <span className="itinerary-title">Your Route</span>
        <span className={`route-summary ${within_constraint ? 'ok' : 'warn'}`}>
          {within_constraint ? '✓' : '⚠'} +{total_detour_min} min
          {!within_constraint && ` (limit: ${maxDetour})`}
        </span>
      </div>

      {/* Not-found warnings */}
      {notFound && notFound.length > 0 && (
        <div className="message-card info" style={{ marginBottom: '14px', marginLeft: 0, marginRight: 0 }}>
          ⚠ Could not find: <strong>{notFound.join(', ')}</strong> near your route. Try widening your constraints.
        </div>
      )}

      {/* Journey spine */}
      <div className="journey-spine">
        {/* Origin */}
        <div className="journey-point">
          <div className="journey-point-dot" />
          <span>
            <strong>Start:</strong> {start.displayName}
          </span>
        </div>

        {/* Stops */}
        {stops.length === 0 ? (
          <div className="message-card info" style={{ marginLeft: 0, marginRight: 0 }}>
            No stops found. All tasks were removed or could not be located.
          </div>
        ) : (
          stops.map((stop, i) => (
            <StopCard
              key={stop.id}
              stop={stop}
              index={i}
              onRemove={onRemove}
            />
          ))
        )}

        {/* Destination */}
        <div className="journey-point">
          <div className="journey-point-dot dest" />
          <span>
            <strong>Destination:</strong> {destination.displayName}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <ExplanationBanner explanation={explanation} />

      {/* Feedback */}
      <div className="feedback-row">
        <span className="feedback-label">Was this route helpful?</span>
        <button
          id="feedback-up-btn"
          className={`feedback-btn ${feedbackGiven === 'up' ? 'selected' : ''}`}
          onClick={() => onFeedback('up')}
          aria-label="Thumbs up"
          disabled={!!feedbackGiven}
        >
          👍
        </button>
        <button
          id="feedback-down-btn"
          className={`feedback-btn ${feedbackGiven === 'down' ? 'selected' : ''}`}
          onClick={() => onFeedback('down')}
          aria-label="Thumbs down"
          disabled={!!feedbackGiven}
        >
          👎
        </button>
        {feedbackGiven && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thanks!</span>
        )}
      </div>
    </div>
  );
}
