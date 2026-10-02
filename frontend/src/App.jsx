/**
 * App.jsx — RouteWise
 * Main application shell. Manages sidebar/map layout and
 * orchestrates state transitions between panels.
 */

import { useState } from 'react';
import MapView from './components/MapView';
import InputPanel from './components/InputPanel';
import PlanningScreen from './components/PlanningScreen';
import ItineraryPanel from './components/ItineraryPanel';
import { useRoutePlanner } from './hooks/useRoutePlanner';

export default function App() {
  const {
    state,
    planData,
    error,
    activeStep,
    planningSteps,
    plan,
    removeStop,
    reset,
    submitFeedback
  } = useRoutePlanner();

  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const handleFeedback = (rating) => {
    if (feedbackGiven) return;
    setFeedbackGiven(rating);
    submitFeedback(rating);
  };

  const handleReset = () => {
    setFeedbackGiven(null);
    reset();
  };

  return (
    <div className="app">
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="sidebar" role="complementary" aria-label="Route planner">

        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon" aria-hidden="true">🗺</div>
            <span className="logo-text">RouteWise</span>
          </div>
          <p className="tagline">Plan the journey, not just the destination.</p>
        </div>

        {/* Input — always shown when idle or error */}
        {(state === 'idle' || state === 'error') && (
          <>
            <InputPanel
              onSubmit={plan}
              loading={state === 'planning'}
            />
            {state === 'error' && error && (
              <div className="message-card error" style={{ margin: '0 28px 20px' }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* Planning animation */}
        {state === 'planning' && (
          <>
            <InputPanel onSubmit={plan} loading={true} />
            <div className="divider" />
            <PlanningScreen steps={planningSteps} activeStep={activeStep} />
          </>
        )}

        {/* Result */}
        {state === 'result' && planData && (
          <>
            {/* Back / new route button */}
            <div style={{ padding: '16px 28px 0' }}>
              <button
                id="new-route-btn"
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}
              >
                ← Plan a new route
              </button>
            </div>
            <div className="divider" />
            <ItineraryPanel
              planData={planData}
              onRemove={removeStop}
              onFeedback={handleFeedback}
              feedbackGiven={feedbackGiven}
            />
          </>
        )}
      </aside>

      {/* ── Map ───────────────────────────────────────────── */}
      <main className="map-container" aria-label="Route map">
        <MapView planData={state === 'result' ? planData : null} />

        {/* Map badge — shown when route is displayed */}
        {state === 'result' && planData && (
          <div className="map-badge" aria-live="polite">
            🛣 {planData.route.stops.length} stop{planData.route.stops.length !== 1 ? 's' : ''}
            &nbsp;·&nbsp; +{planData.route.total_detour_min} min
          </div>
        )}
      </main>
    </div>
  );
}
