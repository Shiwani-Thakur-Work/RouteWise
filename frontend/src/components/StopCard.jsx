/**
 * StopCard.jsx
 * Individual stop in the itinerary — shows icon, name, category, detour.
 * Includes remove button with collapse animation.
 */

import { useState } from 'react';

export default function StopCard({ stop, index, onRemove }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(stop.id), 280);
  };

  return (
    <div
      className={`stop-card ${removing ? 'removing' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      id={`stop-card-${stop.id}`}
    >
      <span className="stop-card-dot">{index + 1}</span>

      <div className="stop-card-top">
        <div className="stop-icon-name">
          <span className="stop-icon">{stop.icon}</span>
          <div>
            <div className="stop-name">{stop.name}</div>
            <div className="stop-category">{stop.category.replace('_', ' ')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="stop-detour">+{stop.detour_min} min</span>
          <button
            className="stop-remove-btn"
            onClick={handleRemove}
            aria-label={`Remove ${stop.name}`}
            title="Remove this stop"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
