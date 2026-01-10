import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing play-by-play log
 * Handles adding plays with deduplication to prevent double entries
 * @param {Array} initialPlays - Initial plays array (optional)
 * @returns {Object} - Play-by-play management functions and state
 */
export function usePlayByPlay(initialPlays = []) {
  const [playByPlay, setPlayByPlay] = useState(initialPlays);
  
  // Ref to prevent duplicate play entries (for React strict mode / double renders)
  const lastPlayIdRef = useRef(null);
  const playCounterRef = useRef(0);
  
  /**
   * Add a play to the log with deduplication
   * @param {number} inning - Current inning number
   * @param {string} inningHalf - 'top' or 'bottom'
   * @param {string} description - Play description
   */
  const addPlay = useCallback((inning, inningHalf, description) => {
    playCounterRef.current += 1;
    const playId = `play_${Date.now()}_${playCounterRef.current}`;
    
    // Prevent duplicate plays (e.g., from React strict mode double renders)
    if (lastPlayIdRef.current === description) {
      return;
    }
    lastPlayIdRef.current = description;
    
    setPlayByPlay(plays => [{
      id: playId,
      inning: `${inning}${inningHalf === 'top' ? '▲' : '▼'}`,
      description,
      timestamp: new Date().toISOString()
    }, ...plays]);
    
    // Reset the duplicate check after a short delay
    setTimeout(() => {
      lastPlayIdRef.current = null;
    }, 100);
  }, []);
  
  /**
   * Remove the most recent play (for undo)
   */
  const removeLastPlay = useCallback(() => {
    setPlayByPlay(plays => plays.slice(1));
  }, []);
  
  /**
   * Clear all plays
   */
  const clearPlays = useCallback(() => {
    setPlayByPlay([]);
    playCounterRef.current = 0;
    lastPlayIdRef.current = null;
  }, []);
  
  /**
   * Set plays directly (for undo restore)
   * @param {Array} plays - Array of play objects
   */
  const setPlays = useCallback((plays) => {
    setPlayByPlay(plays);
  }, []);
  
  return {
    playByPlay,
    addPlay,
    removeLastPlay,
    clearPlays,
    setPlays
  };
}

export default usePlayByPlay;
