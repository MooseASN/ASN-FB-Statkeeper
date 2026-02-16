import { useState } from 'react';

/**
 * Custom hook for managing kickoff workflow state and logic
 */
export function useKickoffWorkflow(game, setGame, demoMode, API, id) {
  const [showKickoffTeamDialog, setShowKickoffTeamDialog] = useState(false);
  const [showKickoffWorkflow, setShowKickoffWorkflow] = useState(false);
  const [kickoffStep, setKickoffStep] = useState(1);
  const [kickingTeam, setKickingTeam] = useState(null);
  const [kickoffData, setKickoffData] = useState({
    kickerNumber: null,
    returnerNumber: null,
    returnYards: 20,
    touchback: false,
    outOfBounds: false,
    onsideKick: false,
    muffedKick: false,
    recoveryTeam: null,
    kickDistance: 65,
    startYardLine: 35,
    returnStartYardLine: null,
    tacklerNumber: null
  });

  const handleKickoffTeamSelect = (team) => {
    setKickingTeam(team);
    setKickoffData(prev => ({
      ...prev,
      returnerNumber: null,
      kickerNumber: null,
      returnYards: 20,
      touchback: false,
      outOfBounds: false,
      onsideKick: false,
      muffedKick: false,
      recoveryTeam: null,
      tacklerNumber: null
    }));
    setShowKickoffTeamDialog(false);
    setShowKickoffWorkflow(true);
    setKickoffStep(1);
  };

  const handleKickoffBack = () => {
    if (kickoffStep > 1) {
      setKickoffStep(prev => prev - 1);
    }
  };

  const handleKickoffNext = () => {
    if (kickoffStep < 3) {
      setKickoffStep(prev => prev + 1);
    }
  };

  const resetKickoffState = () => {
    setShowKickoffWorkflow(false);
    setKickoffStep(1);
    setKickingTeam(null);
    setKickoffData({
      kickerNumber: null,
      returnerNumber: null,
      returnYards: 20,
      touchback: false,
      outOfBounds: false,
      onsideKick: false,
      muffedKick: false,
      recoveryTeam: null,
      kickDistance: 65,
      startYardLine: 35,
      returnStartYardLine: null,
      tacklerNumber: null
    });
  };

  return {
    // State
    showKickoffTeamDialog,
    setShowKickoffTeamDialog,
    showKickoffWorkflow,
    setShowKickoffWorkflow,
    kickoffStep,
    setKickoffStep,
    kickingTeam,
    setKickingTeam,
    kickoffData,
    setKickoffData,
    // Handlers
    handleKickoffTeamSelect,
    handleKickoffBack,
    handleKickoffNext,
    resetKickoffState
  };
}
