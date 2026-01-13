import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Share2, FileDown, UserPlus, Copy, Check, Undo2, Redo2, X, Plus, Minimize2, Maximize2, Code, RotateCcw, Pencil, Play, Pause, ChevronUp, ChevronDown, Coffee, SkipForward, StickyNote, Trash2, ArrowLeftRight, FileText, Monitor } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import ConnectionStatus from "@/components/ConnectionStatus";
import EmbedSnippetGenerator from "@/components/EmbedSnippetGenerator";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Shot Selection Modal
const ShotModal = ({ isOpen, onClose, shotType, playerName, onMake, onMiss, simpleMode }) => {
  if (!isOpen) return null;
  
  const shotLabels = {
    ft: "Free Throw",
    fg2: "2-Point Shot",
    fg3: "3-Point Shot"
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{shotLabels[shotType]}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-6">{playerName}</p>
        {simpleMode ? (
          <button
            onClick={onMake}
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-colors"
            data-testid="shot-make-btn"
          >
            MAKE
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onMake}
              className="py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-xl transition-colors"
              data-testid="shot-make-btn"
            >
              MAKE
            </button>
            <button
              onClick={onMiss}
              className="py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl transition-colors"
              data-testid="shot-miss-btn"
            >
              MISS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Rebound Type Selection Modal - shown after a missed shot
const PostMissReboundModal = ({ isOpen, onClose, onSelectType }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Rebound?</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-4">Who got the rebound?</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => onSelectType('offensive')}
            className="py-6 rounded-xl bg-green-100 hover:bg-green-200 border-2 border-green-300 hover:border-green-500 font-bold text-green-700 transition-colors"
          >
            <div className="text-lg">OREB</div>
            <div className="text-xs text-green-600">Offensive</div>
          </button>
          <button
            onClick={() => onSelectType('defensive')}
            className="py-6 rounded-xl bg-blue-100 hover:bg-blue-200 border-2 border-blue-300 hover:border-blue-500 font-bold text-blue-700 transition-colors"
          >
            <div className="text-lg">DREB</div>
            <div className="text-xs text-blue-600">Defensive</div>
          </button>
          <button
            onClick={() => onSelectType('deadball')}
            className="py-6 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-500 font-bold text-gray-700 transition-colors"
          >
            <div className="text-lg">DEAD</div>
            <div className="text-xs text-gray-600">Deadball</div>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

// Rebound Player Selection Modal - shown after selecting rebound type
const ReboundPlayerModal = ({ isOpen, onClose, reboundType, players, teamColor, onSelectPlayer }) => {
  if (!isOpen) return null;
  
  const typeLabel = reboundType === 'offensive' ? 'Offensive Rebound' : 'Defensive Rebound';
  const bgColor = reboundType === 'offensive' ? 'bg-green-50' : 'bg-blue-50';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${bgColor} rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{typeLabel}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-4">Select the player who got the rebound</p>
        <div className="grid grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto">
          {players.map(player => (
            <button
              key={player.id}
              onClick={() => onSelectPlayer(player)}
              className="py-4 px-2 rounded-lg border-2 hover:border-opacity-100 transition-colors text-center bg-white"
              style={{ 
                borderColor: teamColor, 
                color: teamColor 
              }}
            >
              <div className="text-xl font-bold">#{player.player_number}</div>
              <div className="text-xs truncate">{player.player_name?.split(' ')[0]}</div>
            </button>
          ))}
        </div>
        {players.length === 0 && (
          <p className="text-center text-slate-500 py-4">No players available</p>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-white hover:bg-slate-100 text-slate-600 font-medium border"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Legacy Rebound Selection Modal for manual rebound clicks (kept for compatibility)
const ReboundModal = ({ isOpen, onClose, playerName, onOffensive, onDefensive, onDeadball }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Rebound Type</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-4">{playerName}</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onOffensive}
            className="py-6 rounded-xl bg-green-100 hover:bg-green-200 border-2 border-green-300 hover:border-green-500 font-bold text-green-700 transition-colors"
          >
            <div className="text-lg">OREB</div>
            <div className="text-xs text-green-600">Offensive</div>
          </button>
          <button
            onClick={onDefensive}
            className="py-6 rounded-xl bg-blue-100 hover:bg-blue-200 border-2 border-blue-300 hover:border-blue-500 font-bold text-blue-700 transition-colors"
          >
            <div className="text-lg">DREB</div>
            <div className="text-xs text-blue-600">Defensive</div>
          </button>
          <button
            onClick={onDeadball}
            className="py-6 rounded-xl bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-500 font-bold text-gray-700 transition-colors"
          >
            <div className="text-lg">DEAD</div>
            <div className="text-xs text-gray-600">Deadball</div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Assist Selection Modal - shown after a made basket
const AssistModal = ({ isOpen, onClose, teammates, onSelectAssist, onNoAssist, teamColor }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Who had the assist?</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {teammates.map(player => (
            <button
              key={player.id}
              onClick={() => onSelectAssist(player)}
              className="py-4 px-2 rounded-lg border-2 hover:border-opacity-100 transition-colors text-center"
              style={{ 
                borderColor: teamColor, 
                backgroundColor: `${teamColor}10`,
                color: teamColor 
              }}
            >
              <div className="text-xl font-bold">#{player.player_number}</div>
              <div className="text-xs truncate">{player.player_name?.split(' ')[0]}</div>
            </button>
          ))}
        </div>
        <button
          onClick={onNoAssist}
          className="w-full py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
        >
          No Assist (Unassisted)
        </button>
      </div>
    </div>
  );
};

// Calculate shooting stats for a player
const calcShootingStats = (player) => {
  const ft_att = player.ft_made + player.ft_missed;
  const ft_pct = ft_att > 0 ? Math.round((player.ft_made / ft_att) * 100) : 0;
  
  const fg2_att = player.fg2_made + player.fg2_missed;
  const fg2_pct = fg2_att > 0 ? Math.round((player.fg2_made / fg2_att) * 100) : 0;
  
  const fg3_att = player.fg3_made + player.fg3_missed;
  const fg3_pct = fg3_att > 0 ? Math.round((player.fg3_made / fg3_att) * 100) : 0;
  
  const fg_made = player.fg2_made + player.fg3_made;
  const fg_att = fg_made + player.fg2_missed + player.fg3_missed;
  const fg_pct = fg_att > 0 ? Math.round((fg_made / fg_att) * 100) : 0;
  
  return { ft_att, ft_pct, fg2_att, fg2_pct, fg3_att, fg3_pct, fg_made, fg_att, fg_pct };
};

// Sort players by jersey number numerically
const sortByNumber = (players) => {
  return [...players].sort((a, b) => {
    const numA = parseInt(a.player_number, 10) || 0;
    const numB = parseInt(b.player_number, 10) || 0;
    return numA - numB;
  });
};

// ============ CONDENSED PLAYER CARD ============
const CondensedPlayerCard = ({ player, teamColor, onShotClick, onStatUpdate, onEditPlayer, onRemovePlayer, disabled, clockEnabled, isOnFloor, onToggleFloor, canCheckIn, simpleMode }) => {
  const pts = player.ft_made + (player.fg2_made * 2) + (player.fg3_made * 3);
  const stats = calcShootingStats(player);
  const totalReb = player.offensive_rebounds + player.defensive_rebounds;
  
  return (
    <div className={`bg-white rounded-lg px-2 py-1.5 shadow-sm border ${isOnFloor ? 'ring-2 ring-green-500' : ''}`} data-testid={`player-card-${player.id}`}>
      <div className="flex items-center gap-2">
        {/* On-floor checkbox - below player number area */}
        <div className="flex flex-col items-center gap-0.5">
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: teamColor }}
          >
            {player.player_number}
          </div>
          {/* Always show checkbox for player selection */}
          <Checkbox
            checked={isOnFloor}
            onCheckedChange={() => onToggleFloor(player.id)}
            disabled={!isOnFloor && !canCheckIn}
            className="w-4 h-4 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            title={isOnFloor ? "On floor (click to sub out)" : (canCheckIn ? "Click to sub in" : "5 players max on floor")}
          />
        </div>
        
        {simpleMode ? (
          /* Simple Mode - Responsive layout for tablets/desktops */
          <div className="flex-1 flex flex-col gap-2">
            {/* Row 1: Player name with edit/delete and points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{player.player_name}</span>
                <button
                  onClick={() => onEditPlayer(player)}
                  className="p-0.5 sm:p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="Edit player"
                >
                  <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => onRemovePlayer(player)}
                  className="p-0.5 sm:p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Remove player"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <span className="text-base sm:text-lg font-bold">{pts} PTS</span>
            </div>
            
            {/* Row 2: All stat buttons - responsive sizing */}
            <div className="flex items-center gap-1 sm:gap-2 justify-between">
              <button
                onClick={() => onShotClick(player, "fg2")}
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 font-bold disabled:opacity-50 transition-colors"
              >
                2PT
              </button>
              <button
                onClick={() => onShotClick(player, "fg3")}
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 font-bold disabled:opacity-50 transition-colors"
              >
                3PT
              </button>
              <button
                onClick={() => onShotClick(player, "ft")}
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 font-bold disabled:opacity-50 transition-colors"
              >
                FT
              </button>
              <button 
                onClick={() => onStatUpdate(player.id, "dreb")} 
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-cyan-300 bg-cyan-50 hover:border-cyan-500 hover:bg-cyan-100 font-bold disabled:opacity-50 transition-colors"
              >
                REB
              </button>
              <button 
                onClick={() => onStatUpdate(player.id, "assist")} 
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-purple-300 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 font-bold disabled:opacity-50 transition-colors"
              >
                AST
              </button>
              <button 
                onClick={() => onStatUpdate(player.id, "foul")} 
                disabled={disabled}
                className="w-10 h-10 sm:w-12 sm:h-12 text-[10px] sm:text-xs rounded-full border-2 border-red-300 bg-red-50 hover:border-red-500 hover:bg-red-100 text-red-600 font-bold disabled:opacity-50 transition-colors"
              >
                PF
              </button>
            </div>
          </div>
        ) : (
          /* Classic Mode - Revamped layout similar to Simple Mode */
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Row 1: Name + Shooting Splits + Points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[180px]">{player.player_name}</span>
                <button onClick={() => onEditPlayer(player)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded flex-shrink-0">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => onRemovePlayer(player)} className="p-0.5 text-red-400 hover:text-red-600 rounded flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {player.ft_made}/{stats.ft_att} FT • {player.fg2_made + player.fg3_made}/{stats.fg2_att + stats.fg3_att} FG • {player.fg3_made}/{stats.fg3_att} 3PT
                </span>
                <span className="text-sm font-bold">{pts} PTS</span>
              </div>
            </div>
            
            {/* Row 2: All 9 stat buttons - square with larger text */}
            <div className="grid grid-cols-9 gap-1">
              <button onClick={() => onShotClick(player, "ft")} disabled={disabled}
                className="aspect-square rounded border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">FT</span>
              </button>
              <button onClick={() => onShotClick(player, "fg2")} disabled={disabled}
                className="aspect-square rounded border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">2PT</span>
              </button>
              <button onClick={() => onShotClick(player, "fg3")} disabled={disabled}
                className="aspect-square rounded border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">3PT</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "dreb")} disabled={disabled}
                className="aspect-square rounded border-2 border-cyan-200 bg-cyan-50 hover:border-cyan-500 hover:bg-cyan-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">REB</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "assist")} disabled={disabled}
                className="aspect-square rounded border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">AST</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "block")} disabled={disabled}
                className="aspect-square rounded border-2 border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">BLK</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "steal")} disabled={disabled}
                className="aspect-square rounded border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-500 hover:bg-indigo-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">STL</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "turnover")} disabled={disabled}
                className="aspect-square rounded border-2 border-amber-200 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 text-amber-700 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">TOV</span>
              </button>
              <button onClick={() => onStatUpdate(player.id, "foul")} disabled={disabled}
                className="aspect-square rounded border-2 border-red-200 bg-red-50 hover:border-red-500 hover:bg-red-100 text-red-600 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
                <span className="text-[10px] sm:text-xs">PF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ EXPANDED PLAYER CARD ============
