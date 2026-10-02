/**
 * ExplanationBanner.jsx
 * "Why this route?" — the explanation layer that differentiates
 * RouteWise from a black-box AI recommendation.
 */

export default function ExplanationBanner({ explanation }) {
  if (!explanation) return null;

  return (
    <div className="explanation-banner" id="explanation-banner">
      <div className="explanation-banner-title">💡 Why this route?</div>
      <p className="explanation-text">{explanation}</p>
    </div>
  );
}
