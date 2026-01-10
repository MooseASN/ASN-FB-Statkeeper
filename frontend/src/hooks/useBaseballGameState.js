import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Custom hook for managing all baseball game state
 * Consolidates game data, stats, batting order, and lineup management
 */
export function useBaseballGameState({ gameId, demoMode = false, initialDemoData = null }) {
  // Core game state
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  
  // Team rosters and stats
  const [homeRoster, setHomeRoster] = useState(initialDemoData?.home_roster || []);
  const [awayRoster, setAwayRoster] = useState(initialDemoData?.away_roster || []);
  const [homeStats, setHomeStats] = useState(initialDemoData?.home_player_stats || []);
  const [awayStats, setAwayStats] = useState(initialDemoData?.away_player_stats || []);
  
  // Batting order and defense configuration
  const [homeBattingOrder, setHomeBattingOrder] = useState([]);
  const [awayBattingOrder, setAwayBattingOrder] = useState([]);
  const [homeDefense, setHomeDefense] = useState({});
  const [awayDefense, setAwayDefense] = useState({});
  const [startersConfigured, setStartersConfigured] = useState(demoMode);
  
  // Batter tracking (separate indices for each team)
  const [homeBatterIndex, setHomeBatterIndex] = useState(0);
  const [awayBatterIndex, setAwayBatterIndex] = useState(0);
  
  // Error tracking
  const [homeErrors, setHomeErrors] = useState(0);
  const [awayErrors, setAwayErrors] = useState(0);
  
  // Game finalization
  const [gameFinalized, setGameFinalized] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  
  // Derived state
  const currentGame = game || {};
  const battingTeamIsHome = currentGame.inning_half === 'bottom';
  const battingRoster = battingTeamIsHome ? homeRoster : awayRoster;
  const fieldingRoster = battingTeamIsHome ? awayRoster : homeRoster;
  const battingOrder = battingTeamIsHome ? homeBattingOrder : awayBattingOrder;
  const activeBatterIndex = battingTeamIsHome ? homeBatterIndex : awayBatterIndex;
  
  // Get current batter
  const getCurrentBatter = useCallback(() => {
    if (!battingOrder || battingOrder.length === 0) return null;
    const batterNumber = battingOrder[activeBatterIndex % battingOrder.length];
    return battingRoster.find(p => p.player_number === batterNumber);
  }, [battingOrder, activeBatterIndex, battingRoster]);
  
  // Get current pitcher
  const getCurrentPitcher = useCallback(() => {
    const defense = battingTeamIsHome ? awayDefense : homeDefense;
    const pitcherNumber = defense?.pitcher;
    return fieldingRoster.find(p => p.player_number === pitcherNumber);
  }, [battingTeamIsHome, awayDefense, homeDefense, fieldingRoster]);
  
  // Fetch game from API
  const fetchGame = useCallback(async () => {
    if (demoMode || !gameId) return;
    
    try {
      const res = await axios.get(`${API}/games/${gameId}`);
      const gameData = res.data;
      setGame(gameData);
      setHomeRoster(gameData.home_roster || []);
      setAwayRoster(gameData.away_roster || []);
      setHomeStats(gameData.home_player_stats || []);
      setAwayStats(gameData.away_player_stats || []);
      
      // Restore saved lineup if exists
      if (gameData.home_batting_order?.length > 0) {
        setHomeBattingOrder(gameData.home_batting_order);
        setStartersConfigured(true);
      }
      if (gameData.away_batting_order?.length > 0) {
        setAwayBattingOrder(gameData.away_batting_order);
      }
      if (gameData.home_defense) setHomeDefense(gameData.home_defense);
      if (gameData.away_defense) setAwayDefense(gameData.away_defense);
      if (gameData.home_batter_index != null) setHomeBatterIndex(gameData.home_batter_index);
      if (gameData.away_batter_index != null) setAwayBatterIndex(gameData.away_batter_index);
      if (gameData.home_errors != null) setHomeErrors(gameData.home_errors);
      if (gameData.away_errors != null) setAwayErrors(gameData.away_errors);
      if (gameData.status === 'final') {
        setGameFinalized(true);
        setGameResult(gameData.game_result);
      }
    } catch (error) {
      toast.error("Failed to load game");
    } finally {
      setLoading(false);
    }
  }, [gameId, demoMode]);
  
  // Save game to API
  const saveGame = useCallback(async (updatedGame, additionalData = {}) => {
    if (demoMode) {
      setGame(prev => ({ ...prev, ...updatedGame }));
      return;
    }
    
    try {
      const saveData = {
        ...updatedGame,
        home_batting_order: homeBattingOrder,
        away_batting_order: awayBattingOrder,
        home_defense: homeDefense,
        away_defense: awayDefense,
        home_batter_index: homeBatterIndex,
        away_batter_index: awayBatterIndex,
        home_player_stats: homeStats,
        away_player_stats: awayStats,
        home_errors: homeErrors,
        away_errors: awayErrors,
        ...additionalData
      };
      
      await axios.put(`${API}/games/${gameId}`, saveData);
      setGame(prev => ({ ...prev, ...updatedGame }));
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  }, [gameId, demoMode, homeBattingOrder, awayBattingOrder, homeDefense, awayDefense, 
      homeBatterIndex, awayBatterIndex, homeStats, awayStats, homeErrors, awayErrors]);
  
  // Update batter stats
  const updateBatterStats = useCallback((playerNumber, updates) => {
    const setStats = battingTeamIsHome ? setHomeStats : setAwayStats;
    
    setStats(prev => {
      const existing = prev.find(s => s.player_number === playerNumber);
      if (existing) {
        return prev.map(s => 
          s.player_number === playerNumber 
            ? { ...s, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, (s[k] || 0) + v])) }
            : s
        );
      } else {
        return [...prev, { player_number: playerNumber, ...updates }];
      }
    });
  }, [battingTeamIsHome]);
  
  // Update pitcher stats
  const updatePitcherStats = useCallback((playerNumber, updates) => {
    const setStats = battingTeamIsHome ? setAwayStats : setHomeStats;
    
    setStats(prev => {
      const existing = prev.find(s => s.player_number === playerNumber);
      if (existing) {
        return prev.map(s => 
          s.player_number === playerNumber 
            ? { ...s, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, (s[k] || 0) + v])) }
            : s
        );
      } else {
        return [...prev, { player_number: playerNumber, ...updates }];
      }
    });
  }, [battingTeamIsHome]);
  
  // Advance batter index
  const advanceBatterIndex = useCallback(() => {
    if (battingTeamIsHome) {
      setHomeBatterIndex(i => (i + 1) % (homeBattingOrder.length || 9));
    } else {
      setAwayBatterIndex(i => (i + 1) % (awayBattingOrder.length || 9));
    }
  }, [battingTeamIsHome, homeBattingOrder.length, awayBattingOrder.length]);
  
  // Handle inning change
  const handleInningChange = useCallback(() => {
    const newInningHalf = currentGame.inning_half === 'top' ? 'bottom' : 'top';
    const newInning = newInningHalf === 'top' ? (currentGame.current_inning || 1) + 1 : currentGame.current_inning;
    
    setGame(prev => ({
      ...prev,
      current_inning: newInning,
      inning_half: newInningHalf,
      outs: 0,
      bases: { first: null, second: null, third: null }
    }));
    
    return { newInning, newInningHalf };
  }, [currentGame.inning_half, currentGame.current_inning]);
  
  // Add an error
  const addError = useCallback((isHomeTeam) => {
    if (isHomeTeam) {
      setHomeErrors(e => e + 1);
    } else {
      setAwayErrors(e => e + 1);
    }
  }, []);
  
  // Finalize game
  const finalizeGame = useCallback(async (result) => {
    const finalData = {
      status: 'final',
      game_result: result,
      winning_pitcher: result.winningPitcher,
      losing_pitcher: result.losingPitcher,
      saving_pitcher: result.savingPitcher
    };
    
    await saveGame(finalData);
    setGameFinalized(true);
    setGameResult(result);
    toast.success("Game finalized!");
  }, [saveGame]);
  
  // Get state snapshot for undo
  const getStateSnapshot = useCallback(() => ({
    game: JSON.parse(JSON.stringify(game)),
    homeStats: JSON.parse(JSON.stringify(homeStats)),
    awayStats: JSON.parse(JSON.stringify(awayStats)),
    homeBatterIndex,
    awayBatterIndex,
    homeErrors,
    awayErrors
  }), [game, homeStats, awayStats, homeBatterIndex, awayBatterIndex, homeErrors, awayErrors]);
  
  // Restore state from snapshot
  const restoreStateSnapshot = useCallback((snapshot) => {
    setGame(snapshot.game);
    setHomeStats(snapshot.homeStats);
    setAwayStats(snapshot.awayStats);
    setHomeBatterIndex(snapshot.homeBatterIndex);
    setAwayBatterIndex(snapshot.awayBatterIndex);
    setHomeErrors(snapshot.homeErrors);
    setAwayErrors(snapshot.awayErrors);
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchGame();
  }, [fetchGame]);
  
  return {
    // Core state
    game,
    setGame,
    loading,
    currentGame,
    
    // Rosters
    homeRoster,
    awayRoster,
    setHomeRoster,
    setAwayRoster,
    
    // Stats
    homeStats,
    awayStats,
    setHomeStats,
    setAwayStats,
    updateBatterStats,
    updatePitcherStats,
    
    // Batting order
    homeBattingOrder,
    awayBattingOrder,
    setHomeBattingOrder,
    setAwayBattingOrder,
    battingOrder,
    
    // Defense
    homeDefense,
    awayDefense,
    setHomeDefense,
    setAwayDefense,
    
    // Starters
    startersConfigured,
    setStartersConfigured,
    
    // Batter tracking
    homeBatterIndex,
    awayBatterIndex,
    setHomeBatterIndex,
    setAwayBatterIndex,
    activeBatterIndex,
    advanceBatterIndex,
    
    // Derived values
    battingTeamIsHome,
    battingRoster,
    fieldingRoster,
    getCurrentBatter,
    getCurrentPitcher,
    
    // Errors
    homeErrors,
    awayErrors,
    setHomeErrors,
    setAwayErrors,
    addError,
    
    // Game control
    handleInningChange,
    saveGame,
    fetchGame,
    
    // Finalization
    gameFinalized,
    setGameFinalized,
    gameResult,
    finalizeGame,
    
    // Undo support
    getStateSnapshot,
    restoreStateSnapshot
  };
}

export default useBaseballGameState;