const ExpandedPlayerCard = ({ player, teamColor, onShotClick, onStatUpdate, onReboundClick, onEditPlayer, onRemovePlayer, disabled, clockEnabled, isOnFloor, onToggleFloor, canCheckIn, simpleMode }) => {
  const pts = player.ft_made + (player.fg2_made * 2) + (player.fg3_made * 3);
  const stats = calcShootingStats(player);
  const totalReb = player.offensive_rebounds + player.defensive_rebounds;
  
  return (
    <div className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm border ${isOnFloor ? 'ring-2 ring-green-500' : ''}`} data-testid={`player-card-${player.id}`}>
      {simpleMode ? (
        /* ============ SIMPLE MODE EXPANDED ============ */
        <>
          {/* Header with player info */}
          <div className="flex items-center gap-3 mb-4">
            {clockEnabled && (
              <Checkbox
                checked={isOnFloor}
                onCheckedChange={() => onToggleFloor(player.id)}
                disabled={!isOnFloor && !canCheckIn}
                className="w-5 h-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
            )}
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0"
              style={{ backgroundColor: teamColor }}
            >
              {player.player_number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base sm:text-lg truncate">{player.player_name}</h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onEditPlayer(player)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => onRemovePlayer(player)} className="p-1 text-red-400 hover:text-red-600 rounded">
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {player.fg2_made} 2P • {player.fg3_made} 3P • {player.ft_made} FT
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: teamColor }}>{pts} <span className="text-sm sm:text-lg">PTS</span></div>
            </div>
          </div>
          
          {/* Shot buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <button onClick={() => onShotClick(player, "fg2")} disabled={disabled}
              className="py-3 sm:py-4 rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold disabled:opacity-50 transition-colors">
              <div className="text-lg sm:text-xl">2PT</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{player.fg2_made}</div>
            </button>
            <button onClick={() => onShotClick(player, "fg3")} disabled={disabled}
              className="py-3 sm:py-4 rounded-xl border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 font-bold disabled:opacity-50 transition-colors">
              <div className="text-lg sm:text-xl">3PT</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{player.fg3_made}</div>
            </button>
            <button onClick={() => onShotClick(player, "ft")} disabled={disabled}
              className="py-3 sm:py-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 font-bold disabled:opacity-50 transition-colors">
              <div className="text-lg sm:text-xl">FT</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{player.ft_made}</div>
            </button>
          </div>
          
          {/* Other stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button onClick={() => onStatUpdate(player.id, "dreb")} disabled={disabled}
              className="py-3 sm:py-4 bg-cyan-50 hover:bg-cyan-100 rounded-xl disabled:opacity-50 border-2 border-cyan-300 hover:border-cyan-500">
              <div className="text-xl sm:text-2xl font-bold">{totalReb}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">REB</div>
            </button>
            <button onClick={() => onStatUpdate(player.id, "assist")} disabled={disabled}
              className="py-3 sm:py-4 bg-purple-50 hover:bg-purple-100 rounded-xl disabled:opacity-50 border-2 border-purple-300 hover:border-purple-500">
              <div className="text-xl sm:text-2xl font-bold">{player.assists}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">AST</div>
            </button>
            <button onClick={() => onStatUpdate(player.id, "foul")} disabled={disabled}
              className="py-3 sm:py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl disabled:opacity-50 border-2 border-red-300 hover:border-red-500">
              <div className="text-xl sm:text-2xl font-bold">{player.fouls}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">PF</div>
            </button>
          </div>
        </>
      ) : (
        /* ============ CLASSIC MODE - REVAMPED UI ============ */
        <>
          {/* Row 1: Number | Name + Shooting Splits | Points */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            {/* On-floor checkbox */}
            {clockEnabled && (
              <Checkbox
                checked={isOnFloor}
                onCheckedChange={() => onToggleFloor(player.id)}
                disabled={!isOnFloor && !canCheckIn}
                className="w-4 h-4 sm:w-5 sm:h-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 flex-shrink-0"
              />
            )}
            
            {/* Player Number */}
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0"
              style={{ backgroundColor: teamColor }}
            >
              {player.player_number}
            </div>
            
            {/* Name + Shooting Splits */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <h4 className="font-bold text-sm sm:text-base truncate max-w-[140px] sm:max-w-[200px]">{player.player_name}</h4>
                <button onClick={() => onEditPlayer(player)} className="p-0.5 sm:p-1 text-slate-400 hover:text-slate-600 rounded flex-shrink-0">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => onRemovePlayer(player)} className="p-0.5 sm:p-1 text-red-400 hover:text-red-600 rounded flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {player.ft_made}/{stats.ft_att} FT • {player.fg2_made + player.fg3_made}/{stats.fg2_att + stats.fg3_att} FG • {player.fg3_made}/{stats.fg3_att} 3PT
              </p>
            </div>
            
            {/* Points */}
            <div className="text-right flex-shrink-0">
              <div className="text-xl sm:text-2xl font-bold" style={{ color: teamColor }}>{pts} <span className="text-xs sm:text-sm">PTS</span></div>
            </div>
          </div>
          
          {/* Row 2: All Stat Buttons - FT, 2PT, 3PT, REB, AST, BLK, STL, TOV, PF */}
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
            <button onClick={() => onShotClick(player, "ft")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">FT</span>
            </button>
            <button onClick={() => onShotClick(player, "fg2")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">2PT</span>
            </button>
            <button onClick={() => onShotClick(player, "fg3")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">3PT</span>
            </button>
            <button onClick={() => onReboundClick && onReboundClick(player)} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:border-cyan-500 hover:bg-cyan-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">REB</span>
            </button>
            <button onClick={() => onStatUpdate(player.id, "assist")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">AST</span>
            </button>
            <button onClick={() => onStatUpdate(player.id, "block")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">BLK</span>
            </button>
            <button onClick={() => onStatUpdate(player.id, "steal")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-500 hover:bg-indigo-100 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">STL</span>
            </button>
            <button onClick={() => onStatUpdate(player.id, "turnover")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-amber-200 bg-amber-50 hover:border-amber-500 hover:bg-amber-100 text-amber-700 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">TOV</span>
            </button>
            <button onClick={() => onStatUpdate(player.id, "foul")} disabled={disabled}
              className="aspect-square rounded-lg border-2 border-red-200 bg-red-50 hover:border-red-500 hover:bg-red-100 text-red-600 font-bold disabled:opacity-50 transition-colors flex items-center justify-center">
              <span className="text-xs sm:text-sm">PF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Side Action Button - Responsive
const SideActionButton = ({ label, onClick, color, position, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`fixed ${position} w-10 sm:w-12 py-6 sm:py-8 text-white text-[10px] sm:text-xs font-bold writing-mode-vertical flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50 z-40`}
    style={{ 
      backgroundColor: color,
      writingMode: "vertical-rl",
      textOrientation: "mixed"
    }}
    data-testid={`side-${label.toLowerCase().replace(' ', '-')}`}
  >
    {label}
  </button>
);

// Calculate team shooting stats
const calcTeamShootingStats = (stats) => {
  const totals = stats.reduce((acc, p) => ({
    ft_made: acc.ft_made + p.ft_made,
    ft_missed: acc.ft_missed + p.ft_missed,
    fg2_made: acc.fg2_made + p.fg2_made,
    fg2_missed: acc.fg2_missed + p.fg2_missed,
    fg3_made: acc.fg3_made + p.fg3_made,
    fg3_missed: acc.fg3_missed + p.fg3_missed,
  }), { ft_made: 0, ft_missed: 0, fg2_made: 0, fg2_missed: 0, fg3_made: 0, fg3_missed: 0 });
  
  const ft_att = totals.ft_made + totals.ft_missed;
  const ft_pct = ft_att > 0 ? Math.round((totals.ft_made / ft_att) * 100) : 0;
  
  const fg2_att = totals.fg2_made + totals.fg2_missed;
  const fg2_pct = fg2_att > 0 ? Math.round((totals.fg2_made / fg2_att) * 100) : 0;
  
  const fg3_att = totals.fg3_made + totals.fg3_missed;
  const fg3_pct = fg3_att > 0 ? Math.round((totals.fg3_made / fg3_att) * 100) : 0;
  
  const fg_made = totals.fg2_made + totals.fg3_made;
  const fg_att = fg_made + totals.fg2_missed + totals.fg3_missed;
  const fg_pct = fg_att > 0 ? Math.round((fg_made / fg_att) * 100) : 0;
  
  return { 
    ft_made: totals.ft_made, ft_att, ft_pct,
    fg2_made: totals.fg2_made, fg2_att, fg2_pct,
    fg3_made: totals.fg3_made, fg3_att, fg3_pct,
    fg_made, fg_att, fg_pct
  };
};

// Demo Mode Bar Component
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

export default function LiveGame({ demoMode = false, initialDemoData = null }) {
  const params = useParams();
  const id = demoMode ? 'demo' : params.id;
  const navigate = useNavigate();
  
  // Subscription features for gating
  const { canAccess, getRequiredTierFor } = useSubscriptionFeatures();
  
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addPlayerTeam, setAddPlayerTeam] = useState("home");
  const [newPlayer, setNewPlayer] = useState({ number: "", name: "" });
  const [bulkPlayers, setBulkPlayers] = useState([{ number: "", name: "" }]); // For bulk add
  const [teamsFlipped, setTeamsFlipped] = useState(false); // For flipping team positions
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [redoAction, setRedoAction] = useState(null);  // Store undone action for redo
  const [showPlayByPlay, setShowPlayByPlay] = useState(false);
  const [viewMode, setViewMode] = useState("condensed"); // "condensed" or "expanded"
  
  // Shot modal state
  const [shotModalOpen, setShotModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedShotType, setSelectedShotType] = useState(null);
  
  // Rebound modal state (for Classic mode)
  const [reboundModalOpen, setReboundModalOpen] = useState(false);
  const [reboundPlayer, setReboundPlayer] = useState(null);
  
  // Post-miss rebound flow state
  const [postMissReboundOpen, setPostMissReboundOpen] = useState(false);
  const [missedShotTeam, setMissedShotTeam] = useState(null); // 'home' or 'away' - team that missed the shot
  const [reboundTypeSelected, setReboundTypeSelected] = useState(null); // 'offensive' or 'defensive'
  const [reboundPlayerModalOpen, setReboundPlayerModalOpen] = useState(false);
  
  // Reset stats state
  const [resetStatsOpen, setResetStatsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Edit player state
  const [editPlayerOpen, setEditPlayerOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editPlayerData, setEditPlayerData] = useState({ number: "", name: "" });
  
  // Clock state
  const [clockTime, setClockTime] = useState(0);
  const [clockRunning, setClockRunning] = useState(false);
  const clockIntervalRef = useRef(null);
  const [showPeriodEndDialog, setShowPeriodEndDialog] = useState(false);
  const [resetFoulsOnAdvance, setResetFoulsOnAdvance] = useState(true);
  const [showHalftimeExitDialog, setShowHalftimeExitDialog] = useState(false);

  // Note state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Remove player state
  const [removePlayerOpen, setRemovePlayerOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState(null);

  // Edit play-by-play state
  const [editPlayOpen, setEditPlayOpen] = useState(false);
  const [editingPlay, setEditingPlay] = useState(null);
  const [editPlayData, setEditPlayData] = useState({ player_id: "", player_number: "", player_name: "", action: "" });

  // Embed dialog state
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedWidth, setEmbedWidth] = useState("1920");
  const [embedHeight, setEmbedHeight] = useState("300");

  // Timeout state
  const [timeoutDialogOpen, setTimeoutDialogOpen] = useState(false);
  const [timeoutTeam, setTimeoutTeam] = useState(null); // "home" or "away"
  
  // Assist flow state (for showing assist modal after made 2pt/3pt)
  const [assistModalOpen, setAssistModalOpen] = useState(false);
  const [assistTeam, setAssistTeam] = useState(null);
  const [assistScorer, setAssistScorer] = useState(null);

  // Ref for fetchGame to avoid circular dependency with sync
  const fetchGameRef = useRef(null);

  const fetchGame = useCallback(async (isInitialLoad = false) => {
    // In demo mode, don't fetch from API - data is managed locally
    if (demoMode) {
      if (isInitialLoad) {
        setLoading(false);
      }
      return;
    }
    
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      
      // Redirect to advanced mode if enabled
      if (res.data.advanced_mode) {
        navigate(`/game/${id}/advanced`, { replace: true });
        return;
      }
    } catch (error) {
      // Only navigate away on initial load failure, not on refresh failures
      if (isInitialLoad) {
        toast.error("Failed to load game");
        navigate("/dashboard");
      }
      // Silently ignore refresh errors - keep showing last data
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [id, navigate, demoMode]);

  // Keep ref updated
  fetchGameRef.current = fetchGame;

  // Sync function for offline queue - in demo mode, just update local state
  const syncPlay = useCallback(async (playData) => {
    if (demoMode) {
      // In demo mode, stats are already updated locally, no API call needed
      return;
    }
    
    if (playData.type === 'stat') {
      await axios.post(`${API}/games/${id}/stats`, playData.data);
    } else if (playData.type === 'team-stat') {
      await axios.post(`${API}/games/${id}/team-stats`, playData.data);
    } else if (playData.type === 'clock') {
      await axios.post(`${API}/games/${id}/clock/set`, playData.data);
    } else if (playData.type === 'timeout') {
      await axios.post(`${API}/games/${id}/timeout`, playData.data);
    } else if (playData.type === 'bonus') {
      await axios.post(`${API}/games/${id}/bonus`, playData.data);
    }
    // Refresh game data after sync
    if (fetchGameRef.current) {
      fetchGameRef.current(false);
    }
  }, [id, demoMode]);

  // Offline queue hook
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    queuePlay, 
    syncPendingPlays 
  } = useOfflineQueue(id, syncPlay);

  useEffect(() => {
    if (!demoMode) {
      fetchGame(true); // Initial load
      const interval = setInterval(() => fetchGame(false), 5000); // Refresh
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
    document.title = "StatMoose BKB";
  }, [id, demoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock control functions - use useCallback for stable references (must be defined before useEffect that uses them)
  const handleStartClock = useCallback(async () => {
    if (demoMode) {
      setClockRunning(true);
      return;
    }
    try {
      await axios.post(`${API}/games/${id}/clock/start`);
      setClockRunning(true);
    } catch (error) {
      toast.error("Failed to start clock");
    }
  }, [id, demoMode]);

  const handleStopClock = useCallback(async () => {
    if (demoMode) {
      setClockRunning(false);
      return;
    }
    try {
      await axios.post(`${API}/games/${id}/clock/stop`);
      setClockRunning(false);
      // Save current clock time
      await axios.post(`${API}/games/${id}/clock/set`, { time: clockTime });
      fetchGame();
    } catch (error) {
      toast.error("Failed to stop clock");
    }
  }, [id, clockTime, fetchGame, demoMode]);

  // Backslash keyboard handler for clock toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Backslash (\) toggles clock when enabled
      if (e.key === '\\' && game?.clock_enabled) {
        e.preventDefault();
        if (clockRunning) {
          handleStopClock();
        } else {
          handleStartClock();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game?.clock_enabled, clockRunning, handleStartClock, handleStopClock]);

  // Sync clock state from game data
  useEffect(() => {
    if (game?.clock_enabled) {
      setClockTime(game.clock_time || 0);
      setClockRunning(game.clock_running || false);
    }
  }, [game?.clock_time, game?.clock_running, game?.clock_enabled]);

  // Clock countdown effect
  useEffect(() => {
    if (clockRunning && game?.clock_enabled) {
      clockIntervalRef.current = setInterval(() => {
        setClockTime(prev => {
          if (prev <= 1) {
            // Clock hit 0 - stop and show period end dialog
            handleStopClock();
            setShowPeriodEndDialog(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    }
    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, [clockRunning, game?.clock_enabled, handleStopClock]);

  const handleAdjustClock = async (seconds) => {
    const newTime = Math.max(0, clockTime + seconds);
    setClockTime(newTime);
    try {
      await axios.post(`${API}/games/${id}/clock/set`, { time: newTime });
    } catch (error) {
      // Silently fail for minor adjustments
    }
  };

  const handleNextPeriod = async (resetFouls = resetFoulsOnAdvance) => {
    try {
      await axios.post(`${API}/games/${id}/clock/next-period`, null, {
        params: { reset_fouls: resetFouls }
      });
      setShowPeriodEndDialog(false);
      fetchGame();
    } catch (error) {
      toast.error("Failed to advance period");
    }
  };

  const handleHalftime = async () => {
    try {
      if (game?.is_halftime) {
        // Already at halftime - show dialog to select next period
        setShowHalftimeExitDialog(true);
      } else {
        // Enter halftime
        await axios.post(`${API}/games/${id}/clock/halftime`);
        setShowPeriodEndDialog(false);
        fetchGame();
      }
    } catch (error) {
      toast.error("Failed to toggle halftime");
    }
  };

  const handleExitHalftime = async (nextQuarter) => {
    try {
      await axios.post(`${API}/games/${id}/clock/exit-halftime`, null, {
        params: { next_quarter: nextQuarter }
      });
      setShowHalftimeExitDialog(false);
      fetchGame();
    } catch (error) {
      toast.error("Failed to exit halftime");
    }
  };

  // Timeout handler
  const handleTimeout = async (timeoutType) => {
    if (!timeoutTeam) return;
    
    try {
      await axios.post(`${API}/games/${id}/timeout`, {
        team: timeoutTeam,
        timeout_type: timeoutType
      });
      setTimeoutDialogOpen(false);
      setTimeoutTeam(null);
      fetchGame();
      toast.success(`${timeoutType === 'full' ? 'Full' : 'Partial'} timeout used`);
    } catch (error) {
      toast.error("Failed to use timeout");
    }
  };

  // Bonus handler - cycle through null -> bonus -> double_bonus -> null
  const handleBonusToggle = async (team) => {
    const currentStatus = team === "home" ? game?.home_bonus : game?.away_bonus;
    let newStatus = null;
    
    if (!currentStatus) {
      newStatus = "bonus";
    } else if (currentStatus === "bonus") {
      newStatus = "double_bonus";
    } else {
      newStatus = null;
    }
    
    try {
      await axios.post(`${API}/games/${id}/bonus`, {
        team: team,
        bonus_status: newStatus
      });
      fetchGame();
      if (newStatus) {
        toast.success(`${team === 'home' ? game.home_team_name : game.away_team_name} is in ${newStatus === 'double_bonus' ? 'Double Bonus' : 'Bonus'}`);
      } else {
        toast.success(`Bonus cleared`);
      }
    } catch (error) {
      toast.error("Failed to update bonus");
    }
  };

  // Player check-in/out for minutes tracking
  const handlePlayerCheckIn = async (playerId) => {
    // In demo mode, update local state only
    if (demoMode) {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        const isHome = prevGame.home_player_stats?.some(p => p.id === playerId);
        const floorKey = isHome ? 'home_on_floor' : 'away_on_floor';
        const currentFloor = prevGame[floorKey] || [];
        if (currentFloor.length >= 5 || currentFloor.includes(playerId)) {
          return prevGame;
        }
        return { ...prevGame, [floorKey]: [...currentFloor, playerId] };
      });
      return;
    }
    
    try {
      await axios.post(`${API}/games/${id}/players/${playerId}/check-in`);
      fetchGame();
    } catch (error) {
      // Silently fail if team already has 5 players
    }
  };

  const handlePlayerCheckOut = async (playerId) => {
    // In demo mode, update local state only
    if (demoMode) {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        const isHome = prevGame.home_player_stats?.some(p => p.id === playerId);
        const floorKey = isHome ? 'home_on_floor' : 'away_on_floor';
        const currentFloor = prevGame[floorKey] || [];
        return { ...prevGame, [floorKey]: currentFloor.filter(id => id !== playerId) };
      });
      return;
    }
    
    try {
      await axios.post(`${API}/games/${id}/players/${playerId}/check-out`);
      fetchGame();
    } catch (error) {
      toast.error("Failed to check out player");
    }
  };

  const togglePlayerOnFloor = (playerId, isHome) => {
    const onFloor = isHome ? (game?.home_on_floor || []) : (game?.away_on_floor || []);
    if (onFloor.includes(playerId)) {
      handlePlayerCheckOut(playerId);
    } else {
      // Only allow if team has less than 5 on floor
      if (onFloor.length < 5) {
        handlePlayerCheckIn(playerId);
      }
    }
  };

  // Format clock time as MM:SS
  const formatClockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatUpdate = async (playerId, statType, increment = 1) => {
    const statData = {
      player_id: playerId,
      stat_type: statType,
      increment: increment
    };
    
    setLastAction({ playerId, statType, increment });
    
    // Optimistically update local state
    setGame(prevGame => {
      if (!prevGame) return prevGame;
      
      const updateStats = (stats) => stats.map(player => {
        if (player.id === playerId) {
          const currentValue = player[statType] || 0;
          return { ...player, [statType]: currentValue + increment };
        }
        return player;
      });
      
      return {
        ...prevGame,
        home_player_stats: updateStats(prevGame.home_player_stats || []),
        away_player_stats: updateStats(prevGame.away_player_stats || [])
      };
    });
    
    try {
      await axios.post(`${API}/games/${id}/stats`, statData);
      fetchGame(false);
    } catch (error) {
      // Queue the play for sync when connection is restored
      queuePlay({ type: 'stat', data: statData });
      toast.warning("Stat saved locally - will sync when online");
    }
  };

  const handleShotClick = (player, shotType) => {
    // In Simple Mode, directly add the made shot without dialog
    if (game?.simple_mode) {
      handleStatUpdate(player.id, `${shotType}_made`);
      return;
    }
    // In Classic Mode, show the make/miss dialog
    setSelectedPlayer(player);
    setSelectedShotType(shotType);
    setShotModalOpen(true);
  };

  const handleShotResult = async (made) => {
    if (!selectedPlayer || !selectedShotType) return;
    
    const statType = made ? `${selectedShotType}_made` : `${selectedShotType}_missed`;
    await handleStatUpdate(selectedPlayer.id, statType);
    setShotModalOpen(false);
    
    // Determine which team the shooter is on
    const shooterTeam = homeStats.find(p => p.id === selectedPlayer.id) ? 'home' : 'away';
    
    // For made 2pt or 3pt shots (not free throws), show assist modal
    if (made && (selectedShotType === 'fg2' || selectedShotType === 'fg3')) {
      setAssistTeam(shooterTeam);
      setAssistScorer(selectedPlayer);
      setAssistModalOpen(true);
    }
    
    // For missed field goals (not free throws), show rebound options
    if (!made && (selectedShotType === 'fg2' || selectedShotType === 'fg3')) {
      setMissedShotTeam(shooterTeam);
      setPostMissReboundOpen(true);
    }
    
    setSelectedPlayer(null);
    setSelectedShotType(null);
  };
  
  // Handle rebound type selection after missed shot
  const handleReboundTypeSelect = (type) => {
    setPostMissReboundOpen(false);
    
    if (type === 'deadball') {
      // Deadball - no rebound recorded
      setMissedShotTeam(null);
      toast.info("Deadball - no rebound");
      return;
    }
    
    setReboundTypeSelected(type);
    setReboundPlayerModalOpen(true);
  };
  
  // Handle player selection for rebound
  const handleReboundPlayerSelect = async (player) => {
    const statType = reboundTypeSelected === 'offensive' ? 'oreb' : 'dreb';
    await handleStatUpdate(player.id, statType);
    
    setReboundPlayerModalOpen(false);
    setReboundTypeSelected(null);
    setMissedShotTeam(null);
  };
  
  // Get players for rebound selection based on type
  const getReboundPlayers = () => {
    if (!missedShotTeam || !reboundTypeSelected) return [];
    
    if (reboundTypeSelected === 'offensive') {
      // Offensive rebound - players from the team that shot
      return missedShotTeam === 'home' ? homeStats : awayStats;
    } else {
      // Defensive rebound - players from the defending team
      return missedShotTeam === 'home' ? awayStats : homeStats;
    }
  };
  
  // Get team color for rebound modal
  const getReboundTeamColor = () => {
    if (!missedShotTeam || !reboundTypeSelected) return '#666';
    
    if (reboundTypeSelected === 'offensive') {
      return missedShotTeam === 'home' ? homeColor : awayColor;
    } else {
      return missedShotTeam === 'home' ? awayColor : homeColor;
    }
  };
  
  // Handle assist selection
  const handleAssistSelect = async (assister) => {
    if (assister) {
      await handleStatUpdate(assister.id, 'assist');
    }
    setAssistModalOpen(false);
    setAssistTeam(null);
    setAssistScorer(null);
  };

  // Rebound click handler for Classic mode
  const handleReboundClick = (player) => {
    setReboundPlayer(player);
    setReboundModalOpen(true);
  };

  const handleReboundResult = async (type) => {
    if (!reboundPlayer) return;
    const statType = type === 'offensive' ? 'oreb' : 'dreb';
    await handleStatUpdate(reboundPlayer.id, statType);
    setReboundModalOpen(false);
    setReboundPlayer(null);
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    try {
      await axios.post(`${API}/games/${id}/stats`, {
        player_id: lastAction.playerId,
        stat_type: lastAction.statType,
        increment: -lastAction.increment
      });
      // Save action for redo before clearing
      setRedoAction(lastAction);
      setLastAction(null);
      fetchGame();
      toast.success("Action undone");
    } catch (error) {
      toast.error("Failed to undo");
    }
  };

  const handleRedo = async () => {
    if (!redoAction) return;
    try {
      await axios.post(`${API}/games/${id}/stats`, {
        player_id: redoAction.playerId,
        stat_type: redoAction.statType,
        increment: redoAction.increment
      });
      // Move redo action back to lastAction
      setLastAction(redoAction);
      setRedoAction(null);
      fetchGame();
      toast.success("Action redone");
    } catch (error) {
      toast.error("Failed to redo");
    }
  };

  const handleQuarterChange = async (quarter) => {
    try {
      await axios.put(`${API}/games/${id}`, { current_quarter: quarter });
      fetchGame();
    } catch (error) {
      toast.error("Failed to update quarter");
    }
  };

  const handleAddOvertime = async () => {
    const currentMax = Math.max(4, game.current_quarter);
    try {
      await axios.put(`${API}/games/${id}`, { current_quarter: currentMax + 1 });
      fetchGame();
      toast.success(`Added OT${currentMax - 3}`);
    } catch (error) {
      toast.error("Failed to add overtime");
    }
  };

  const handleSaveNote = async () => {
    try {
      await axios.put(`${API}/games/${id}/note`, { note: noteText });
      fetchGame();
      setNoteDialogOpen(false);
      toast.success("Note saved");
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const openNoteDialog = () => {
    setNoteText(game?.note || "");
    setNoteDialogOpen(true);
  };

  const handleEndGame = async () => {
    if (!window.confirm("Are you sure you want to end this game? This will set the game status to Final.")) return;
    
    try {
      await axios.put(`${API}/games/${id}`, { status: "final" });
      toast.success("Game ended - Status: Final");
      fetchGame();
    } catch (error) {
      toast.error("Failed to end game");
    }
  };

  const handleAddPlayer = async () => {
    // Filter out empty rows
    const validPlayers = bulkPlayers.filter(p => p.number.trim() && p.name.trim());
    
    if (validPlayers.length === 0) {
      toast.error("Please add at least one player with number and name");
      return;
    }

    const teamId = addPlayerTeam === "home" ? game.home_team_id : game.away_team_id;
    let addedCount = 0;

    try {
      for (const player of validPlayers) {
        await axios.post(`${API}/games/${id}/players`, {
          team_id: teamId,
          player_number: player.number.trim(),
          player_name: player.name.trim()
        });
        addedCount++;
      }
      toast.success(`${addedCount} player${addedCount > 1 ? 's' : ''} added`);
      setBulkPlayers([{ number: "", name: "" }]);
      setAddPlayerOpen(false);
      fetchGame();
    } catch (error) {
      toast.error(`Failed to add players. ${addedCount} added before error.`);
      fetchGame();
    }
  };

  const addBulkPlayerRow = () => {
    setBulkPlayers([...bulkPlayers, { number: "", name: "" }]);
  };

  const updateBulkPlayer = (index, field, value) => {
    const updated = [...bulkPlayers];
    updated[index][field] = value;
    setBulkPlayers(updated);
  };

  const removeBulkPlayerRow = (index) => {
    if (bulkPlayers.length > 1) {
      setBulkPlayers(bulkPlayers.filter((_, i) => i !== index));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/games/${id}/boxscore/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boxscore_${game.home_team_name}_vs_${game.away_team_name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  // Get live CSV link for team comparison
  const getCSVLink = () => {
    return `${API}/games/${id}/team-comparison/csv`;
  };

  const copyCSVLink = () => {
    const csvUrl = getCSVLink();
    navigator.clipboard.writeText(csvUrl);
    toast.success("CSV link copied! This link updates live.");
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/live/${game.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openEmbedDialog = () => {
    setEmbedDialogOpen(true);
  };

  const copyEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/${game.share_code}?w=${embedWidth}&h=${embedHeight}`;
    const embedCode = `<iframe src="${embedUrl}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="max-width:100%;" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    toast.success("Embed code copied!");
    setTimeout(() => setEmbedCopied(false), 2000);
    setEmbedDialogOpen(false);
  };

  // Quick team stat handlers - now use team-stats endpoint instead of individual players
  const handleTeamRebound = async (team, type) => {
    const statData = { team, stat_type: type };
    
    // Optimistically update local state
    setGame(prevGame => {
      if (!prevGame) return prevGame;
      const teamKey = `${team}_team_stats`;
      const currentStats = prevGame[teamKey] || {};
      return {
        ...prevGame,
        [teamKey]: {
          ...currentStats,
          [type]: (currentStats[type] || 0) + 1
        }
      };
    });
    
    try {
      await axios.post(`${API}/games/${id}/team-stats`, statData);
      fetchGame(false);
    } catch (error) {
      queuePlay({ type: 'team-stat', data: statData });
      toast.warning("Team rebound saved locally - will sync when online");
    }
  };

  const handleTeamTurnover = async (team) => {
    const statData = { team, stat_type: "turnover" };
    
    // Optimistically update local state
    setGame(prevGame => {
      if (!prevGame) return prevGame;
      const teamKey = `${team}_team_stats`;
      const currentStats = prevGame[teamKey] || {};
      return {
        ...prevGame,
        [teamKey]: {
          ...currentStats,
          turnovers: (currentStats.turnovers || 0) + 1
        }
      };
    });
    
    try {
      await axios.post(`${API}/games/${id}/team-stats`, statData);
      fetchGame(false);
    } catch (error) {
      queuePlay({ type: 'team-stat', data: statData });
      toast.warning("Team turnover saved locally - will sync when online");
    }
  };

  const handleResetStats = async () => {
    setResetting(true);
    try {
      await axios.post(`${API}/games/${id}/reset-stats`);
      toast.success("All stats have been reset to 0");
      fetchGame();
      setLastAction(null);
    } catch (error) {
      toast.error("Failed to reset stats");
    } finally {
      setResetting(false);
      setResetStatsOpen(false);
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setEditPlayerData({
      number: player.player_number,
      name: player.player_name
    });
    setEditPlayerOpen(true);
  };

  const handleSavePlayerEdit = async () => {
    if (!editingPlayer) return;
    
    try {
      await axios.put(`${API}/games/${id}/players/${editingPlayer.id}`, {
        player_number: editPlayerData.number,
        player_name: editPlayerData.name
      });
      toast.success("Player updated");
      setEditPlayerOpen(false);
      setEditingPlayer(null);
      fetchGame();
    } catch (error) {
      toast.error("Failed to update player");
    }
  };

  // Remove player handlers
  const handleRemovePlayer = (player) => {
    setPlayerToRemove(player);
    setRemovePlayerOpen(true);
  };

  const handleConfirmRemovePlayer = async () => {
    if (!playerToRemove) return;
    
    try {
      await axios.delete(`${API}/games/${id}/players/${playerToRemove.id}`);
      toast.success("Player removed");
      setRemovePlayerOpen(false);
      setPlayerToRemove(null);
      fetchGame();
    } catch (error) {
      toast.error("Failed to remove player");
    }
  };

  // Play-by-play management handlers
  const handleDeletePlay = async (playId) => {
    try {
      await axios.delete(`${API}/games/${id}/play-by-play/${playId}`);
      toast.success("Play deleted");
      fetchGame();
    } catch (error) {
      toast.error("Failed to delete play");
    }
  };

  const handleEditPlay = (play) => {
    // Find the player for this play
    const allPlayers = [...(game?.home_player_stats || []), ...(game?.away_player_stats || [])];
    const player = allPlayers.find(p => p.player_number === play.player_number && p.player_name === play.player_name);
    
    setEditingPlay(play);
    setEditPlayData({
      player_id: player?.id || "",
      player_number: play.player_number,
      player_name: play.player_name,
      action: play.action
    });
    setEditPlayOpen(true);
  };

  const handleSavePlayEdit = async () => {
    if (!editingPlay) return;
    
    try {
      await axios.put(`${API}/games/${id}/play-by-play/${editingPlay.id}`, {
        player_id: editPlayData.player_id,
        player_number: editPlayData.player_number,
        player_name: editPlayData.player_name,
        action: editPlayData.action
      });
      toast.success("Play updated");
      setEditPlayOpen(false);
      setEditingPlay(null);
      fetchGame();
    } catch (error) {
      toast.error("Failed to update play");
    }
  };

  // Available actions for play-by-play editing
  const playActions = [
    "FT Made", "FT Missed", "2PT Made", "2PT Missed", "3PT Made", "3PT Missed",
    "Assist", "Off. Rebound", "Def. Rebound", "Turnover", "Steal", "Block", "Foul"
  ];

  const calculateScore = (team) => {
    return game?.quarter_scores?.[team]?.reduce((a, b) => a + b, 0) || 0;
  };

  const calculateTeamStats = (stats, teamKey) => {
    const playerStats = stats ? stats.reduce((acc, p) => ({
      oreb: acc.oreb + p.offensive_rebounds,
      dreb: acc.dreb + p.defensive_rebounds,
      totalReb: acc.totalReb + p.offensive_rebounds + p.defensive_rebounds,
      turnovers: acc.turnovers + p.turnovers,
      assists: acc.assists + p.assists,
      steals: acc.steals + p.steals,
      blocks: acc.blocks + p.blocks,
      fouls: acc.fouls + p.fouls
    }), { oreb: 0, dreb: 0, totalReb: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 }) : 
    { oreb: 0, dreb: 0, totalReb: 0, turnovers: 0, assists: 0, steals: 0, blocks: 0, fouls: 0 };
    
    // Add team-only stats
    const teamOnlyStats = game?.team_stats?.[teamKey] || { oreb: 0, dreb: 0, turnovers: 0 };
    return {
      oreb: playerStats.oreb + (teamOnlyStats.oreb || 0),
      dreb: playerStats.dreb + (teamOnlyStats.dreb || 0),
      totalReb: playerStats.totalReb + (teamOnlyStats.oreb || 0) + (teamOnlyStats.dreb || 0),
      turnovers: playerStats.turnovers + (teamOnlyStats.turnovers || 0),
      assists: playerStats.assists,
      steals: playerStats.steals,
      blocks: playerStats.blocks,
      fouls: playerStats.fouls
    };
  };

  const getQuarterLabel = (q) => {
    const periodLabelType = game?.period_label;
    
    if (periodLabelType === "Half") {
      // For halves: 1 = "1st Half", 2 = "2nd Half", 3+ = "OT"
      if (q === 1) return "1st Half";
      if (q === 2) return "2nd Half";
      return `OT${q - 2}`;
    }
    
    const label = periodLabelType === "Period" ? "P" : "Q";
    if (q <= 4) return `${label}${q}`;
    return `OT${q - 4}`;
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === "condensed" ? "expanded" : "condensed");
  };

  // Choose which PlayerCard component to use
  const PlayerCard = viewMode === "condensed" ? CondensedPlayerCard : ExpandedPlayerCard;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo-black.png" alt="StatMoose" className="w-12 h-12 animate-pulse mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const homeStats = game.home_player_stats || [];
  const awayStats = game.away_player_stats || [];
  const homeTeamStats = calculateTeamStats(homeStats, "home");
  const awayTeamStats = calculateTeamStats(awayStats, "away");
  const homeShootingStats = calcTeamShootingStats(homeStats);
  const awayShootingStats = calcTeamShootingStats(awayStats);
  const isActive = game.status === "active";
  const playByPlay = game.play_by_play || [];
  
  // Team colors from game data
  const homeColor = game.home_team_color || "#dc2626";
  const awayColor = game.away_team_color || "#7c3aed";
  
  // Determine number of quarters to show
  const homeScores = game.quarter_scores?.home || (game.period_label === "Half" ? [0, 0] : [0, 0, 0, 0]);
  const awayScores = game.quarter_scores?.away || (game.period_label === "Half" ? [0, 0] : [0, 0, 0, 0]);
  const regulationPeriods = game.period_label === "Half" ? 2 : 4;
  const totalQuarters = Math.max(regulationPeriods, homeScores.length, game.current_quarter);

  return (
    <div className={`min-h-screen bg-slate-100 ${demoMode ? 'pt-10' : ''}`} data-testid="live-game-page">
      {/* Demo Mode Bar */}
      {demoMode && <DemoModeBar />}
      
      {/* Shot Modal */}
      <ShotModal
        isOpen={shotModalOpen}
        onClose={() => setShotModalOpen(false)}
        shotType={selectedShotType}
        playerName={selectedPlayer?.player_name}
        onMake={() => handleShotResult(true)}
        onMiss={() => handleShotResult(false)}
        simpleMode={game?.simple_mode}
      />

      {/* Rebound Modal for Classic Mode */}
      <ReboundModal
        isOpen={reboundModalOpen}
        onClose={() => setReboundModalOpen(false)}
        playerName={reboundPlayer?.player_name}
        onOffensive={() => handleReboundResult('offensive')}
        onDefensive={() => handleReboundResult('defensive')}
        onDeadball={() => {
          setReboundModalOpen(false);
          setReboundPlayer(null);
          toast.info("Deadball rebound noted");
        }}
      />
      
      {/* Assist Modal - shown after made 2pt/3pt */}
      <AssistModal
        isOpen={assistModalOpen}
        onClose={() => {
          setAssistModalOpen(false);
          setAssistTeam(null);
          setAssistScorer(null);
        }}
        teammates={(() => {
          // Filter to only players on floor, excluding the scorer
          const onFloor = assistTeam === 'home' 
            ? (game?.home_on_floor || []) 
            : (game?.away_on_floor || []);
          const teamStats = assistTeam === 'home' ? homeStats : awayStats;
          return teamStats.filter(p => onFloor.includes(p.id) && p.id !== assistScorer?.id);
        })()}
        onSelectAssist={handleAssistSelect}
        onNoAssist={() => handleAssistSelect(null)}
        teamColor={assistTeam === 'home' ? homeColor : awayColor}
      />
      
      {/* Post-Miss Rebound Type Modal - shown after missed field goal */}
      <PostMissReboundModal
        isOpen={postMissReboundOpen}
        onClose={() => {
          setPostMissReboundOpen(false);
          setMissedShotTeam(null);
        }}
        onSelectType={handleReboundTypeSelect}
      />
      
      {/* Rebound Player Selection Modal - shown after selecting rebound type */}
      <ReboundPlayerModal
        isOpen={reboundPlayerModalOpen}
        onClose={() => {
          setReboundPlayerModalOpen(false);
          setReboundTypeSelected(null);
          setMissedShotTeam(null);
        }}
        reboundType={reboundTypeSelected}
        players={getReboundPlayers()}
        teamColor={getReboundTeamColor()}
        onSelectPlayer={handleReboundPlayerSelect}
      />

      {/* Side Action Buttons - Flippable with teams */}
      <SideActionButton 
        label={teamsFlipped ? "Away Rebound" : "Home Rebound"} 
        onClick={() => handleTeamRebound(teamsFlipped ? "away" : "home", "dreb")} 
        color={teamsFlipped ? awayColor : homeColor} 
        position="left-0 top-1/4"
        disabled={!isActive}
      />
      <SideActionButton 
        label={teamsFlipped ? "Away Turnover" : "Home Turnover"} 
        onClick={() => handleTeamTurnover(teamsFlipped ? "away" : "home")} 
        color={teamsFlipped ? awayColor : homeColor} 
        position="left-0 top-1/2"
        disabled={!isActive}
      />
      <SideActionButton 
        label={teamsFlipped ? "Home Rebound" : "Away Rebound"} 
        onClick={() => handleTeamRebound(teamsFlipped ? "home" : "away", "dreb")} 
        color={teamsFlipped ? homeColor : awayColor} 
        position="right-0 top-1/4"
        disabled={!isActive}
      />
      <SideActionButton 
        label={teamsFlipped ? "Home Turnover" : "Away Turnover"} 
        onClick={() => handleTeamTurnover(teamsFlipped ? "home" : "away")} 
        color={teamsFlipped ? homeColor : awayColor} 
        position="right-0 top-1/2"
        disabled={!isActive}
      />

      {/* Top Navigation Bar - Title */}
      <header className="bg-[#000000] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")} 
                className="text-white hover:bg-white/10"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <img src="/logo-white.png" alt="StatMoose" className="w-6 h-6 object-contain" />
                <span className="font-bold hidden sm:block">StatMoose</span>
              </div>
            </div>
            
            {/* Game Title - Centered */}
            <div className="text-center">
              <h1 className="text-lg font-bold">
                {game.home_team_name} vs {game.away_team_name}
                {game.note && <span className="font-normal text-white/80"> - {game.note}</span>}
              </h1>
              <p className="text-xs text-white/70">
                {game.status === "active" 
                  ? (game.is_halftime ? "HALF" : `Live - ${getQuarterLabel(game.current_quarter)}`)
                  : "Final"}
              </p>
            </div>
            
            {/* Connection Status */}
            <div className="w-24 flex justify-end">
              <ConnectionStatus 
                isOnline={isOnline}
                pendingCount={pendingCount}
                isSyncing={isSyncing}
                onSync={syncPendingPlays}
              />
            </div>
          </div>
        </div>
        
        {/* Options Bar - Separate Row */}
        <div className="border-t border-white/10 bg-[#1a1a1a]">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* View Toggle Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleViewMode}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="view-toggle-btn"
              >
                {viewMode === "condensed" ? (
                  <>
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Expand
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4 mr-1" />
                    Condense
                  </>
                )}
              </Button>
              
              {/* Flip Teams Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTeamsFlipped(!teamsFlipped)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="flip-teams-btn"
                title="Flip team positions"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                Flip
              </Button>
              
              {lastAction && isActive && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUndo}
                  className="bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                  data-testid="undo-btn"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Undo
                </Button>
              )}
              
              {redoAction && isActive && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRedo}
                  className="bg-green-500 border-green-500 text-white hover:bg-green-600"
                  data-testid="redo-btn"
                >
                  <Redo2 className="w-4 h-4 mr-1" />
                  Redo
                </Button>
              )}
              
              <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block"></div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPlayByPlay(!showPlayByPlay)}
                className="text-white hover:bg-white/10"
                data-testid="play-by-play-btn"
              >
                Play-by-Play
              </Button>
              <Button variant="ghost" size="sm" onClick={copyShareLink} className="text-white hover:bg-white/10" data-testid="share-btn">
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                Share
              </Button>
              {/* Embed - Silver+ feature */}
              {(demoMode || canAccess('embed_widgets')) ? (
                <Button variant="ghost" size="sm" onClick={openEmbedDialog} className="text-white hover:bg-white/10" data-testid="embed-btn">
                  {embedCopied ? <Check className="w-4 h-4 mr-1" /> : <Code className="w-4 h-4 mr-1" />}
                  Embed
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => toast.error(`Embed widgets require ${getRequiredTierFor('embed_widgets')} tier`)} className="text-zinc-500 hover:bg-white/5" data-testid="embed-btn-locked">
                  <Code className="w-4 h-4 mr-1" />
                  Embed 🔒
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="text-white hover:bg-white/10" data-testid="download-pdf-btn">
                <FileDown className="w-4 h-4 mr-1" />
                PDF
              </Button>
              {/* CSV Export - Silver+ feature */}
              {(demoMode || canAccess('csv_export')) ? (
                <Button variant="ghost" size="sm" onClick={copyCSVLink} className="text-white hover:bg-white/10" data-testid="copy-csv-btn">
                  <FileText className="w-4 h-4 mr-1" />
                  CSV Link
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => toast.error(`CSV export requires ${getRequiredTierFor('csv_export')} tier`)} className="text-zinc-500 hover:bg-white/5" data-testid="copy-csv-btn-locked">
                  <FileText className="w-4 h-4 mr-1" />
                  CSV 🔒
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.open(`/jumbotron/${game.share_code}`, '_blank')} 
                className="text-white hover:bg-white/10" 
                data-testid="jumbotron-btn"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Jumbotron
              </Button>
              <Button variant="ghost" size="sm" onClick={openNoteDialog} className="text-white hover:bg-white/10" data-testid="note-btn">
                <StickyNote className="w-4 h-4 mr-1" />
                Note
              </Button>
              
              {isActive && (
                <>
                  <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block"></div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setResetStatsOpen(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="reset-stats-btn"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset Stats
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleEndGame} data-testid="end-game-btn">
                    End Game
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Dynamic Layout */}
      <div className={`max-w-7xl mx-auto px-2 sm:px-4 py-4 ml-10 sm:ml-14 mr-10 sm:mr-14 transition-all duration-300`}>
        <div className={`grid grid-cols-1 gap-4 ${showPlayByPlay ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          
          {/* Left Column - Team (flippable) */}
          <div className="order-1 md:order-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Team Logo */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden flex-shrink-0"
                  style={{ borderColor: teamsFlipped ? awayColor : homeColor, backgroundColor: `${teamsFlipped ? awayColor : homeColor}10` }}
                >
                  {(teamsFlipped ? game.away_team_logo : game.home_team_logo) ? (
                    <img src={teamsFlipped ? game.away_team_logo : game.home_team_logo} alt={teamsFlipped ? game.away_team_name : game.home_team_name} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: teamsFlipped ? awayColor : homeColor }}>{(teamsFlipped ? game.away_team_name : game.home_team_name)?.charAt(0)}</span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{teamsFlipped ? game.away_team_name : game.home_team_name}</h2>
              </div>
              {isActive && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAddPlayerTeam(teamsFlipped ? "away" : "home"); setAddPlayerOpen(true); }}
                  data-testid="add-home-player-btn"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Quick Entry Section - Players On Floor */}
            {game?.clock_enabled && (teamsFlipped ? game?.away_on_floor : game?.home_on_floor)?.length > 0 && (
              <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs text-green-700 font-medium mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  On Floor - Quick Entry
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(teamsFlipped ? game?.away_on_floor : game?.home_on_floor).map(playerId => {
                    const player = (teamsFlipped ? awayStats : homeStats).find(p => p.id === playerId);
                    if (!player) return null;
                    return (
                      <div key={playerId} className="flex flex-col items-center">
                        <div className="text-xs font-bold mb-1" style={{ color: teamsFlipped ? awayColor : homeColor }}>
                          #{player.player_number}
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleShotClick(player, 'fg2')}
                            disabled={!isActive}
                            className="px-1.5 py-1 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded font-medium disabled:opacity-50"
                          >
                            2PT
                          </button>
                          <button
                            onClick={() => handleShotClick(player, 'fg3')}
                            disabled={!isActive}
                            className="px-1.5 py-1 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium disabled:opacity-50"
                          >
                            3PT
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className={`space-y-${viewMode === "condensed" ? "1" : "3"}`}>
              {sortByNumber(teamsFlipped ? awayStats : homeStats).map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  teamColor={teamsFlipped ? awayColor : homeColor}
                  onShotClick={handleShotClick}
                  onStatUpdate={handleStatUpdate}
                  onReboundClick={handleReboundClick}
                  onEditPlayer={handleEditPlayer}
                  onRemovePlayer={handleRemovePlayer}
                  disabled={!isActive}
                  clockEnabled={game?.clock_enabled}
                  isOnFloor={((teamsFlipped ? game?.away_on_floor : game?.home_on_floor) || []).includes(player.id)}
                  onToggleFloor={(playerId) => togglePlayerOnFloor(playerId, !teamsFlipped)}
                  canCheckIn={((teamsFlipped ? game?.away_on_floor : game?.home_on_floor) || []).length < 5}
                  simpleMode={game?.simple_mode}
                />
              ))}
              {(teamsFlipped ? awayStats : homeStats).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players in roster
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Scoreboard & Stats */}
          <div className="order-3 md:order-2">
            {/* Scoreboard */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  {/* Home Team Logo */}
                  <div className="flex justify-center mb-2">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 overflow-hidden"
                      style={{ borderColor: homeColor, backgroundColor: `${homeColor}10` }}
                    >
                      {game.home_team_logo ? (
                        <img src={game.home_team_logo} alt={game.home_team_name} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: homeColor }}>{game.home_team_name?.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{game.home_team_name}</p>
                  {/* On Floor Indicator */}
                  {game?.clock_enabled && (
                    <div className="flex justify-center gap-1 mt-1 mb-1">
                      {(game?.home_on_floor || []).map(playerId => {
                        const player = homeStats.find(p => p.id === playerId);
                        return player ? (
                          <span key={playerId} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                            {player.player_number}
                          </span>
                        ) : null;
                      })}
                      {(game?.home_on_floor || []).length === 0 && (
                        <span className="text-[10px] text-slate-400">No players on floor</span>
                      )}
                    </div>
                  )}
                  <p className="text-5xl font-bold" style={{ color: homeColor }} data-testid="home-score">
                    {calculateScore("home")}
                  </p>
                  {/* Timeout Indicators */}
                  <div className="flex justify-center gap-1 mt-2">
                    {Array.from({ length: game?.total_timeouts || 4 }, (_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: i < (game?.home_timeouts_used || 0) ? '#d1d5db' : homeColor
                        }}
                      />
                    ))}
                  </div>
                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs h-7"
                      onClick={() => {
                        setTimeoutTeam("home");
                        setTimeoutDialogOpen(true);
                      }}
                      disabled={(game?.home_timeouts_used || 0) >= (game?.total_timeouts || 4)}
                    >
                      Timeout
                    </Button>
                  )}
                  {/* Bonus Button */}
                  {isActive && (
                    <div className="flex flex-col items-center mt-2">
                      <Button
                        size="sm"
                        variant={game?.home_bonus ? "default" : "outline"}
                        className={`text-xs h-7 ${game?.home_bonus === "double_bonus" ? "bg-red-500 hover:bg-red-600" : game?.home_bonus === "bonus" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`}
                        onClick={() => handleBonusToggle("home")}
                        data-testid="home-bonus-btn"
                      >
                        {game?.home_bonus === "double_bonus" ? "2x Bonus" : game?.home_bonus === "bonus" ? "Bonus" : "Bonus"}
                      </Button>
                      {/* Team fouls indicator - shows opponent fouls that affect this team's bonus */}
                      {game?.bonus_enabled && (
                        <span className="text-[10px] text-slate-500 mt-1">
                          Opp Fouls: {game?.away_team_fouls || 0}/{game?.bonus_fouls || 7}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-4 text-2xl text-slate-300">-</div>
                <div className="text-center flex-1">
                  {/* Away Team Logo */}
                  <div className="flex justify-center mb-2">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2 overflow-hidden"
                      style={{ borderColor: awayColor, backgroundColor: `${awayColor}10` }}
                    >
                      {game.away_team_logo ? (
                        <img src={game.away_team_logo} alt={game.away_team_name} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="text-2xl font-bold" style={{ color: awayColor }}>{game.away_team_name?.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{game.away_team_name}</p>
                  {/* On Floor Indicator */}
                  {game?.clock_enabled && (
                    <div className="flex justify-center gap-1 mt-1 mb-1">
                      {(game?.away_on_floor || []).map(playerId => {
                        const player = awayStats.find(p => p.id === playerId);
                        return player ? (
                          <span key={playerId} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                            {player.player_number}
                          </span>
                        ) : null;
                      })}
                      {(game?.away_on_floor || []).length === 0 && (
                        <span className="text-[10px] text-slate-400">No players on floor</span>
                      )}
                    </div>
                  )}
                  <p className="text-5xl font-bold" style={{ color: awayColor }} data-testid="away-score">
                    {calculateScore("away")}
                  </p>
                  {/* Timeout Indicators */}
                  <div className="flex justify-center gap-1 mt-2">
                    {Array.from({ length: game?.total_timeouts || 4 }, (_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: i < (game?.away_timeouts_used || 0) ? '#d1d5db' : awayColor
                        }}
                      />
                    ))}
                  </div>
                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs h-7"
                      onClick={() => {
                        setTimeoutTeam("away");
                        setTimeoutDialogOpen(true);
                      }}
                      disabled={(game?.away_timeouts_used || 0) >= (game?.total_timeouts || 4)}
                    >
                      Timeout
                    </Button>
                  )}
                  {/* Bonus Button */}
                  {isActive && (
                    <div className="flex flex-col items-center mt-2">
                      <Button
                        size="sm"
                        variant={game?.away_bonus ? "default" : "outline"}
                        className={`text-xs h-7 ${game?.away_bonus === "double_bonus" ? "bg-red-500 hover:bg-red-600" : game?.away_bonus === "bonus" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`}
                        onClick={() => handleBonusToggle("away")}
                        data-testid="away-bonus-btn"
                      >
                        {game?.away_bonus === "double_bonus" ? "2x Bonus" : game?.away_bonus === "bonus" ? "Bonus" : "Bonus"}
                      </Button>
                      {/* Team fouls indicator - shows opponent fouls that affect this team's bonus */}
                      {game?.bonus_enabled && (
                        <span className="text-[10px] text-slate-500 mt-1">
                          Opp Fouls: {game?.home_team_fouls || 0}/{game?.bonus_fouls || 7}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Game Clock */}
              {game?.clock_enabled && (
                <div className="border-t pt-4 mb-4">
                  <p className="text-xs text-center text-muted-foreground mb-2">Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">\</kbd> to start/stop clock</p>
                  <div className="flex items-center justify-center gap-3">
                    {/* Decrease minute */}
                    <button
                      onClick={() => handleAdjustClock(-60)}
                      disabled={clockRunning}
                      className="px-2 py-1 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      -M
                    </button>
                    {/* Decrease second */}
                    <button
                      onClick={() => handleAdjustClock(-1)}
                      disabled={clockRunning}
                      className="px-2 py-1 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      -S
                    </button>
                    
                    {/* Clock Display */}
                    <div className="text-center px-4">
                      <div className="text-4xl font-mono font-bold tracking-wider">
                        {formatClockTime(clockTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {game?.is_halftime ? "HALFTIME" : `${game?.period_label || "Quarter"} ${game.current_quarter}`}
                      </div>
                    </div>
                    
                    {/* Increase second */}
                    <button
                      onClick={() => handleAdjustClock(1)}
                      disabled={clockRunning}
                      className="px-2 py-1 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      +S
                    </button>
                    {/* Increase minute */}
                    <button
                      onClick={() => handleAdjustClock(60)}
                      disabled={clockRunning}
                      className="px-2 py-1 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
                    >
                      +M
                    </button>
                  </div>
                  
                  {/* Clock Controls */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {clockRunning ? (
                      <Button 
                        onClick={handleStopClock} 
                        variant="destructive" 
                        size="sm"
                        className="gap-1"
                      >
                        <Pause className="w-4 h-4" />
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleStartClock} 
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        disabled={!isActive}
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </Button>
                    )}
                    <Button 
                      onClick={handleHalftime}
                      variant={game?.is_halftime ? "default" : "outline"}
                      size="sm"
                      className={`gap-1 ${game?.is_halftime ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      disabled={clockRunning}
                    >
                      <Coffee className="w-4 h-4" />
                      {game?.is_halftime ? "Exit HT" : "HT"}
                    </Button>
                    <Button 
                      onClick={() => setShowPeriodEndDialog(true)} 
                      variant="outline" 
                      size="sm"
                      className="gap-1"
                      disabled={clockRunning}
                    >
                      <SkipForward className="w-4 h-4" />
                      End Period
                    </Button>
                  </div>
                </div>
              )}

              {/* Halftime Control for games without clock */}
              {!game?.clock_enabled && isActive && (
                <div className="border-t pt-4 mb-4">
                  <div className="flex items-center justify-center gap-3">
                    <Button 
                      onClick={handleHalftime}
                      variant={game?.is_halftime ? "default" : "outline"}
                      size="sm"
                      className={`gap-1 ${game?.is_halftime ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                    >
                      <Coffee className="w-4 h-4" />
                      {game?.is_halftime ? "Exit Halftime" : "Halftime"}
                    </Button>
                  </div>
                  {game?.is_halftime && (
                    <p className="text-center text-sm text-muted-foreground mt-2">HALFTIME</p>
                  )}
                </div>
              )}
              
              {/* Period Selection */}
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-muted-foreground mr-2">Period:</span>
                {Array.from({ length: totalQuarters }, (_, i) => i + 1).map(q => (
                  <button
                    key={q}
                    onClick={() => isActive && handleQuarterChange(q)}
                    disabled={!isActive}
                    className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                      game.current_quarter === q 
                        ? "bg-orange-500 text-white" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    } disabled:opacity-50`}
                    data-testid={`quarter-${q}-btn`}
                  >
                    {getQuarterLabel(q)}
                  </button>
                ))}
                {isActive && (
                  <button
                    onClick={handleAddOvertime}
                    className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                    data-testid="add-ot-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quarter by Quarter */}
              <div className="border-t pt-3 overflow-x-auto">
                <div className="grid gap-2 text-xs text-center" style={{ gridTemplateColumns: `auto repeat(${totalQuarters}, 1fr)` }}>
                  <div></div>
                  {Array.from({ length: totalQuarters }, (_, i) => i + 1).map(q => (
                    <div key={q} className="text-muted-foreground">{getQuarterLabel(q)}</div>
                  ))}
                  <div className="text-left font-medium">Home</div>
                  {Array.from({ length: totalQuarters }, (_, i) => (
                    <div key={i} className="font-bold">{homeScores[i] || 0}</div>
                  ))}
                  <div className="text-left font-medium">Away</div>
                  {Array.from({ length: totalQuarters }, (_, i) => (
                    <div key={i} className="font-bold">{awayScores[i] || 0}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold mb-3 text-sm">Team Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2" style={{ color: homeColor }}>{game.home_team_name}</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground">Shooting:</p>
                    <p>FG: {homeShootingStats.fg_made}/{homeShootingStats.fg_att} <span className="font-medium text-foreground">{homeShootingStats.fg_pct}%</span></p>
                    <p>3PT: {homeShootingStats.fg3_made}/{homeShootingStats.fg3_att} <span className="font-medium text-foreground">{homeShootingStats.fg3_pct}%</span></p>
                    <p>FT: {homeShootingStats.ft_made}/{homeShootingStats.ft_att} <span className="font-medium text-foreground">{homeShootingStats.ft_pct}%</span></p>
                    <p className="font-medium text-foreground mt-2">Other Stats:</p>
                    <p>Off. Rebounds: <span className="font-medium text-foreground">{homeTeamStats.oreb}</span></p>
                    <p>Def. Rebounds: <span className="font-medium text-foreground">{homeTeamStats.dreb}</span></p>
                    <p>Total Rebounds: <span className="font-medium text-foreground">{homeTeamStats.totalReb}</span></p>
                    <p>Assists: <span className="font-medium text-foreground">{homeTeamStats.assists}</span></p>
                    <p>Steals: <span className="font-medium text-foreground">{homeTeamStats.steals}</span></p>
                    <p>Blocks: <span className="font-medium text-foreground">{homeTeamStats.blocks}</span></p>
                    <p>Turnovers: <span className="font-medium text-foreground">{homeTeamStats.turnovers}</span></p>
                    <p>Team Fouls: <span className="font-medium text-foreground">{homeTeamStats.fouls}</span></p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2" style={{ color: awayColor }}>{game.away_team_name}</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground">Shooting:</p>
                    <p>FG: {awayShootingStats.fg_made}/{awayShootingStats.fg_att} <span className="font-medium text-foreground">{awayShootingStats.fg_pct}%</span></p>
                    <p>3PT: {awayShootingStats.fg3_made}/{awayShootingStats.fg3_att} <span className="font-medium text-foreground">{awayShootingStats.fg3_pct}%</span></p>
                    <p>FT: {awayShootingStats.ft_made}/{awayShootingStats.ft_att} <span className="font-medium text-foreground">{awayShootingStats.ft_pct}%</span></p>
                    <p className="font-medium text-foreground mt-2">Other Stats:</p>
                    <p>Off. Rebounds: <span className="font-medium text-foreground">{awayTeamStats.oreb}</span></p>
                    <p>Def. Rebounds: <span className="font-medium text-foreground">{awayTeamStats.dreb}</span></p>
                    <p>Total Rebounds: <span className="font-medium text-foreground">{awayTeamStats.totalReb}</span></p>
                    <p>Assists: <span className="font-medium text-foreground">{awayTeamStats.assists}</span></p>
                    <p>Steals: <span className="font-medium text-foreground">{awayTeamStats.steals}</span></p>
                    <p>Blocks: <span className="font-medium text-foreground">{awayTeamStats.blocks}</span></p>
                    <p>Turnovers: <span className="font-medium text-foreground">{awayTeamStats.turnovers}</span></p>
                    <p>Team Fouls: <span className="font-medium text-foreground">{awayTeamStats.fouls}</span></p>
                  </div>
                </div>
              </div>
              
              {/* Game Flow Stats */}
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Lead Chg</p>
                  <p className="text-sm font-bold">{game.game_stats?.lead_changes || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Ties</p>
                  <p className="text-sm font-bold">{game.game_stats?.ties || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase" style={{ color: homeColor }}>Lead</p>
                  <p className="text-sm font-bold" style={{ color: homeColor }}>{game.game_stats?.home_largest_lead || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase" style={{ color: awayColor }}>Lead</p>
                  <p className="text-sm font-bold" style={{ color: awayColor }}>{game.game_stats?.away_largest_lead || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Team (flippable) */}
          <div className="order-2 lg:order-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Team Logo */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 overflow-hidden flex-shrink-0"
                  style={{ borderColor: teamsFlipped ? homeColor : awayColor, backgroundColor: `${teamsFlipped ? homeColor : awayColor}10` }}
                >
                  {(teamsFlipped ? game.home_team_logo : game.away_team_logo) ? (
                    <img src={teamsFlipped ? game.home_team_logo : game.away_team_logo} alt={teamsFlipped ? game.home_team_name : game.away_team_name} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: teamsFlipped ? homeColor : awayColor }}>{(teamsFlipped ? game.home_team_name : game.away_team_name)?.charAt(0)}</span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{teamsFlipped ? game.home_team_name : game.away_team_name}</h2>
              </div>
              {isActive && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAddPlayerTeam(teamsFlipped ? "home" : "away"); setAddPlayerOpen(true); }}
                  data-testid="add-away-player-btn"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Quick Entry Section - Players On Floor */}
            {game?.clock_enabled && (teamsFlipped ? game?.home_on_floor : game?.away_on_floor)?.length > 0 && (
              <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs text-green-700 font-medium mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  On Floor - Quick Entry
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(teamsFlipped ? game?.home_on_floor : game?.away_on_floor).map(playerId => {
                    const player = (teamsFlipped ? homeStats : awayStats).find(p => p.id === playerId);
                    if (!player) return null;
                    return (
                      <div key={playerId} className="flex flex-col items-center">
                        <div className="text-xs font-bold mb-1" style={{ color: teamsFlipped ? homeColor : awayColor }}>
                          #{player.player_number}
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleShotClick(player, 'fg2')}
                            disabled={!isActive}
                            className="px-1.5 py-1 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded font-medium disabled:opacity-50"
                          >
                            2PT
                          </button>
                          <button
                            onClick={() => handleShotClick(player, 'fg3')}
                            disabled={!isActive}
                            className="px-1.5 py-1 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium disabled:opacity-50"
                          >
                            3PT
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className={`space-y-${viewMode === "condensed" ? "1" : "3"}`}>
              {sortByNumber(teamsFlipped ? homeStats : awayStats).map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  teamColor={teamsFlipped ? homeColor : awayColor}
                  onShotClick={handleShotClick}
                  onStatUpdate={handleStatUpdate}
                  onReboundClick={handleReboundClick}
                  onEditPlayer={handleEditPlayer}
                  onRemovePlayer={handleRemovePlayer}
                  disabled={!isActive}
                  clockEnabled={game?.clock_enabled}
                  isOnFloor={((teamsFlipped ? game?.home_on_floor : game?.away_on_floor) || []).includes(player.id)}
                  onToggleFloor={(playerId) => togglePlayerOnFloor(playerId, teamsFlipped)}
                  canCheckIn={((teamsFlipped ? game?.home_on_floor : game?.away_on_floor) || []).length < 5}
                  simpleMode={game?.simple_mode}
                />
              ))}
              {(teamsFlipped ? homeStats : awayStats).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players in roster
                </div>
              )}
            </div>
          </div>

          {/* Play by Play Column - Shows when toggled */}
          {showPlayByPlay && (
            <div className="order-4 lg:order-4 bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300">
              <div className="p-3 border-b flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm">Play-by-Play</h3>
                <button onClick={() => setShowPlayByPlay(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-3 space-y-2">
                  {playByPlay.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">No plays recorded yet</p>
                  ) : (
                    [...playByPlay].reverse().map((play, idx) => {
                      const playTeamColor = play.team === 'home' ? homeColor : awayColor;
                      return (
                        <div 
                          key={play.id || idx} 
                          className="p-2 rounded text-xs border-l-2"
                          style={{ 
                            borderLeftColor: playTeamColor,
                            backgroundColor: `${playTeamColor}10`
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="font-medium">#{play.player_number} {play.player_name}</span>
                              <p className="text-muted-foreground">{play.action}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] text-muted-foreground">{getQuarterLabel(play.quarter)}</span>
                              <p className="font-bold text-xs">{play.home_score}-{play.away_score}</p>
                            </div>
                          </div>
                          {/* Edit and Delete buttons */}
                          {isActive && (
                            <div className="flex gap-1 mt-1 pt-1 border-t border-slate-200">
                              <button
                                onClick={() => handleEditPlay(play)}
                                className="flex-1 px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                              >
                                <Pencil className="w-2.5 h-2.5 inline mr-0.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePlay(play.id)}
                                className="px-2 py-0.5 text-[10px] bg-red-100 hover:bg-red-200 rounded text-red-600"
                                title="Delete play"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Add Player Dialog - Bulk Add Support */}
      <Dialog open={addPlayerOpen} onOpenChange={(open) => {
        setAddPlayerOpen(open);
        if (!open) setBulkPlayers([{ number: "", name: "" }]);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Players to {addPlayerTeam === "home" ? game.home_team_name : game.away_team_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4 max-h-[400px] overflow-y-auto">
            {bulkPlayers.map((player, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="#"
                  value={player.number}
                  onChange={(e) => updateBulkPlayer(index, "number", e.target.value)}
                  className="w-16"
                  data-testid={`new-player-number-${index}`}
                />
                <Input
                  placeholder="Player Name"
                  value={player.name}
                  onChange={(e) => updateBulkPlayer(index, "name", e.target.value)}
                  className="flex-1"
                  data-testid={`new-player-name-${index}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && player.number && player.name) {
                      addBulkPlayerRow();
                    }
                  }}
                />
                {bulkPlayers.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeBulkPlayerRow(index)}
                    className="px-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={addBulkPlayerRow} className="flex-1 gap-1">
              <Plus className="w-4 h-4" /> Add Row
            </Button>
            <Button onClick={handleAddPlayer} className="flex-1" data-testid="confirm-add-player">
              Add {bulkPlayers.filter(p => p.number && p.name).length || ""} Player{bulkPlayers.filter(p => p.number && p.name).length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editPlayerOpen} onOpenChange={setEditPlayerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-number">Jersey Number</Label>
              <Input
                id="edit-number"
                placeholder="#"
                value={editPlayerData.number}
                onChange={(e) => setEditPlayerData({ ...editPlayerData, number: e.target.value })}
                data-testid="edit-player-number"
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Player Name</Label>
              <Input
                id="edit-name"
                placeholder="Player Name"
                value={editPlayerData.name}
                onChange={(e) => setEditPlayerData({ ...editPlayerData, name: e.target.value })}
                data-testid="edit-player-name"
              />
            </div>
            <Button onClick={handleSavePlayerEdit} className="w-full" data-testid="save-player-edit">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Stats Confirmation Dialog */}
      <AlertDialog open={resetStatsOpen} onOpenChange={setResetStatsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Stats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all player statistics to 0, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All scoring (points, free throws, field goals)</li>
                <li>All rebounds (offensive & defensive)</li>
                <li>Assists, steals, blocks, turnovers, fouls</li>
                <li>Quarter scores and play-by-play log</li>
              </ul>
              <p className="mt-3 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetStats}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-reset-stats"
            >
              {resetting ? "Resetting..." : "Reset All Stats"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Period End Dialog */}
      <AlertDialog open={showPeriodEndDialog} onOpenChange={setShowPeriodEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End of {getQuarterLabel(game?.current_quarter || 1)}</AlertDialogTitle>
            <AlertDialogDescription>
              The clock has reached 0:00. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3 border-t border-b my-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={resetFoulsOnAdvance}
                onCheckedChange={setResetFoulsOnAdvance}
                className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <span className="text-sm">Reset team fouls for next period</span>
            </label>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Continue Playing</AlertDialogCancel>
            {((game?.period_label === "Half" && game?.current_quarter === 1) || 
              (game?.period_label !== "Half" && game?.current_quarter === 2)) && (
              <Button
                onClick={handleHalftime}
                variant="outline"
                className="gap-2"
              >
                <Coffee className="w-4 h-4" />
                Halftime
              </Button>
            )}
            <AlertDialogAction
              onClick={() => handleNextPeriod(resetFoulsOnAdvance)}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Next {game?.period_label === "Half" ? "Half" : (game?.period_label || "Quarter")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Halftime Exit Dialog */}
      <AlertDialog open={showHalftimeExitDialog} onOpenChange={setShowHalftimeExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Halftime</AlertDialogTitle>
            <AlertDialogDescription>
              Select which {game?.period_label === "Half" ? "half" : (game?.period_label?.toLowerCase() || "quarter")} to start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-wrap gap-2 py-4 justify-center">
            {Array.from({ length: totalQuarters + 2 }, (_, i) => i + 1).map(q => (
              <Button
                key={q}
                onClick={() => handleExitHalftime(q)}
                variant={q === (game?.period_label === "Half" ? 2 : 3) ? "default" : "outline"}
                className="w-16 h-12"
              >
                {getQuarterLabel(q)}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Timeout Dialog */}
      <AlertDialog open={timeoutDialogOpen} onOpenChange={setTimeoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {timeoutTeam === "home" ? game?.home_team_name : game?.away_team_name} Timeout
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select timeout type
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 py-4 justify-center">
            <Button
              onClick={() => handleTimeout("full")}
              className="flex-1 h-16"
              variant="default"
            >
              Full Timeout
            </Button>
            <Button
              onClick={() => handleTimeout("partial")}
              className="flex-1 h-16"
              variant="outline"
            >
              Partial Timeout
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTimeoutTeam(null)}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="game-note">Add a note about this game</Label>
              <Input
                id="game-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g., Championship Game, Regular Season"
                className="mt-2"
                data-testid="note-input"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Preview: <span className="font-medium">{game?.home_team_name} vs {game?.away_team_name}{noteText && ` - ${noteText}`}</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNote} data-testid="save-note-btn">
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Player Confirmation Dialog */}
      <AlertDialog open={removePlayerOpen} onOpenChange={setRemovePlayerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove #{playerToRemove?.player_number} {playerToRemove?.player_name} from this game? 
              This will also delete their statistics for this game.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlayerToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemovePlayer} className="bg-red-600 hover:bg-red-700">
              Remove Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Play Dialog */}
      <Dialog open={editPlayOpen} onOpenChange={setEditPlayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Play</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Player</Label>
              <Select
                value={editPlayData.player_id}
                onValueChange={(value) => {
                  const allPlayers = [...(game?.home_player_stats || []), ...(game?.away_player_stats || [])];
                  const player = allPlayers.find(p => p.id === value);
                  if (player) {
                    setEditPlayData({
                      ...editPlayData,
                      player_id: value,
                      player_number: player.player_number,
                      player_name: player.player_name
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{game?.home_team_name}</div>
                  {(game?.home_player_stats || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.player_number} {p.player_name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">{game?.away_team_name}</div>
                  {(game?.away_player_stats || []).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.player_number} {p.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action</Label>
              <Select
                value={editPlayData.action}
                onValueChange={(value) => setEditPlayData({ ...editPlayData, action: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {playActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPlayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePlayEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Snippet Generator */}
      <EmbedSnippetGenerator
        open={embedDialogOpen}
        onOpenChange={setEmbedDialogOpen}
        shareCode={game?.share_code || id}
        sport="basketball"
        gameTitle={`${game?.away_team_name || 'Away'} vs ${game?.home_team_name || 'Home'}`}
      />
    </div>
  );
}
