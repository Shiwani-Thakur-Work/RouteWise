/**
 * PlanningScreen.jsx
 * Animated step-by-step loading state shown while the Worker
 * is processing the route planning request.
 */

export default function PlanningScreen({ steps, activeStep }) {
  return (
    <div className="planning-screen">
      <div className="planning-steps">
        {steps.map((step, i) => {
          const isDone   = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div
              key={step.id}
              className={`planning-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="step-dot" />
              <span>{isDone ? '✓ ' : ''}{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
