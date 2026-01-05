import { useState, useCallback } from 'react';

/**
 * Custom hook for managing drive state (down, distance, possession, etc.)
 * Extracted from FootballLiveGame.jsx to reduce component complexity
 */
export function useDriveState() {
  const [possession, setPossession] = useState('home'); // 'home' or 'away'
  const [ballPosition, setBallPosition] = useState(25); // 0-100 normalized
  const [down, setDown] = useState(1);
  const [distance, setDistance] = useState(10);
  const [quarter, setQuarter] = useState(1);
  const [firstDownMarker, setFirstDownMarker] = useState(35);
  
  const [currentDrive, setCurrentDrive] = useState({
    startPossession: 'home',
    startPosition: 25,
    startQuarter: 1,
    plays: [],
    result: null, // 'touchdown', 'field_goal', 'punt', 'turnover', 'turnover_on_downs', 'safety', 'end_half'
    endPosition: null,
    endQuarter: null,
  });
  
  const [allDrives, setAllDrives] = useState([]);
  
  // Time of possession tracking
  const [homeTimeOfPossession, setHomeTimeOfPossession] = useState(0);
  const [awayTimeOfPossession, setAwayTimeOfPossession] = useState(0);

  // Calculate yard line from normalized position
  const getYardLine = useCallback((normalizedPos, team) => {
    // 0-50: own side, 50-100: opponent side
    if (normalizedPos <= 50) {
      return Math.round(normalizedPos);
    } else {
      return Math.round(100 - normalizedPos);
    }
  }, []);

  // Get display yard line string
  const getYardLineDisplay = useCallback((normalizedPos, team) => {
    const yardLine = getYardLine(normalizedPos, team);
    if (normalizedPos <= 50) {
      return `Own ${yardLine}`;
    } else if (normalizedPos < 100) {
      return `Opp ${yardLine}`;
    } else {
      return 'End Zone';
    }
  }, [getYardLine]);

  // Calculate if first down achieved
  const checkFirstDown = useCallback((newPosition) => {
    return newPosition >= firstDownMarker;
  }, [firstDownMarker]);

  // Reset to new first down
  const resetToFirstDown = useCallback((newPosition) => {
    setDown(1);
    setDistance(10);
    setFirstDownMarker(Math.min(newPosition + 10, 100));
  }, []);

  // Advance down
  const advanceDown = useCallback((yardsGained) => {
    const newPosition = ballPosition + yardsGained;
    setBallPosition(Math.max(0, Math.min(100, newPosition)));
    
    if (checkFirstDown(newPosition)) {
      resetToFirstDown(newPosition);
      return { firstDown: true, newPosition };
    } else {
      setDown((prev) => prev + 1);
      setDistance((prev) => Math.max(0, prev - yardsGained));
      return { firstDown: false, newPosition };
    }
  }, [ballPosition, checkFirstDown, resetToFirstDown]);

  // Change possession
  const changePossession = useCallback((newTeam, newPosition) => {
    // Save current drive
    if (currentDrive.plays.length > 0) {
      setAllDrives((prev) => [...prev, { ...currentDrive, endPosition: ballPosition, endQuarter: quarter }]);
    }
    
    // Start new drive
    setPossession(newTeam);
    setBallPosition(newPosition);
    setDown(1);
    setDistance(10);
    setFirstDownMarker(Math.min(newPosition + 10, 100));
    setCurrentDrive({
      startPossession: newTeam,
      startPosition: newPosition,
      startQuarter: quarter,
      plays: [],
      result: null,
      endPosition: null,
      endQuarter: null,
    });
  }, [ballPosition, currentDrive, quarter]);

  // Flip possession (for turnovers, punts, etc.)
  const flipPossession = useCallback((newPosition) => {
    const newTeam = possession === 'home' ? 'away' : 'home';
    // Convert position for other team (100 - pos)
    const convertedPosition = 100 - newPosition;
    changePossession(newTeam, convertedPosition);
  }, [possession, changePossession]);

  // Spot ball at specific yard line
  const spotBall = useCallback((yardLine, side = 'own') => {
    let normalizedPosition;
    if (side === 'own') {
      normalizedPosition = yardLine;
    } else {
      normalizedPosition = 100 - yardLine;
    }
    setBallPosition(normalizedPosition);
    setFirstDownMarker(Math.min(normalizedPosition + distance, 100));
  }, [distance]);

  // Set down and distance manually
  const setDownAndDistance = useCallback((newDown, newDistance) => {
    setDown(newDown);
    setDistance(newDistance);
    setFirstDownMarker(ballPosition + newDistance);
  }, [ballPosition]);

  // Advance quarter
  const advanceQuarter = useCallback(() => {
    setQuarter((prev) => Math.min(prev + 1, 4)); // Max 4 quarters (OT handled separately)
  }, []);

  // Add play to current drive
  const addPlayToDrive = useCallback((play) => {
    setCurrentDrive((prev) => ({
      ...prev,
      plays: [...prev.plays, play],
    }));
  }, []);

  // End current drive with result
  const endDrive = useCallback((result) => {
    const completedDrive = {
      ...currentDrive,
      result,
      endPosition: ballPosition,
      endQuarter: quarter,
    };
    setAllDrives((prev) => [...prev, completedDrive]);
    setCurrentDrive({
      startPossession: possession,
      startPosition: ballPosition,
      startQuarter: quarter,
      plays: [],
      result: null,
      endPosition: null,
      endQuarter: null,
    });
  }, [currentDrive, ballPosition, quarter, possession]);

  // Initialize from saved state
  const initializeFromState = useCallback((state) => {
    if (state.possession) setPossession(state.possession);
    if (typeof state.ball_position === 'number') setBallPosition(state.ball_position);
    if (typeof state.down === 'number') setDown(state.down);
    if (typeof state.distance === 'number') setDistance(state.distance);
    if (typeof state.quarter === 'number') setQuarter(state.quarter);
    if (typeof state.first_down_marker === 'number') setFirstDownMarker(state.first_down_marker);
    if (state.current_drive) setCurrentDrive(state.current_drive);
    if (state.all_drives) setAllDrives(state.all_drives);
    if (typeof state.home_time_of_possession === 'number') setHomeTimeOfPossession(state.home_time_of_possession);
    if (typeof state.away_time_of_possession === 'number') setAwayTimeOfPossession(state.away_time_of_possession);
  }, []);

  // Get state for saving
  const getStateForSave = useCallback(() => ({
    possession,
    ball_position: ballPosition,
    down,
    distance,
    quarter,
    first_down_marker: firstDownMarker,
    current_drive: currentDrive,
    all_drives: allDrives,
    home_time_of_possession: homeTimeOfPossession,
    away_time_of_possession: awayTimeOfPossession,
  }), [possession, ballPosition, down, distance, quarter, firstDownMarker, currentDrive, allDrives, homeTimeOfPossession, awayTimeOfPossession]);

  return {
    // State
    possession,
    ballPosition,
    down,
    distance,
    quarter,
    firstDownMarker,
    currentDrive,
    allDrives,
    homeTimeOfPossession,
    awayTimeOfPossession,
    
    // Setters
    setPossession,
    setBallPosition,
    setDown,
    setDistance,
    setQuarter,
    setFirstDownMarker,
    setCurrentDrive,
    setAllDrives,
    setHomeTimeOfPossession,
    setAwayTimeOfPossession,
    
    // Utility functions
    getYardLine,
    getYardLineDisplay,
    checkFirstDown,
    resetToFirstDown,
    advanceDown,
    changePossession,
    flipPossession,
    spotBall,
    setDownAndDistance,
    advanceQuarter,
    addPlayToDrive,
    endDrive,
    initializeFromState,
    getStateForSave,
  };
}
