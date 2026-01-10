import { useCallback } from 'react';

/**
 * Custom hook for managing base runner logic
 * Handles automatic base advancement for various hit types and special situations
 * @param {Object} params - Configuration object
 * @param {Function} params.setGame - Game state setter
 * @param {Function} params.setHomeStats - Home team stats setter (for run scoring)
 * @param {Function} params.setAwayStats - Away team stats setter (for run scoring)
 * @returns {Object} - Base runner management functions
 */
export function useBaseRunners({ setGame, setHomeStats, setAwayStats }) {
  
  /**
   * Advance all base runners based on hit type
   * @param {string} hitType - Type of hit ('single', 'double', 'triple', 'home_run', 'walk')
   * @param {string} batterNumber - Batter's player number
   * @param {string} batterName - Batter's name
   */
  const advanceRunners = useCallback((hitType, batterNumber, batterName) => {
    setGame(prev => {
      if (!prev) return prev;
      
      let newBases = { ...prev.bases } || {};
      let runsScored = 0;
      
      // Get batter info for base placement
      const batterInfo = { number: batterNumber, name: batterName };
      
      switch (hitType) {
        case 'single':
          // Runner on 3rd scores
          if (newBases.third) runsScored++;
          // Runner on 2nd goes to 3rd (or scores on single to outfield)
          newBases.third = newBases.second || null;
          // Runner on 1st goes to 2nd
          newBases.second = newBases.first || null;
          // Batter to 1st
          newBases.first = batterInfo;
          break;
          
        case 'double':
          // Runner on 3rd scores
          if (newBases.third) runsScored++;
          // Runner on 2nd scores
          if (newBases.second) runsScored++;
          // Runner on 1st goes to 3rd
          newBases.third = newBases.first || null;
          // Batter to 2nd
          newBases.second = batterInfo;
          newBases.first = null;
          break;
          
        case 'triple':
          // All runners score
          if (newBases.third) runsScored++;
          if (newBases.second) runsScored++;
          if (newBases.first) runsScored++;
          // Batter to 3rd
          newBases.third = batterInfo;
          newBases.second = null;
          newBases.first = null;
          break;
          
        case 'home_run':
          // All runners score plus batter
          if (newBases.third) runsScored++;
          if (newBases.second) runsScored++;
          if (newBases.first) runsScored++;
          runsScored++; // Batter scores
          // Clear all bases
          newBases = { first: null, second: null, third: null };
          break;
          
        case 'walk':
          // Walk only forces runners if bases are occupied behind them
          if (newBases.first) {
            if (newBases.second) {
              if (newBases.third) {
                // Bases loaded - runner on 3rd scores
                runsScored++;
              }
              newBases.third = newBases.second;
            }
            newBases.second = newBases.first;
          }
          newBases.first = batterInfo;
          break;
          
        default:
          break;
      }
      
      // Update score based on inning half
      const isHomeBatting = prev.inning_half === 'bottom';
      
      return {
        ...prev,
        bases: newBases,
        home_score: isHomeBatting ? (prev.home_score || 0) + runsScored : prev.home_score,
        away_score: !isHomeBatting ? (prev.away_score || 0) + runsScored : prev.away_score,
      };
    });
  }, [setGame]);
  
  /**
   * Manually move a runner to a new base
   * @param {string} fromBase - Current base ('first', 'second', 'third')
   * @param {string} toBase - Destination base ('first', 'second', 'third', 'home')
   */
  const moveRunner = useCallback((fromBase, toBase) => {
    setGame(prev => {
      if (!prev || !prev.bases?.[fromBase]) return prev;
      
      const runner = prev.bases[fromBase];
      const newBases = { ...prev.bases };
      
      // Clear old base
      newBases[fromBase] = null;
      
      // If scoring
      if (toBase === 'home') {
        const isHomeBatting = prev.inning_half === 'bottom';
        return {
          ...prev,
          bases: newBases,
          home_score: isHomeBatting ? (prev.home_score || 0) + 1 : prev.home_score,
          away_score: !isHomeBatting ? (prev.away_score || 0) + 1 : prev.away_score,
        };
      }
      
      // Place on new base
      newBases[toBase] = runner;
      
      return {
        ...prev,
        bases: newBases
      };
    });
  }, [setGame]);
  
  /**
   * Handle a stolen base
   * @param {string} fromBase - Base being stolen from
   */
  const handleSteal = useCallback((fromBase) => {
    const nextBase = {
      first: 'second',
      second: 'third',
      third: 'home'
    };
    
    moveRunner(fromBase, nextBase[fromBase]);
  }, [moveRunner]);
  
  /**
   * Remove a runner (caught stealing, picked off)
   * @param {string} base - Base to clear
   */
  const removeRunner = useCallback((base) => {
    setGame(prev => {
      if (!prev) return prev;
      
      const newBases = { ...prev.bases };
      newBases[base] = null;
      
      return {
        ...prev,
        bases: newBases,
        outs: Math.min((prev.outs || 0) + 1, 3)
      };
    });
  }, [setGame]);
  
  /**
   * Clear all bases (for end of inning)
   */
  const clearBases = useCallback(() => {
    setGame(prev => ({
      ...prev,
      bases: { first: null, second: null, third: null }
    }));
  }, [setGame]);
  
  return {
    advanceRunners,
    moveRunner,
    handleSteal,
    removeRunner,
    clearBases
  };
}

export default useBaseRunners;
