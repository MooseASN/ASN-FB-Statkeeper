import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing football game clock
 * Extracted from FootballLiveGame.jsx to reduce component complexity
 */
export function useGameClock(initialClockTime = 900) {
  const [clockTime, setClockTime] = useState(initialClockTime); // Default 15 minutes
  const [clockRunning, setClockRunning] = useState(false);
  const [showSetClockDialog, setShowSetClockDialog] = useState(false);
  const [tempClockMinutes, setTempClockMinutes] = useState(Math.floor(initialClockTime / 60));
  const [tempClockSeconds, setTempClockSeconds] = useState(initialClockTime % 60);

  // Clock tick effect
  useEffect(() => {
    let interval;
    if (clockRunning && clockTime > 0) {
      interval = setInterval(() => {
        setClockTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockRunning, clockTime]);

  // Format clock time as MM:SS
  const formatClockTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Toggle clock running
  const toggleClock = useCallback(() => {
    setClockRunning((prev) => !prev);
  }, []);

  // Stop clock
  const stopClock = useCallback(() => {
    setClockRunning(false);
  }, []);

  // Start clock
  const startClock = useCallback(() => {
    setClockRunning(true);
  }, []);

  // Open set clock dialog
  const openSetClockDialog = useCallback(() => {
    setTempClockMinutes(Math.floor(clockTime / 60));
    setTempClockSeconds(clockTime % 60);
    setShowSetClockDialog(true);
  }, [clockTime]);

  // Confirm set clock
  const confirmSetClock = useCallback(() => {
    const newTime = (tempClockMinutes * 60) + tempClockSeconds;
    setClockTime(newTime);
    setShowSetClockDialog(false);
  }, [tempClockMinutes, tempClockSeconds]);

  // Reset clock to a specific time
  const resetClock = useCallback((seconds) => {
    setClockTime(seconds);
    setClockRunning(false);
  }, []);

  // Initialize clock from saved state
  const initializeFromState = useCallback((savedClockTime) => {
    if (typeof savedClockTime === 'string') {
      const [mins, secs] = savedClockTime.split(':').map(Number);
      setClockTime(mins * 60 + secs);
    } else if (typeof savedClockTime === 'number') {
      setClockTime(savedClockTime);
    }
  }, []);

  return {
    clockTime,
    clockRunning,
    showSetClockDialog,
    tempClockMinutes,
    tempClockSeconds,
    setClockTime,
    setClockRunning,
    setShowSetClockDialog,
    setTempClockMinutes,
    setTempClockSeconds,
    formatClockTime,
    toggleClock,
    stopClock,
    startClock,
    openSetClockDialog,
    confirmSetClock,
    resetClock,
    initializeFromState,
  };
}
