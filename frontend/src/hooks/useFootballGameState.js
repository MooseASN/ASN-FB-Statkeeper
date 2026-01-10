import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Custom hook for managing core football game state
 * Consolidates game data, scores, rosters, and stats
 */
export function useFootballGameState({ gameId, demoMode = false, initialDemoData = null }) {
  // Core game state
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  
  // Team rosters and stats
  const [homeRoster, setHomeRoster] = useState(initialDemoData?.home_roster || []);
  const [awayRoster, setAwayRoster] = useState(initialDemoData?.away_roster || []);
  const [homeStats, setHomeStats] = useState(initialDemoData?.home_player_stats || []);
  const [awayStats, setAwayStats] = useState(initialDemoData?.away_player_stats || []);
  
  // Scores
  const [homeScore, setHomeScore] = useState(initialDemoData?.home_score || 0);
  const [awayScore, setAwayScore] = useState(initialDemoData?.away_score || 0);
  
  // Timeouts
  const [homeTimeoutsUsed, setHomeTimeoutsUsed] = useState(0);
  const [awayTimeoutsUsed, setAwayTimeoutsUsed] = useState(0);
  
  // Play log
  const [playLog, setPlayLog] = useState([]);
  
  // Game finalization
  const [gameFinalized, setGameFinalized] = useState(false);
  
  // Undo history
  const [undoHistory, setUndoHistory] = useState([]);
  
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
      setHomeScore(gameData.home_score || 0);
      setAwayScore(gameData.away_score || 0);
      setHomeTimeoutsUsed(gameData.home_timeouts_used || 0);
      setAwayTimeoutsUsed(gameData.away_timeouts_used || 0);
      setPlayLog(gameData.play_log || []);
      
      if (gameData.status === 'final') {
        setGameFinalized(true);
      }
      
      return gameData;
    } catch (error) {
      toast.error("Failed to load game");
      return null;
    } finally {
      setLoading(false);
    }
  }, [gameId, demoMode]);
  
  // Save game to API
  const saveGame = useCallback(async (additionalData = {}) => {
    if (demoMode) return;
    
    try {
      const saveData = {
        home_score: homeScore,
        away_score: awayScore,
        home_player_stats: homeStats,
        away_player_stats: awayStats,
        home_timeouts_used: homeTimeoutsUsed,
        away_timeouts_used: awayTimeoutsUsed,
        play_log: playLog,
        ...additionalData
      };
      
      await axios.put(`${API}/games/${gameId}`, saveData);
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  }, [gameId, demoMode, homeScore, awayScore, homeStats, awayStats, 
      homeTimeoutsUsed, awayTimeoutsUsed, playLog]);
  
  // Update player stats
  const updatePlayerStats = useCallback((playerNumber, team, updates) => {
    const setStats = team === 'home' ? setHomeStats : setAwayStats;
    
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
  }, []);
  
  // Add score
  const addScore = useCallback((team, points) => {
    if (team === 'home') {
      setHomeScore(prev => prev + points);
    } else {
      setAwayScore(prev => prev + points);
    }
  }, []);
  
  // Use timeout
  const useTimeout = useCallback((team) => {
    if (team === 'home') {
      setHomeTimeoutsUsed(prev => prev + 1);
    } else {
      setAwayTimeoutsUsed(prev => prev + 1);
    }
  }, []);
  
  // Reset timeouts (for halftime)
  const resetTimeouts = useCallback(() => {
    setHomeTimeoutsUsed(0);
    setAwayTimeoutsUsed(0);
  }, []);
  
  // Add play to log
  const addPlayToLog = useCallback((play) => {
    const playWithId = {
      id: `play_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...play
    };
    setPlayLog(prev => [playWithId, ...prev]);
    return playWithId;
  }, []);
  
  // Remove last play (for undo)
  const removeLastPlay = useCallback(() => {
    setPlayLog(prev => prev.slice(1));
  }, []);
  
  // Update play in log
  const updatePlayInLog = useCallback((playId, updates) => {
    setPlayLog(prev => prev.map(p => 
      p.id === playId ? { ...p, ...updates } : p
    ));
  }, []);
  
  // Save state for undo
  const saveStateForUndo = useCallback((additionalState = {}) => {
    const snapshot = {
      homeScore,
      awayScore,
      homeStats: JSON.parse(JSON.stringify(homeStats)),
      awayStats: JSON.parse(JSON.stringify(awayStats)),
      homeTimeoutsUsed,
      awayTimeoutsUsed,
      playLog: JSON.parse(JSON.stringify(playLog)),
      ...additionalState
    };
    setUndoHistory(prev => [...prev.slice(-19), snapshot]);
  }, [homeScore, awayScore, homeStats, awayStats, homeTimeoutsUsed, awayTimeoutsUsed, playLog]);
  
  // Restore from undo
  const restoreFromUndo = useCallback(() => {
    if (undoHistory.length === 0) {
      toast.error("Nothing to undo");
      return null;
    }
    
    const lastState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    
    setHomeScore(lastState.homeScore);
    setAwayScore(lastState.awayScore);
    setHomeStats(lastState.homeStats);
    setAwayStats(lastState.awayStats);
    setHomeTimeoutsUsed(lastState.homeTimeoutsUsed);
    setAwayTimeoutsUsed(lastState.awayTimeoutsUsed);
    setPlayLog(lastState.playLog);
    
    return lastState;
  }, [undoHistory]);
  
  // Finalize game
  const finalizeGame = useCallback(async () => {
    const finalData = { status: 'final' };
    await saveGame(finalData);
    setGameFinalized(true);
    toast.success("Game finalized!");
  }, [saveGame]);
  
  // Get player by number
  const getPlayer = useCallback((playerNumber, team) => {
    const roster = team === 'home' ? homeRoster : awayRoster;
    return roster.find(p => p.player_number === playerNumber);
  }, [homeRoster, awayRoster]);
  
  // Get player stats
  const getPlayerStats = useCallback((playerNumber, team) => {
    const stats = team === 'home' ? homeStats : awayStats;
    return stats.find(s => s.player_number === playerNumber) || {};
  }, [homeStats, awayStats]);
  
  // Initial fetch
  useEffect(() => {
    fetchGame();
  }, [fetchGame]);
  
  return {
    // Core state
    game,
    setGame,
    loading,
    
    // Rosters
    homeRoster,
    awayRoster,
    setHomeRoster,
    setAwayRoster,
    getPlayer,
    
    // Stats
    homeStats,
    awayStats,
    setHomeStats,
    setAwayStats,
    updatePlayerStats,
    getPlayerStats,
    
    // Scores
    homeScore,
    awayScore,
    setHomeScore,
    setAwayScore,
    addScore,
    
    // Timeouts
    homeTimeoutsUsed,
    awayTimeoutsUsed,
    useTimeout,
    resetTimeouts,
    
    // Play log
    playLog,
    setPlayLog,
    addPlayToLog,
    removeLastPlay,
    updatePlayInLog,
    
    // Undo
    undoHistory,
    saveStateForUndo,
    restoreFromUndo,
    canUndo: undoHistory.length > 0,
    
    // Game control
    saveGame,
    fetchGame,
    gameFinalized,
    finalizeGame
  };
}

export default useFootballGameState;
