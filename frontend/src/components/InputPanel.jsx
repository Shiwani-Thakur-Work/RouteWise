/**
 * InputPanel.jsx
 * Natural language input area with plan button.
 */

import { useState } from 'react';

const EXAMPLE_PROMPTS = [
  "From Saket, Delhi to Cyber Hub, Gurgaon. Need pharmacy, gift under ₹1500, vegetarian dinner. Max 25 min extra.",
  "Connaught Place, Delhi to Noida Sector 18. Grocery, ATM, and coffee. Keep it under 20 minutes.",
  "South Ex, Delhi to IGI Airport, Delhi. Need a pharmacy and a quick dinner. Max 30 min detour."
];

export default function InputPanel({ onSubmit, loading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim().length < 5 || loading) return;
    onSubmit(input.trim());
  };

  const fillExample = () => {
    const random = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setInput(random);
  };

  return (
    <div className="input-panel">
      <form onSubmit={handleSubmit}>
        <label className="input-label" htmlFor="route-input">
          Describe your journey
        </label>
        <textarea
          id="route-input"
          className="nl-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            "I'm going from Saket, Delhi to Cyber Hub, Gurgaon.\nNeed: pharmacy, gift under ₹1500, vegetarian dinner.\nMax 25 min extra travel."
          }
          disabled={loading}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
          }}
        />
        <button
          type="button"
          onClick={fillExample}
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textDecoration: 'underline',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          Try an example
        </button>
        <button
          id="plan-route-btn"
          type="submit"
          className="plan-btn"
          disabled={loading || input.trim().length < 5}
        >
          {loading ? (
            <>
              <span className="step-dot" style={{ background: '#fff', animation: 'pulse 1s infinite' }} />
              Planning…
            </>
          ) : (
            <>🗺️ Plan my route</>
          )}
        </button>
      </form>
    </div>
  );
}
