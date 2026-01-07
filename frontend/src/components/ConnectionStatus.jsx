import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Connection status indicator with pending plays count
 */
export function ConnectionStatus({ isOnline, pendingCount, isSyncing, onSync, className }) {
  if (isOnline && pendingCount === 0 && !isSyncing) {
    // All good - show nothing or minimal indicator
    return null;
  }
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
      isOnline 
        ? (pendingCount > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400")
        : "bg-red-500/20 text-red-400",
      className
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
              {pendingCount}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="w-4 h-4" />
          <span>{pendingCount} pending</span>
          <button 
            onClick={onSync}
            className="ml-1 p-1 hover:bg-yellow-500/30 rounded"
            title="Sync now"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;
