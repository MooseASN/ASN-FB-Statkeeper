import { useState, useCallback } from 'react';

/**
 * Custom hook for managing the current play workflow in football
 * Handles play type selection, player selection, yards, and result tracking
 */
export function useFootballPlayWorkflow() {
  // Play workflow step
  const [playStep, setPlayStep] = useState(0); // 0=select type, 1=select player, 2=result, 3=yards, 4=tackler
  
  // Current play type and result
  const [selectedPlayType, setSelectedPlayType] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [yards, setYards] = useState(0);
  
  // Run play state
  const [runCarrierNumber, setRunCarrierNumber] = useState(null);
  const [runTacklerNumber, setRunTacklerNumber] = useState(null);
  
  // Pass play state
  const [passQBNumber, setPassQBNumber] = useState(null);
  const [passReceiverNumber, setPassReceiverNumber] = useState(null);
  const [passDefenderNumber, setPassDefenderNumber] = useState(null);
  const [interceptionReturnYards, setInterceptionReturnYards] = useState(0);
  
  // Punt play state
  const [puntPunterNumber, setPuntPunterNumber] = useState(null);
  const [puntReturnerNumber, setPuntReturnerNumber] = useState(null);
  const [puntDistance, setPuntDistance] = useState(40);
  const [puntReturnYards, setPuntReturnYards] = useState(0);
  const [puntReturnStartYardLine, setPuntReturnStartYardLine] = useState(20);
  const [puntTacklerNumber, setPuntTacklerNumber] = useState(null);
  
  // Field goal state
  const [kickerNumber, setKickerNumber] = useState(null);
  const [fgDistance, setFgDistance] = useState(30);
  const [fgBlockerNumber, setFgBlockerNumber] = useState(null);
  const [fgReturnYards, setFgReturnYards] = useState(0);
  const [fgNoReturn, setFgNoReturn] = useState(false);
  
  // Penalty state
  const [penaltyTeam, setPenaltyTeam] = useState(null);
  const [penaltyYards, setPenaltyYards] = useState(5);
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [penaltyPlayerNumber, setPenaltyPlayerNumber] = useState(null);
  
  // Reset all play state
  const resetPlayState = useCallback(() => {
    setPlayStep(0);
    setSelectedPlayType(null);
    setSelectedResult(null);
    setYards(0);
    
    // Run
    setRunCarrierNumber(null);
    setRunTacklerNumber(null);
    
    // Pass
    setPassQBNumber(null);
    setPassReceiverNumber(null);
    setPassDefenderNumber(null);
    setInterceptionReturnYards(0);
    
    // Punt
    setPuntPunterNumber(null);
    setPuntReturnerNumber(null);
    setPuntDistance(40);
    setPuntReturnYards(0);
    setPuntReturnStartYardLine(20);
    setPuntTacklerNumber(null);
    
    // Field goal
    setKickerNumber(null);
    setFgDistance(30);
    setFgBlockerNumber(null);
    setFgReturnYards(0);
    setFgNoReturn(false);
    
    // Penalty
    setPenaltyTeam(null);
    setPenaltyYards(5);
    setPenaltyDescription('');
    setPenaltyPlayerNumber(null);
  }, []);
  
  // Start a new play of specific type
  const startPlay = useCallback((playType) => {
    resetPlayState();
    setSelectedPlayType(playType);
    setPlayStep(1);
  }, [resetPlayState]);
  
  // Get current play data for logging
  const getPlayData = useCallback(() => {
    const base = {
      type: selectedPlayType,
      result: selectedResult,
      yards
    };
    
    switch (selectedPlayType) {
      case 'run':
        return {
          ...base,
          carrier: runCarrierNumber,
          tackler: runTacklerNumber
        };
      case 'pass':
        return {
          ...base,
          quarterback: passQBNumber,
          receiver: passReceiverNumber,
          defender: passDefenderNumber,
          interceptionReturnYards
        };
      case 'punt':
        return {
          ...base,
          punter: puntPunterNumber,
          returner: puntReturnerNumber,
          puntDistance,
          returnYards: puntReturnYards,
          returnStartYardLine: puntReturnStartYardLine,
          tackler: puntTacklerNumber
        };
      case 'field_goal':
        return {
          ...base,
          kicker: kickerNumber,
          distance: fgDistance,
          blocker: fgBlockerNumber,
          returnYards: fgReturnYards,
          noReturn: fgNoReturn
        };
      case 'penalty':
        return {
          ...base,
          team: penaltyTeam,
          penaltyYards,
          description: penaltyDescription,
          player: penaltyPlayerNumber
        };
      default:
        return base;
    }
  }, [selectedPlayType, selectedResult, yards, runCarrierNumber, runTacklerNumber,
      passQBNumber, passReceiverNumber, passDefenderNumber, interceptionReturnYards,
      puntPunterNumber, puntReturnerNumber, puntDistance, puntReturnYards, puntReturnStartYardLine, puntTacklerNumber,
      kickerNumber, fgDistance, fgBlockerNumber, fgReturnYards, fgNoReturn,
      penaltyTeam, penaltyYards, penaltyDescription, penaltyPlayerNumber]);
  
  return {
    // Workflow
    playStep,
    setPlayStep,
    selectedPlayType,
    setSelectedPlayType,
    selectedResult,
    setSelectedResult,
    yards,
    setYards,
    
    // Run
    runCarrierNumber,
    setRunCarrierNumber,
    runTacklerNumber,
    setRunTacklerNumber,
    
    // Pass
    passQBNumber,
    setPassQBNumber,
    passReceiverNumber,
    setPassReceiverNumber,
    passDefenderNumber,
    setPassDefenderNumber,
    interceptionReturnYards,
    setInterceptionReturnYards,
    
    // Punt
    puntPunterNumber,
    setPuntPunterNumber,
    puntReturnerNumber,
    setPuntReturnerNumber,
    puntDistance,
    setPuntDistance,
    puntReturnYards,
    setPuntReturnYards,
    puntReturnStartYardLine,
    setPuntReturnStartYardLine,
    puntTacklerNumber,
    setPuntTacklerNumber,
    
    // Field goal
    kickerNumber,
    setKickerNumber,
    fgDistance,
    setFgDistance,
    fgBlockerNumber,
    setFgBlockerNumber,
    fgReturnYards,
    setFgReturnYards,
    fgNoReturn,
    setFgNoReturn,
    
    // Penalty
    penaltyTeam,
    setPenaltyTeam,
    penaltyYards,
    setPenaltyYards,
    penaltyDescription,
    setPenaltyDescription,
    penaltyPlayerNumber,
    setPenaltyPlayerNumber,
    
    // Actions
    resetPlayState,
    startPlay,
    getPlayData
  };
}

export default useFootballPlayWorkflow;
