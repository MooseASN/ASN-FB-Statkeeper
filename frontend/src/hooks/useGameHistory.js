import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook for managing game state history and undo functionality
 * Stores snapshots of game state that can be restored
 * @param {number} maxHistory - Maximum number of states to keep (default: 20)
 * @returns {Object} - History management functions and state
 */
export function useGameHistory(maxHistory = 20) {
  const [undoHistory, setUndoHistory] = useState([]);
  
  /**
   * Save a snapshot of the current game state for undo
   * @param {Object} stateSnapshot - Object containing all state values to save
   */
  const saveStateForUndo = useCallback((stateSnapshot) => {
    // Deep clone the state to prevent reference issues
    const clonedSnapshot = JSON.parse(JSON.stringify(stateSnapshot));
    setUndoHistory(prev => [...prev.slice(-(maxHistory - 1)), clonedSnapshot]);
  }, [maxHistory]);
  
  /**
   * Pop and return the last saved state
   * @returns {Object|null} - The last saved state or null if none exists
   */
  const popLastState = useCallback(() => {
    if (undoHistory.length === 0) {
      toast.error("Nothing to undo");
      return null;
    }
    
    const lastState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    return lastState;
  }, [undoHistory]);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoHistory([]);
  }, []);
  
  /**
   * Check if undo is available
   */
  const canUndo = undoHistory.length > 0;
  
  /**
   * Get the number of states saved
   */
  const historyLength = undoHistory.length;
  
  return {
    saveStateForUndo,
    popLastState,
    clearHistory,
    canUndo,
    historyLength
  };
}

export default useGameHistory;
