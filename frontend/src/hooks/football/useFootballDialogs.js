import { useState } from 'react';

/**
 * Custom hook for managing football dialog states
 */
export function useFootballDialogs() {
  const [showSpotBallDialog, setShowSpotBallDialog] = useState(false);
  const [showSetDownDialog, setShowSetDownDialog] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showAdvanceQuarterDialog, setShowAdvanceQuarterDialog] = useState(false);
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);
  const [showEditPlayDialog, setShowEditPlayDialog] = useState(false);
  const [showPenaltyPlayDialog, setShowPenaltyPlayDialog] = useState(false);
  
  // Spot ball state
  const [spotBallYardLine, setSpotBallYardLine] = useState(25);
  
  // Manual down/distance state
  const [manualDown, setManualDown] = useState(1);
  const [manualDistance, setManualDistance] = useState(10);

  const resetDialogs = () => {
    setShowSpotBallDialog(false);
    setShowSetDownDialog(false);
    setShowTimeoutDialog(false);
    setShowAdvanceQuarterDialog(false);
    setShowEndGameDialog(false);
    setShowEditPlayDialog(false);
    setShowPenaltyPlayDialog(false);
  };

  return {
    // Dialog visibility
    showSpotBallDialog,
    setShowSpotBallDialog,
    showSetDownDialog,
    setShowSetDownDialog,
    showTimeoutDialog,
    setShowTimeoutDialog,
    showAdvanceQuarterDialog,
    setShowAdvanceQuarterDialog,
    showEndGameDialog,
    setShowEndGameDialog,
    showEditPlayDialog,
    setShowEditPlayDialog,
    showPenaltyPlayDialog,
    setShowPenaltyPlayDialog,
    // Spot ball
    spotBallYardLine,
    setSpotBallYardLine,
    // Down/distance
    manualDown,
    setManualDown,
    manualDistance,
    setManualDistance,
    // Helpers
    resetDialogs
  };
}
