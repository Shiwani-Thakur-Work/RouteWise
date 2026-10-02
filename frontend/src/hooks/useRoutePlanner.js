/**
 * useRoutePlanner.js
 * Custom hook managing the full route planning lifecycle:
 * input → planning → result → editing → recalculation.
 */

import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const PLANNING_STEPS = [
  { id: 'understanding', label: 'Understanding your request…' },
  { id: 'locating',     label: 'Locating start and destination…' },
  { id: 'searching',    label: 'Finding candidate places…' },
  { id: 'optimising',   label: 'Optimising route…' },
  { id: 'finalising',   label: 'Finalising itinerary…' }
];

export function useRoutePlanner() {
  const [state, setState] = useState('idle'); // 'idle' | 'planning' | 'result' | 'error'
  const [planData, setPlanData]   = useState(null);
  const [error, setError]         = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [removedStops, setRemovedStops] = useState([]);

  const plan = useCallback(async (input) => {
    setState('planning');
    setError(null);
    setRemovedStops([]);
    setActiveStep(0);

    // Animate through planning steps
    const stepInterval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, PLANNING_STEPS.length - 1));
    }, 900);

    try {
      const res = await fetch(`${API_URL}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });

      clearInterval(stepInterval);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setState('error');
        return;
      }

      setPlanData(data);
      setState('result');
    } catch (err) {
      clearInterval(stepInterval);
      setError('Network error. Please check your connection and try again.');
      setState('error');
    }
  }, []);

  const removeStop = useCallback((stopId) => {
    setPlanData(prev => {
      if (!prev) return prev;
      const removed = prev.route.stops.find(s => s.id === stopId);
      if (removed) setRemovedStops(r => [...r, removed.category]);

      const newStops = prev.route.stops.filter(s => s.id !== stopId);
      const newTotal = newStops.reduce((sum, s) => sum + s.detour_min, 0);

      return {
        ...prev,
        route: {
          ...prev.route,
          stops: newStops,
          total_detour_min: newTotal,
          within_constraint: newTotal <= (prev.requirements.constraints.max_detour_minutes ?? 60)
        }
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setPlanData(null);
    setError(null);
    setRemovedStops([]);
    setActiveStep(0);
  }, []);

  const submitFeedback = useCallback(async (rating) => {
    if (!planData?.planId) return;
    try {
      await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planData.planId, rating })
      });
    } catch { /* silent */ }
  }, [planData]);

  return {
    state,
    planData,
    error,
    activeStep,
    planningSteps: PLANNING_STEPS,
    removedStops,
    plan,
    removeStop,
    reset,
    submitFeedback
  };
}
