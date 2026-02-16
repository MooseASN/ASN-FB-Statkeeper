import { useState } from 'react';

/**
 * Custom hook for managing play input state
 * Handles run, pass, punt, field goal, and penalty play data
 */
export function usePlayState() {
  // Play selection
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
  const [penaltyType, setPenaltyType] = useState(null);
  const [penaltyDeclined, setPenaltyDeclined] = useState(false);
  const [penaltyOffset, setPenaltyOffset] = useState(false);

  // Fumble state
  const [fumbleRecoveryTeam, setFumbleRecoveryTeam] = useState(null);
  const [fumbleRecoveryYards, setFumbleRecoveryYards] = useState(0);

  // Safety state
  const [safetyTeam, setSafetyTeam] = useState(null);

  const resetPlayState = () => {
    setSelectedPlayType(null);
    setSelectedResult(null);
    setYards(0);
    setRunCarrierNumber(null);
    setRunTacklerNumber(null);
    setPassQBNumber(null);
    setPassReceiverNumber(null);
    setPassDefenderNumber(null);
    setInterceptionReturnYards(0);
    setPuntPunterNumber(null);
    setPuntReturnerNumber(null);
    setPuntDistance(40);
    setPuntReturnYards(0);
    setPuntReturnStartYardLine(20);
    setPuntTacklerNumber(null);
    setKickerNumber(null);
    setFgDistance(30);
    setFgBlockerNumber(null);
    setFgReturnYards(0);
    setFgNoReturn(false);
    setPenaltyTeam(null);
    setPenaltyYards(5);
    setPenaltyType(null);
    setPenaltyDeclined(false);
    setPenaltyOffset(false);
    setFumbleRecoveryTeam(null);
    setFumbleRecoveryYards(0);
    setSafetyTeam(null);
  };

  return {
    // Play selection
    selectedPlayType,
    setSelectedPlayType,
    selectedResult,
    setSelectedResult,
    yards,
    setYards,
    // Run play
    runCarrierNumber,
    setRunCarrierNumber,
    runTacklerNumber,
    setRunTacklerNumber,
    // Pass play
    passQBNumber,
    setPassQBNumber,
    passReceiverNumber,
    setPassReceiverNumber,
    passDefenderNumber,
    setPassDefenderNumber,
    interceptionReturnYards,
    setInterceptionReturnYards,
    // Punt play
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
    penaltyType,
    setPenaltyType,
    penaltyDeclined,
    setPenaltyDeclined,
    penaltyOffset,
    setPenaltyOffset,
    // Fumble
    fumbleRecoveryTeam,
    setFumbleRecoveryTeam,
    fumbleRecoveryYards,
    setFumbleRecoveryYards,
    // Safety
    safetyTeam,
    setSafetyTeam,
    // Reset
    resetPlayState
  };
}
