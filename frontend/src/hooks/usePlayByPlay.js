import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing play-by-play log
 * Handles adding, editing, and deleting plays with deduplication
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
   * @param {Object} metadata - Optional metadata for stat tracking (runs, hits, errors, etc.)
   */
  const addPlay = useCallback((inning, inningHalf, description, metadata = {}) => {
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
      inningNumber: inning,
      inningHalf,
      description,
      timestamp: new Date().toISOString(),
      ...metadata // Include runs, hits, errors, outs, etc.
    }, ...plays]);
    
    // Reset the duplicate check after a short delay
    setTimeout(() => {
      lastPlayIdRef.current = null;
    }, 100);
  }, []);
  
  /**
   * Update an existing play
   * @param {string} playId - ID of the play to update
   * @param {Object} updates - Fields to update (description, metadata, etc.)
   */
  const updatePlay = useCallback((playId, updates) => {
    setPlayByPlay(plays => plays.map(play => 
      play.id === playId 
        ? { ...play, ...updates, lastEdited: new Date().toISOString() }
        : play
    ));
  }, []);
  
  /**
   * Delete a play by ID
   * @param {string} playId - ID of the play to delete
   */
  const deletePlay = useCallback((playId) => {
    setPlayByPlay(plays => plays.filter(play => play.id !== playId));
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
    updatePlay,
    deletePlay,
    removeLastPlay,
    clearPlays,
    setPlays
  };
}

export default usePlayByPlay;
