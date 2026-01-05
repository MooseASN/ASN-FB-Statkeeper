import { useState, useCallback } from 'react';

/**
 * Custom hook for managing game timeouts
 * Extracted from FootballLiveGame.jsx to reduce component complexity
 */
export function useTimeouts(initialTimeouts = 3) {
  const [homeTimeouts, setHomeTimeouts] = useState(initialTimeouts);
  const [awayTimeouts, setAwayTimeouts] = useState(initialTimeouts);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);

  // Use a timeout for a team
  const useTimeout = useCallback((team) => {
    if (team === 'home' && homeTimeouts > 0) {
      setHomeTimeouts((prev) => prev - 1);
      return true;
    } else if (team === 'away' && awayTimeouts > 0) {
      setAwayTimeouts((prev) => prev - 1);
      return true;
    }
    return false;
  }, [homeTimeouts, awayTimeouts]);

  // Restore a timeout (for undo)
  const restoreTimeout = useCallback((team) => {
    if (team === 'home') {
      setHomeTimeouts((prev) => Math.min(prev + 1, initialTimeouts));
    } else if (team === 'away') {
      setAwayTimeouts((prev) => Math.min(prev + 1, initialTimeouts));
    }
  }, [initialTimeouts]);

  // Reset timeouts for new half
  const resetTimeoutsForHalf = useCallback(() => {
    setHomeTimeouts(initialTimeouts);
    setAwayTimeouts(initialTimeouts);
  }, [initialTimeouts]);

  // Check if team has timeouts remaining
  const hasTimeouts = useCallback((team) => {
    return team === 'home' ? homeTimeouts > 0 : awayTimeouts > 0;
  }, [homeTimeouts, awayTimeouts]);

  // Get remaining timeouts for a team
  const getTimeoutsRemaining = useCallback((team) => {
    return team === 'home' ? homeTimeouts : awayTimeouts;
  }, [homeTimeouts, awayTimeouts]);

  // Initialize from saved state
  const initializeFromState = useCallback((state) => {
    if (typeof state.home_timeouts === 'number') setHomeTimeouts(state.home_timeouts);
    if (typeof state.away_timeouts === 'number') setAwayTimeouts(state.away_timeouts);
  }, []);

  // Get state for saving
  const getStateForSave = useCallback(() => ({
    home_timeouts: homeTimeouts,
    away_timeouts: awayTimeouts,
  }), [homeTimeouts, awayTimeouts]);

  return {
    // State
    homeTimeouts,
    awayTimeouts,
    showTimeoutDialog,
    
    // Setters
    setHomeTimeouts,
    setAwayTimeouts,
    setShowTimeoutDialog,
    
    // Utility functions
    useTimeout,
    restoreTimeout,
    resetTimeoutsForHalf,
    hasTimeouts,
    getTimeoutsRemaining,
    initializeFromState,
    getStateForSave,
  };
}
