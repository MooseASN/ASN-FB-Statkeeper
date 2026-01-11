import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook for managing game state history with undo/redo functionality
 * Stores snapshots of game state that can be restored
 * @param {number} maxHistory - Maximum number of states to keep (default: 20)
 * @returns {Object} - History management functions and state
 */
export function useGameHistory(maxHistory = 20) {
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  
  /**
   * Save a snapshot of the current game state for undo
   * @param {Object} stateSnapshot - Object containing all state values to save
   */
  const saveStateForUndo = useCallback((stateSnapshot) => {
    // Deep clone the state to prevent reference issues
    const clonedSnapshot = JSON.parse(JSON.stringify(stateSnapshot));
    setUndoHistory(prev => [...prev.slice(-(maxHistory - 1)), clonedSnapshot]);
    // Clear redo history when new action is taken
    setRedoHistory([]);
  }, [maxHistory]);
  
  /**
   * Pop and return the last saved state (undo)
   * @param {Object} currentState - Current state to save for redo
   * @returns {Object|null} - The last saved state or null if none exists
   */
  const popLastState = useCallback((currentState = null) => {
    if (undoHistory.length === 0) {
      toast.error("Nothing to undo");
      return null;
    }
    
    const lastState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    
    // Save current state for redo if provided
    if (currentState) {
      const clonedCurrent = JSON.parse(JSON.stringify(currentState));
      setRedoHistory(prev => [...prev.slice(-(maxHistory - 1)), clonedCurrent]);
    }
    
    return lastState;
  }, [undoHistory, maxHistory]);
  
  /**
   * Redo the last undone action
   * @param {Object} currentState - Current state to save for undo
   * @returns {Object|null} - The state to restore or null if none exists
   */
  const redoLastState = useCallback((currentState = null) => {
    if (redoHistory.length === 0) {
      toast.error("Nothing to redo");
      return null;
    }
    
    const stateToRestore = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    
    // Save current state for undo if provided
    if (currentState) {
      const clonedCurrent = JSON.parse(JSON.stringify(currentState));
      setUndoHistory(prev => [...prev.slice(-(maxHistory - 1)), clonedCurrent]);
    }
    
    return stateToRestore;
  }, [redoHistory, maxHistory]);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoHistory([]);
    setRedoHistory([]);
  }, []);
  
  /**
   * Check if undo is available
   */
  const canUndo = undoHistory.length > 0;
  
  /**
   * Check if redo is available
   */
  const canRedo = redoHistory.length > 0;
  
  /**
   * Get the number of undo states saved
   */
  const historyLength = undoHistory.length;
  
  /**
   * Get the number of redo states saved
   */
  const redoLength = redoHistory.length;
  
  return {
    saveStateForUndo,
    popLastState,
    redoLastState,
    clearHistory,
    canUndo,
    canRedo,
    historyLength,
    redoLength
  };
}

export default useGameHistory;
