import { useCallback } from 'react';

/**
 * Custom hook for managing player statistics updates
 * Provides helper functions to update batter and pitcher stats
 * @param {Object} params - Configuration object
 * @param {boolean} params.battingTeamIsHome - Whether the batting team is home
 * @param {Function} params.setHomeStats - State setter for home team stats
 * @param {Function} params.setAwayStats - State setter for away team stats
 * @returns {Object} - Stat update functions
 */
export function usePlayerStats({ battingTeamIsHome, setHomeStats, setAwayStats }) {
  
  /**
   * Update stats for a batter
   * @param {string} playerNumber - Player number to update
   * @param {Object} updates - Object with stat increments (e.g., { hits: 1, at_bats: 1 })
   */
  const updateBatterStats = useCallback((playerNumber, updates) => {
    const setStats = battingTeamIsHome ? setHomeStats : setAwayStats;
    
    setStats(prev => {
      const existing = prev.find(s => s.player_number === playerNumber);
      if (existing) {
        return prev.map(s => 
          s.player_number === playerNumber 
            ? { 
                ...s, 
                ...Object.fromEntries(
                  Object.entries(updates).map(([k, v]) => [k, (s[k] || 0) + v])
                ) 
              }
            : s
        );
      } else {
        return [...prev, { player_number: playerNumber, ...updates }];
      }
    });
  }, [battingTeamIsHome, setHomeStats, setAwayStats]);
  
  /**
   * Update stats for a pitcher
   * @param {string} playerNumber - Player number to update
   * @param {Object} updates - Object with stat increments (e.g., { pitches_thrown: 1 })
   */
  const updatePitcherStats = useCallback((playerNumber, updates) => {
    // Pitcher is on the team that's NOT batting
    const setStats = battingTeamIsHome ? setAwayStats : setHomeStats;
    
    setStats(prev => {
      const existing = prev.find(s => s.player_number === playerNumber);
      if (existing) {
        return prev.map(s => 
          s.player_number === playerNumber 
            ? { 
                ...s, 
                ...Object.fromEntries(
                  Object.entries(updates).map(([k, v]) => [k, (s[k] || 0) + v])
                ) 
              }
            : s
        );
      } else {
        return [...prev, { player_number: playerNumber, ...updates }];
      }
    });
  }, [battingTeamIsHome, setHomeStats, setAwayStats]);
  
  /**
   * Calculate team totals from player stats array
   * @param {Array} stats - Array of player stat objects
   * @returns {Object} - Aggregated team totals
   */
  const calcTeamTotals = useCallback((stats) => {
    if (!stats || stats.length === 0) {
      return { 
        runs: 0, 
        hits: 0, 
        strikeouts: 0, 
        walks: 0, 
        pitches: 0,
        at_bats: 0,
        home_runs: 0,
        rbis: 0
      };
    }
    
    return stats.reduce((acc, player) => ({
      runs: acc.runs + (player.runs || 0),
      hits: acc.hits + (player.hits || 0),
      strikeouts: acc.strikeouts + (player.strikeouts_batting || 0),
      walks: acc.walks + (player.walks || 0),
      pitches: acc.pitches + (player.pitches_thrown || 0),
      at_bats: acc.at_bats + (player.at_bats || 0),
      home_runs: acc.home_runs + (player.home_runs || 0),
      rbis: acc.rbis + (player.rbis || 0),
    }), { 
      runs: 0, 
      hits: 0, 
      strikeouts: 0, 
      walks: 0, 
      pitches: 0,
      at_bats: 0,
      home_runs: 0,
      rbis: 0
    });
  }, []);
  
  return {
    updateBatterStats,
    updatePitcherStats,
    calcTeamTotals
  };
}

export default usePlayerStats;
