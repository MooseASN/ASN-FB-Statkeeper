import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook for managing offline play queue with automatic sync
 * Stores plays locally when offline and syncs when connection is restored
 */
export function useOfflineQueue(gameId, syncFunction) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingPlays, setPendingPlays] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);
  
  // Storage key for this game's pending plays
  const storageKey = `statmoose_pending_plays_${gameId}`;
  
  // Load pending plays from localStorage on mount
  useEffect(() => {
    if (gameId) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPendingPlays(parsed);
          if (parsed.length > 0) {
            toast.info(`${parsed.length} plays pending sync`);
          }
        }
      } catch (e) {
        console.error('Error loading pending plays:', e);
      }
    }
  }, [gameId, storageKey]);
  
  // Save pending plays to localStorage whenever they change
  useEffect(() => {
    if (gameId) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pendingPlays));
      } catch (e) {
        console.error('Error saving pending plays:', e);
      }
    }
  }, [pendingPlays, gameId, storageKey]);
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost - plays will be saved locally');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Sync pending plays when connection is restored
  useEffect(() => {
    if (isOnline && pendingPlays.length > 0 && !syncInProgress.current && syncFunction) {
      syncPendingPlays();
    }
  }, [isOnline, pendingPlays.length]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Add a play to the queue
  const queuePlay = useCallback((play) => {
    const playWithTimestamp = {
      ...play,
      _queuedAt: Date.now(),
      _id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setPendingPlays(prev => [...prev, playWithTimestamp]);
    return playWithTimestamp;
  }, []);
  
  // Remove a play from the queue (after successful sync)
  const removeFromQueue = useCallback((playId) => {
    setPendingPlays(prev => prev.filter(p => p._id !== playId));
  }, []);
  
  // Clear all pending plays
  const clearQueue = useCallback(() => {
    setPendingPlays([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);
  
  // Sync all pending plays
  const syncPendingPlays = useCallback(async () => {
    if (syncInProgress.current || !syncFunction || pendingPlays.length === 0) {
      return;
    }
    
    syncInProgress.current = true;
    setIsSyncing(true);
    
    const toSync = [...pendingPlays];
    let successCount = 0;
    let failCount = 0;
    
    for (const play of toSync) {
      try {
        // Remove internal queue properties before sending
        const { _queuedAt, _id, ...playData } = play;
        await syncFunction(playData);
        removeFromQueue(_id);
        successCount++;
      } catch (error) {
        console.error('Failed to sync play:', error);
        failCount++;
        // If we get a network error, stop trying
        if (!navigator.onLine) {
          break;
        }
      }
    }
    
    if (successCount > 0) {
      toast.success(`Synced ${successCount} play${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0 && navigator.onLine) {
      toast.error(`Failed to sync ${failCount} play${failCount > 1 ? 's' : ''}`);
    }
    
    syncInProgress.current = false;
    setIsSyncing(false);
  }, [pendingPlays, syncFunction, removeFromQueue]);
  
  return {
    isOnline,
    pendingPlays,
    pendingCount: pendingPlays.length,
    isSyncing,
    queuePlay,
    removeFromQueue,
    clearQueue,
    syncPendingPlays
  };
}

/**
 * Wrapper function for API calls that queues on failure
 * @param {Function} apiCall - The API call to make
 * @param {Object} playData - The play data to send/queue
 * @param {Function} queuePlay - The queue function from useOfflineQueue
 * @param {Function} onSuccess - Callback on successful API call
 * @param {Function} onLocalSuccess - Callback for local state update (optimistic)
 */
export async function executeWithQueue(apiCall, playData, queuePlay, onSuccess, onLocalSuccess) {
  // Optimistically update local state
  if (onLocalSuccess) {
    onLocalSuccess(playData);
  }
  
  try {
    const result = await apiCall(playData);
    if (onSuccess) {
      onSuccess(result);
    }
    return { success: true, result };
  } catch (error) {
    // Queue the play for later sync
    queuePlay(playData);
    console.log('Play queued for sync:', playData);
    return { success: false, queued: true, error };
  }
}

export default useOfflineQueue;
