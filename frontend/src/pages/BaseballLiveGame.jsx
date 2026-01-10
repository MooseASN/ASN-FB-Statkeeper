import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronUp, 
  ChevronDown, 
  Share2, 
  FileText,
  RotateCcw,
  Settings,
  Users,
  ArrowLeft,
  Check,
  ArrowLeftRight,
  Undo2,
  MoreVertical,
  Trophy,
  Radio,
  FileDown,
  Flag
} from "lucide-react";
import { X as XIcon } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Defensive positions for baseball
const DEFENSIVE_POSITIONS = [
  { key: 'pitcher', label: 'Pitcher (P)', number: 1 },
  { key: 'catcher', label: 'Catcher (C)', number: 2 },
  { key: 'first', label: 'First Base (1B)', number: 3 },
  { key: 'second', label: 'Second Base (2B)', number: 4 },
  { key: 'third', label: 'Third Base (3B)', number: 5 },
  { key: 'shortstop', label: 'Shortstop (SS)', number: 6 },
  { key: 'left', label: 'Left Field (LF)', number: 7 },
  { key: 'center', label: 'Center Field (CF)', number: 8 },
  { key: 'right', label: 'Right Field (RF)', number: 9 },
];

// Starter Configuration Dialog Component
const StarterConfigDialog = ({ 
  isOpen, 
  onClose, 
  homeRoster, 
  awayRoster, 
  homeTeamName, 
  awayTeamName,
  homeTeamColor,
  awayTeamColor,
  onComplete 
}) => {
  const [step, setStep] = useState(1); // 1: home batting, 2: home defense, 3: away batting, 4: away defense
  const [homeBattingOrder, setHomeBattingOrder] = useState(Array(9).fill(''));
  const [homeDefense, setHomeDefense] = useState({});
  const [awayBattingOrder, setAwayBattingOrder] = useState(Array(9).fill(''));
  const [awayDefense, setAwayDefense] = useState({});
  
  const currentRoster = step <= 2 ? homeRoster : awayRoster;
  const currentTeamName = step <= 2 ? homeTeamName : awayTeamName;
  const currentTeamColor = step <= 2 ? homeTeamColor : awayTeamColor;
  const isBattingStep = step === 1 || step === 3;
  const currentBattingOrder = step <= 2 ? homeBattingOrder : awayBattingOrder;
  const setCurrentBattingOrder = step <= 2 ? setHomeBattingOrder : setAwayBattingOrder;
  const currentDefense = step <= 2 ? homeDefense : awayDefense;
  const setCurrentDefense = step <= 2 ? setHomeDefense : setAwayDefense;
  
  const getStepTitle = () => {
    switch(step) {
      case 1: return `${homeTeamName} - Set Batting Order`;
      case 2: return `${homeTeamName} - Set Defensive Positions`;
      case 3: return `${awayTeamName} - Set Batting Order`;
      case 4: return `${awayTeamName} - Set Defensive Positions`;
      default: return 'Configure Starters';
    }
  };
  
  const getSelectedPlayerIds = () => {
    if (isBattingStep) {
      return currentBattingOrder.filter(id => id);
    } else {
      return Object.values(currentDefense).filter(id => id);
    }
  };
  
  const handleBattingOrderChange = (spotIndex, playerId) => {
    const newOrder = [...currentBattingOrder];
    newOrder[spotIndex] = playerId;
    setCurrentBattingOrder(newOrder);
  };
  
  const handleClearBattingSpot = (spotIndex) => {
    const newOrder = [...currentBattingOrder];
    newOrder[spotIndex] = '';
    setCurrentBattingOrder(newOrder);
  };
  
  const handleDefenseChange = (positionKey, playerId) => {
    setCurrentDefense(prev => ({
      ...prev,
      [positionKey]: playerId
    }));
  };
  
  const handleClearDefensePosition = (positionKey) => {
    setCurrentDefense(prev => {
      const newDefense = { ...prev };
      delete newDefense[positionKey];
      return newDefense;
    });
  };
  
  const canProceed = () => {
    if (isBattingStep) {
      return currentBattingOrder.filter(id => id).length === 9;
    } else {
      return Object.keys(currentDefense).length === 9;
    }
  };
  
  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Complete - build the lineup data
      const buildLineupFromOrder = (order, roster) => {
        return order.map(playerId => {
          const player = roster.find(p => p.player_number === playerId);
          return player || null;
        }).filter(Boolean);
      };
      
      const buildDefenseFromSelections = (defense, roster) => {
        const result = {};
        Object.entries(defense).forEach(([posKey, playerId]) => {
          const player = roster.find(p => p.player_number === playerId);
          if (player) {
            result[posKey] = { number: player.player_number, name: player.player_name };
          }
        });
        return result;
      };
      
      onComplete({
        homeBattingOrder: buildLineupFromOrder(homeBattingOrder, homeRoster),
        homeDefense: buildDefenseFromSelections(homeDefense, homeRoster),
        awayBattingOrder: buildLineupFromOrder(awayBattingOrder, awayRoster),
        awayDefense: buildDefenseFromSelections(awayDefense, awayRoster),
      });
    }
  };
  
  const getPlayerById = (playerId) => {
    return currentRoster?.find(p => p.player_number === playerId);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentTeamColor }}
            />
            {getStepTitle()}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-green-500' : 'bg-zinc-700'}`}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Step {step} of 4: {isBattingStep ? 'Select 9 batters in order' : 'Assign players to defensive positions'}
          </p>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {isBattingStep ? (
            // Batting Order Selection
            <div className="grid gap-2">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full text-sm font-bold">
                    {i + 1}
                  </span>
                  <Select
                    value={currentBattingOrder[i] || ''}
                    onValueChange={(value) => handleBattingOrderChange(i, value)}
                  >
                    <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select player..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {currentRoster?.map(player => {
                        const isSelected = getSelectedPlayerIds().includes(player.player_number) && 
                                          currentBattingOrder[i] !== player.player_number;
                        return (
                          <SelectItem 
                            key={player.player_number} 
                            value={player.player_number}
                            disabled={isSelected}
                            className={`text-white ${isSelected ? 'opacity-50' : ''}`}
                          >
                            #{player.player_number} {player.player_name} {player.position ? `(${player.position})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {currentBattingOrder[i] ? (
                    <button 
                      onClick={() => handleClearBattingSpot(i)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded"
                      title="Clear selection"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Defensive Position Selection
            <div className="grid gap-2">
              {DEFENSIVE_POSITIONS.map(pos => (
                <div key={pos.key} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-zinc-300">
                    {pos.label}
                  </span>
                  <Select
                    value={currentDefense[pos.key] || ''}
                    onValueChange={(value) => handleDefenseChange(pos.key, value)}
                  >
                    <SelectTrigger className="flex-1 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select player..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {currentRoster?.map(player => {
                        const isSelected = getSelectedPlayerIds().includes(player.player_number) && 
                                          currentDefense[pos.key] !== player.player_number;
                        return (
                          <SelectItem 
                            key={player.player_number} 
                            value={player.player_number}
                            disabled={isSelected}
                            className={`text-white ${isSelected ? 'opacity-50' : ''}`}
                          >
                            #{player.player_number} {player.player_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {currentDefense[pos.key] ? (
                    <button 
                      onClick={() => handleClearDefensePosition(pos.key)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded"
                      title="Clear selection"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-6 pt-4 border-t border-zinc-700">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {step === 4 ? 'Start Game' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Demo Mode Bar Component
const DemoModeBar = () => (
  <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-2 font-bold text-sm uppercase tracking-wider shadow-lg">
    Demo Mode - Stats will not be saved
  </div>
);

// Ball/Strike/Out Indicator Component - Compact inline version
const CountIndicator = ({ label, count, maxCount, activeColor, inactiveColor = "bg-zinc-600" }) => (
  <div className="flex items-center gap-1">
    <span className="text-[10px] text-zinc-400 uppercase w-4">{label}</span>
    <div className="flex gap-0.5">
      {Array.from({ length: maxCount }).map((_, i) => (
        <div 
          key={i} 
          className={`w-3 h-3 rounded-full ${i < count ? activeColor : inactiveColor}`}
        />
      ))}
    </div>
  </div>
);

// Scoreboard Component - Compact with centered inning + counts
const Scoreboard = ({ game }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      {/* Team Scores with Inning & Count in Center */}
      <div className="flex items-center justify-between">
        {/* Away Team */}
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-6 rounded"
            style={{ backgroundColor: game?.away_team_color || "#3b82f6" }}
          />
          <span className="text-lg font-bold text-white">{game?.away_team_name || "Away"}</span>
          <span className="text-2xl font-bold text-white">{game?.away_score || 0}</span>
        </div>
        
        {/* Center: Inning + Count */}
        <div className="flex flex-col items-center gap-1">
          {/* Inning */}
          <div className="flex items-center gap-2">
            <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent ${game?.inning_half === 'top' ? 'border-b-yellow-500' : 'border-b-zinc-600'}`} />
            <span className="text-xl font-bold text-yellow-500">{game?.current_inning || 1}</span>
            <div className={`w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent ${game?.inning_half === 'bottom' ? 'border-t-yellow-500' : 'border-t-zinc-600'}`} />
          </div>
          {/* B/S/O Count */}
          <div className="flex items-center gap-3">
            <CountIndicator label="B" count={game?.balls || 0} maxCount={4} activeColor="bg-green-500" />
            <CountIndicator label="S" count={game?.strikes || 0} maxCount={3} activeColor="bg-red-500" />
            <CountIndicator label="O" count={game?.outs || 0} maxCount={3} activeColor="bg-yellow-500" />
          </div>
        </div>
        
        {/* Home Team */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white">{game?.home_score || 0}</span>
          <span className="text-lg font-bold text-white">{game?.home_team_name || "Home"}</span>
          <div 
            className="w-3 h-6 rounded"
            style={{ backgroundColor: game?.home_team_color || "#f97316" }}
          />
        </div>
      </div>
    </div>
  );
};

// Current Batter/Pitcher Info Component
const CurrentPlayerInfo = ({ batter, pitcher, batterStats, pitcherStats }) => (
  <div className="flex gap-2">
    {/* At Bat */}
    <div className="flex-1 bg-blue-600 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-blue-200 uppercase">At Bat</span>
          <div className="text-white text-sm font-bold truncate">
            #{batter?.player_number || "?"} {batter?.player_name || "No Batter"}
          </div>
        </div>
        <div className="text-right text-xs text-blue-100">
          <div>{batterStats?.hits || 0}-{batterStats?.at_bats || 0}</div>
          <div>{batterStats?.strikeouts_batting || 0} K</div>
        </div>
      </div>
    </div>
    
    {/* Pitching */}
    <div className="flex-1 bg-red-600 rounded-lg p-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-red-200 uppercase">Pitching</span>
          <div className="text-white text-sm font-bold truncate">
            #{pitcher?.player_number || "?"} {pitcher?.player_name || "No Pitcher"}
          </div>
        </div>
        <div className="text-right text-xs text-red-100">
          <div>{pitcherStats?.pitches_thrown || 0} P</div>
          <div>{pitcherStats?.strikeouts_pitching || 0} K</div>
        </div>
      </div>
    </div>
  </div>
);

// Helper function to format player name as "F. LastName"
const formatPlayerName = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return `${firstName.charAt(0)}. ${lastName}`;
};

// Baseball Diamond Component - Using provided field image
const BaseballDiamond = ({ bases, fieldingPositions, fieldingTeamColor, battingTeamColor, onRunnerClick }) => {
  // Position labels with coordinates - outfielders positioned per user reference image
  const positions = {
    pitcher: { top: '55%', left: '50%', label: 'P' },
    catcher: { top: '88%', left: '50%', label: 'C' },
    first: { top: '55%', left: '72%', label: '1B' },
    second: { top: '42%', left: '58%', label: '2B' },
    third: { top: '55%', left: '28%', label: '3B' },
    shortstop: { top: '42%', left: '42%', label: 'SS' },
    left: { top: '24%', left: '18%', label: 'LF' },      // Updated per reference
    center: { top: '6%', left: '50%', label: 'CF' },     // Updated per reference  
    right: { top: '24%', left: '82%', label: 'RF' },     // Updated per reference
  };
  
  // Base positions for highlighting runners
  const basePositions = {
    first: { top: '55%', left: '68%' },
    second: { top: '35%', left: '50%' },
    third: { top: '55%', left: '32%' },
  };
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Baseball field image */}
      <img 
        src="https://customer-assets.emergentagent.com/job_baseball-tracker-2/artifacts/xsmgreca_Field.png"
        alt="Baseball Field"
        className="w-full h-auto"
      />
      
      {/* Base runners indicators with player numbers - CLICKABLE */}
      {bases?.first && (
        <button 
          onClick={() => onRunnerClick?.('first', bases.first)}
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
          style={{ 
            top: basePositions.first.top, 
            left: basePositions.first.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
          title="Click to manage runner"
        >
          {typeof bases.first === 'object' ? bases.first.number : (bases.first || '')}
        </button>
      )}
      {bases?.second && (
        <button 
          onClick={() => onRunnerClick?.('second', bases.second)}
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
          style={{ 
            top: basePositions.second.top, 
            left: basePositions.second.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
          title="Click to manage runner"
        >
          {typeof bases.second === 'object' ? bases.second.number : (bases.second || '')}
        </button>
      )}
      {bases?.third && (
        <button 
          onClick={() => onRunnerClick?.('third', bases.third)}
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
          style={{ 
            top: basePositions.third.top, 
            left: basePositions.third.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
          title="Click to manage runner"
        >
          {typeof bases.third === 'object' ? bases.third.number : (bases.third || '')}
        </button>
      )}
      
      {/* Fielding position labels with player names - using team color */}
      {Object.entries(positions).map(([pos, coords]) => {
        const player = fieldingPositions?.[pos];
        return (
          <div 
            key={pos}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ top: coords.top, left: coords.left }}
          >
            <div 
              className="backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap border border-white/30 shadow-lg"
              style={{ backgroundColor: fieldingTeamColor ? `${fieldingTeamColor}cc` : 'rgba(0,0,0,0.8)' }}
            >
              {player ? (
                <span className="font-medium">#{player.number}</span>
              ) : (
                <span className="opacity-80">{coords.label}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Base Runner Action Modal
const BaseRunnerModal = ({ isOpen, onClose, runner, currentBase, onAction }) => {
  if (!isOpen || !runner) return null;
  
  const runnerNumber = typeof runner === 'object' ? runner.number : runner;
  const runnerName = typeof runner === 'object' ? runner.name : `#${runner}`;
  
  const getAvailableBases = () => {
    const bases = [];
    if (currentBase !== 'first') bases.push({ value: 'first', label: '1st Base' });
    if (currentBase !== 'second') bases.push({ value: 'second', label: '2nd Base' });
    if (currentBase !== 'third') bases.push({ value: 'third', label: '3rd Base' });
    return bases;
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">
          Runner: #{runnerNumber}
        </h2>
        <p className="text-zinc-400 text-sm mb-4">Currently on {currentBase} base</p>
        
        <div className="space-y-2">
          <Button 
            onClick={() => onAction('steal')}
            className="w-full bg-green-700 hover:bg-green-600 text-white py-2"
          >
            🏃 Steal Base (Advance + SB)
          </Button>
          <Button 
            onClick={() => onAction('caught_stealing')}
            className="w-full bg-red-700 hover:bg-red-600 text-white py-2"
          >
            ❌ Caught Stealing (Out)
          </Button>
          <Button 
            onClick={() => onAction('picked_off')}
            className="w-full bg-red-700 hover:bg-red-600 text-white py-2"
          >
            ⚠️ Picked Off (Out)
          </Button>
          
          <div className="border-t border-zinc-700 my-3 pt-3">
            <p className="text-xs text-zinc-400 mb-2">Move Runner To:</p>
            <div className="flex gap-2">
              {getAvailableBases().map(base => (
                <Button
                  key={base.value}
                  onClick={() => onAction('move', base.value)}
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  {base.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <Button onClick={onClose} variant="outline" className="w-full mt-4 text-zinc-400">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Game Control Modal Component
const GameControlModal = ({ 
  isOpen, 
  onClose, 
  game, 
  homeRoster, 
  awayRoster,
  onFinalize,
  onLiveOutput,
  onPdfExport
}) => {
  const [showFinalize, setShowFinalize] = useState(false);
  const [winningPitcher, setWinningPitcher] = useState('');
  const [losingPitcher, setLosingPitcher] = useState('');
  const [savingPitcher, setSavingPitcher] = useState('');
  
  if (!isOpen) return null;
  
  const homeScore = game?.home_score || 0;
  const awayScore = game?.away_score || 0;
  const homeIsWinning = homeScore >= awayScore;
  
  const winningTeamRoster = homeIsWinning ? homeRoster : awayRoster;
  const losingTeamRoster = homeIsWinning ? awayRoster : homeRoster;
  const winningTeamName = homeIsWinning ? game?.home_team_name : game?.away_team_name;
  const losingTeamName = homeIsWinning ? game?.away_team_name : game?.home_team_name;
  
  const canEndGame = winningPitcher && losingPitcher && savingPitcher;
  
  const handleEndGame = () => {
    onFinalize({
      winningPitcher,
      losingPitcher,
      savingPitcher: savingPitcher === 'no_save' ? null : savingPitcher,
      finalScore: { home: homeScore, away: awayScore }
    });
    setShowFinalize(false);
    onClose();
  };
  
  const resetFinalize = () => {
    setShowFinalize(false);
    setWinningPitcher('');
    setLosingPitcher('');
    setSavingPitcher('');
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Game Controls
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {!showFinalize ? (
          <div className="space-y-2">
            {/* Live Stat Output */}
            <Button 
              onClick={() => {
                onLiveOutput?.();
                toast.info("Live stat output coming soon!");
              }}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-3 justify-start"
            >
              <Radio className="w-4 h-4 mr-3" />
              Live Stat Output
              <span className="ml-auto text-xs text-green-300">(Coming Soon)</span>
            </Button>
            
            {/* PDF Box Score */}
            <Button 
              onClick={() => {
                onPdfExport?.();
                toast.info("PDF box score coming soon!");
              }}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 justify-start"
            >
              <FileDown className="w-4 h-4 mr-3" />
              PDF Box Score
              <span className="ml-auto text-xs text-blue-300">(Coming Soon)</span>
            </Button>
            
            {/* Finalize Game */}
            <Button 
              onClick={() => setShowFinalize(true)}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white py-3 justify-start"
            >
              <Flag className="w-4 h-4 mr-3" />
              Finalize Game
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-800 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Current Score:</span>
                <span className="text-white font-bold">
                  {game?.away_team_name} {awayScore} - {homeScore} {game?.home_team_name}
                </span>
              </div>
            </div>
            
            {/* Winning Pitcher */}
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Winning Pitcher ({winningTeamName})
              </label>
              <Select value={winningPitcher} onValueChange={setWinningPitcher}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select winning pitcher..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {winningTeamRoster?.map(p => (
                    <SelectItem key={p.player_number || p.number} value={p.player_number || p.number} className="text-white">
                      #{p.player_number || p.number} {p.player_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Losing Pitcher */}
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Losing Pitcher ({losingTeamName})
              </label>
              <Select value={losingPitcher} onValueChange={setLosingPitcher}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select losing pitcher..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {losingTeamRoster?.map(p => (
                    <SelectItem key={p.player_number || p.number} value={p.player_number || p.number} className="text-white">
                      #{p.player_number || p.number} {p.player_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Saving Pitcher */}
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Saving Pitcher ({winningTeamName})
              </label>
              <Select value={savingPitcher} onValueChange={setSavingPitcher}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select saving pitcher..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="no_save" className="text-zinc-400">
                    No Save
                  </SelectItem>
                  {winningTeamRoster?.filter(p => (p.player_number || p.number) !== winningPitcher).map(p => (
                    <SelectItem key={p.player_number || p.number} value={p.player_number || p.number} className="text-white">
                      #{p.player_number || p.number} {p.player_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* End Game Button - only visible when all selections made */}
            {canEndGame && (
              <Button 
                onClick={handleEndGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 font-bold"
              >
                <Trophy className="w-4 h-4 mr-2" />
                End Game - Mark as FINAL
              </Button>
            )}
            
            <Button 
              onClick={resetFinalize}
              variant="outline"
              className="w-full text-zinc-400"
            >
              Back to Controls
            </Button>
          </div>
        )}
        
        {!showFinalize && (
          <Button onClick={onClose} variant="outline" className="w-full mt-4 text-zinc-400">
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

// Game Control Modal - For changing inning and score
const InningScoreControlModal = ({ isOpen, onClose, game, onUpdate }) => {
  const [inning, setInning] = useState(game?.current_inning || 1);
  const [inningHalf, setInningHalf] = useState(game?.inning_half || 'top');
  const [homeScore, setHomeScore] = useState(game?.home_score || 0);
  const [awayScore, setAwayScore] = useState(game?.away_score || 0);
  
  // Update local state when game changes
  useEffect(() => {
    if (game) {
      setInning(game.current_inning || 1);
      setInningHalf(game.inning_half || 'top');
      setHomeScore(game.home_score || 0);
      setAwayScore(game.away_score || 0);
    }
  }, [game]);
  
  if (!isOpen) return null;
  
  const handleApply = () => {
    onUpdate({
      current_inning: inning,
      inning_half: inningHalf,
      home_score: homeScore,
      away_score: awayScore,
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Game Control
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Inning Control */}
        <div className="mb-4">
          <label className="text-sm text-zinc-400 mb-2 block">Inning</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInning(Math.max(1, inning - 1))}
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              <span className="text-2xl font-bold text-white w-8 text-center">{inning}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInning(inning + 1)}
                className="w-8 h-8 p-0"
              >
                +
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={inningHalf === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInningHalf('top')}
                className={inningHalf === 'top' ? 'bg-amber-600' : ''}
              >
                ▲ Top
              </Button>
              <Button
                variant={inningHalf === 'bottom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInningHalf('bottom')}
                className={inningHalf === 'bottom' ? 'bg-amber-600' : ''}
              >
                ▼ Bottom
              </Button>
            </div>
          </div>
        </div>
        
        {/* Score Control */}
        <div className="space-y-3">
          <label className="text-sm text-zinc-400 block">Score</label>
          
          {/* Away Team */}
          <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-6 rounded"
                style={{ backgroundColor: game?.away_team_color || '#3b82f6' }}
              />
              <span className="text-white font-medium">{game?.away_team_name || 'Away'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              <span className="text-2xl font-bold text-white w-10 text-center">{awayScore}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAwayScore(awayScore + 1)}
                className="w-8 h-8 p-0"
              >
                +
              </Button>
            </div>
          </div>
          
          {/* Home Team */}
          <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-6 rounded"
                style={{ backgroundColor: game?.home_team_color || '#f97316' }}
              />
              <span className="text-white font-medium">{game?.home_team_name || 'Home'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              <span className="text-2xl font-bold text-white w-10 text-center">{homeScore}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHomeScore(homeScore + 1)}
                className="w-8 h-8 p-0"
              >
                +
              </Button>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleApply}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3"
        >
          <Check className="w-4 h-4 mr-2" />
          Apply Changes
        </Button>
        
        <Button onClick={onClose} variant="outline" className="w-full mt-2 text-zinc-400">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Substitution Dialog Component
const SubstitutionDialog = ({ isOpen, onClose, player, roster, onSubstitute }) => {
  const [subType, setSubType] = useState(null); // 'offensive', 'defensive', 'both'
  const [selectedPlayer, setSelectedPlayer] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubstitute = () => {
    if (!selectedPlayer || !subType) return;
    onSubstitute(player, selectedPlayer, subType);
    setSubType(null);
    setSelectedPlayer('');
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">
          Substitute #{player?.player_number} {player?.player_name}
        </h2>
        
        {!subType ? (
          <div className="space-y-3">
            <p className="text-zinc-400 mb-4">What type of substitution?</p>
            <Button 
              onClick={() => setSubType('offensive')}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-3"
            >
              Offensive Only (Batting Order)
            </Button>
            <Button 
              onClick={() => setSubType('defensive')}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3"
            >
              Defensive Only (Field Position)
            </Button>
            <Button 
              onClick={() => setSubType('both')}
              className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3"
            >
              Both (Full Substitution)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-400">
              Select replacement player ({subType === 'offensive' ? 'batting order' : subType === 'defensive' ? 'field position' : 'both'}):
            </p>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select player..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {roster?.filter(p => p.player_number !== player?.player_number).map(p => (
                  <SelectItem key={p.player_number} value={p.player_number} className="text-white">
                    #{p.player_number} {p.player_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSubType(null)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSubstitute} 
                disabled={!selectedPlayer}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
        
        <Button onClick={onClose} variant="outline" className="w-full mt-4 text-zinc-400">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Batting Order Component - Compact version
const BattingOrder = ({ players, currentBatterIndex, onSelectBatter, onSubstitute, teamName, teamColor }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div 
      className="px-3 py-1.5 border-b border-zinc-700 flex justify-between items-center"
      style={{ backgroundColor: teamColor ? `${teamColor}40` : '#27272a' }}
    >
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
        {teamName ? `Batting: ${teamName}` : 'Batting Order'}
      </h3>
    </div>
    <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
      {players?.map((player, index) => (
        <div 
          key={player.id || player.player_number || index}
          className={`flex items-center justify-between px-2 py-1.5 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800 ${
            index === currentBatterIndex ? 'bg-blue-900/50 border-l-2 border-l-blue-500' : ''
          }`}
          onClick={() => onSelectBatter(index)}
        >
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs w-4">{index + 1}.</span>
            <span className="text-white text-xs font-medium">#{player.player_number} {player.player_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 text-xs">
              {player.hits || 0}-{player.at_bats || 0}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSubstitute?.(player);
              }}
              className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
              title="Substitute"
            >
              <ArrowLeftRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Play by Play Log Component - Compact version
const PlayByPlayLog = ({ plays }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="bg-zinc-800 px-3 py-1.5 border-b border-zinc-700">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Play by Play</h3>
    </div>
    <div className="max-h-32 overflow-y-auto p-2">
      {plays?.length > 0 ? (
        plays.slice(0, 10).map((play) => (
          <div key={play.id} className="text-xs text-zinc-300 mb-1 pb-1 border-b border-zinc-800/50">
            <span className="text-zinc-500">{play.inning}</span> {play.description}
          </div>
        ))
      ) : (
        <div className="text-zinc-500 text-center py-2 text-xs">No plays yet</div>
      )}
    </div>
  </div>
);

// Pitch Result Buttons Component - Compact version
const PitchResultButtons = ({ onPitchResult, disabled }) => {
  const pitchButtons = [
    { label: "Ball", type: "ball", color: "bg-green-700 hover:bg-green-600" },
    { label: "Strike (S)", type: "strike_swinging", color: "bg-red-700 hover:bg-red-600" },
    { label: "Strike (L)", type: "strike_looking", color: "bg-red-700 hover:bg-red-600" },
    { label: "Foul", type: "foul", color: "bg-zinc-700 hover:bg-zinc-600" },
    { label: "In Play", type: "in_play", color: "bg-blue-700 hover:bg-blue-600" },
    { label: "HBP", type: "hbp", color: "bg-yellow-700 hover:bg-yellow-600" },
    { label: "IBB", type: "intentional_walk", color: "bg-green-800 hover:bg-green-700" },
  ];
  
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Pitch Result</h3>
      <div className="grid grid-cols-2 gap-1">
        {pitchButtons.slice(0, 4).map((btn) => (
          <Button
            key={btn.type}
            onClick={() => onPitchResult(btn.type)}
            disabled={disabled}
            className={`${btn.color} text-white text-xs font-bold py-2 rounded transition-colors`}
            data-testid={`pitch-${btn.type}`}
          >
            {btn.label}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => onPitchResult("in_play")}
        disabled={disabled}
        className="w-full bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold py-3 rounded transition-colors"
        data-testid="pitch-in_play"
      >
        In Play
      </Button>
      <div className="grid grid-cols-2 gap-1">
        <Button
          onClick={() => onPitchResult("hbp")}
          disabled={disabled}
          className="bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-bold py-2 rounded transition-colors"
          data-testid="pitch-hbp"
        >
          HBP
        </Button>
        <Button
          onClick={() => onPitchResult("intentional_walk")}
          disabled={disabled}
          className="bg-green-800 hover:bg-green-700 text-white text-xs font-bold py-2 rounded transition-colors"
          data-testid="pitch-intentional_walk"
        >
          IBB
        </Button>
      </div>
    </div>
  );
};

// In Play Result Modal
const InPlayModal = ({ isOpen, onClose, onResult }) => {
  if (!isOpen) return null;
  
  const hitTypes = [
    { label: "Single", type: "single", bases: 1 },
    { label: "Double", type: "double", bases: 2 },
    { label: "Triple", type: "triple", bases: 3 },
    { label: "Home Run", type: "home_run", bases: 4 },
  ];
  
  const outTypes = [
    { label: "Ground Out", type: "ground_out" },
    { label: "Fly Out", type: "fly_out" },
    { label: "Line Out", type: "line_out" },
    { label: "Pop Out", type: "pop_out" },
    { label: "Strikeout", type: "strikeout" },
  ];
  
  const otherTypes = [
    { label: "Fielder's Choice", type: "fielders_choice" },
    { label: "Error", type: "error" },
    { label: "Sacrifice Fly", type: "sacrifice_fly" },
    { label: "Sacrifice Bunt", type: "sacrifice_bunt" },
    { label: "Double Play", type: "double_play" },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">In Play Result</h2>
        
        {/* Hits */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Hits</h3>
          <div className="grid grid-cols-2 gap-2">
            {hitTypes.map((hit) => (
              <Button
                key={hit.type}
                onClick={() => onResult(hit.type)}
                className="bg-green-700 hover:bg-green-600 text-white font-bold py-3"
              >
                {hit.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Outs */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Outs</h3>
          <div className="grid grid-cols-2 gap-2">
            {outTypes.map((out) => (
              <Button
                key={out.type}
                onClick={() => onResult(out.type)}
                className="bg-red-700 hover:bg-red-600 text-white font-bold py-3"
              >
                {out.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Other */}
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 uppercase mb-2">Other</h3>
          <div className="grid grid-cols-2 gap-2">
            {otherTypes.map((other) => (
              <Button
                key={other.type}
                onClick={() => onResult(other.type)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3"
              >
                {other.label}
              </Button>
            ))}
          </div>
        </div>
        
        <Button onClick={onClose} variant="outline" className="w-full mt-2">
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Stats Tabs Component
// Team Stats Summary Component - Compact version showing real stats
// Team Stats Summary Component - Shows R, H, E, SO, BB
const TeamStatsSummary = ({ homeStats, awayStats, homeTeamName, awayTeamName, homeErrors = 0, awayErrors = 0 }) => {
  // Calculate team totals
  const calcTotals = (stats) => {
    if (!stats || stats.length === 0) return { runs: 0, hits: 0, strikeouts: 0, walks: 0 };
    return stats.reduce((acc, player) => ({
      runs: acc.runs + (player.runs || 0),
      hits: acc.hits + (player.hits || 0),
      strikeouts: acc.strikeouts + (player.strikeouts_batting || 0),
      walks: acc.walks + (player.walks || 0),
    }), { runs: 0, hits: 0, strikeouts: 0, walks: 0 });
  };
  
  const homeTotals = calcTotals(homeStats);
  const awayTotals = calcTotals(awayStats);
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="bg-zinc-800 px-3 py-1.5 border-b border-zinc-700">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Team Stats</h3>
      </div>
      <div className="p-2 text-xs">
        <div className="grid grid-cols-6 gap-1 text-center text-zinc-400 mb-1">
          <div></div>
          <div>R</div>
          <div>H</div>
          <div>E</div>
          <div>SO</div>
          <div>BB</div>
        </div>
        <div className="grid grid-cols-6 gap-1 text-center text-white mb-1">
          <div className="text-left truncate text-zinc-300">{homeTeamName?.slice(0, 8)}</div>
          <div className="text-green-400 font-bold">{homeTotals.runs}</div>
          <div>{homeTotals.hits}</div>
          <div className="text-red-400">{homeErrors}</div>
          <div>{homeTotals.strikeouts}</div>
          <div>{homeTotals.walks}</div>
        </div>
        <div className="grid grid-cols-6 gap-1 text-center text-white">
          <div className="text-left truncate text-zinc-300">{awayTeamName?.slice(0, 8)}</div>
          <div className="text-green-400 font-bold">{awayTotals.runs}</div>
          <div>{awayTotals.hits}</div>
          <div className="text-red-400">{awayErrors}</div>
          <div>{awayTotals.strikeouts}</div>
          <div>{awayTotals.walks}</div>
        </div>
      </div>
    </div>
  );
};

const StatsTabs = ({ activeTab, onTabChange, homeStats, awayStats }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="flex border-b border-zinc-700">
      {["home", "away", "comparison"].map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === tab 
              ? 'bg-zinc-800 text-white' 
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          {tab === "home" ? "Home Stats" : tab === "away" ? "Away Stats" : "Comparison"}
        </button>
      ))}
    </div>
    <div className="p-4 max-h-48 overflow-y-auto">
      {activeTab === "comparison" ? (
        <div className="text-zinc-500 text-center">Stat comparison coming soon</div>
      ) : (
        <div className="text-zinc-500 text-center">
          {activeTab === "home" ? "Home" : "Away"} team stats
        </div>
      )}
    </div>
  </div>
);

// Main BaseballLiveGame Component
export default function BaseballLiveGame({ demoMode = false, initialDemoData = null }) {
  const params = useParams();
  const id = demoMode ? 'demo' : params.id;
  const navigate = useNavigate();
  
  // Game state
  const [game, setGame] = useState(initialDemoData);
  const [loading, setLoading] = useState(!demoMode);
  const [homeRoster, setHomeRoster] = useState(initialDemoData?.home_roster || []);
  const [awayRoster, setAwayRoster] = useState(initialDemoData?.away_roster || []);
  const [homeStats, setHomeStats] = useState(initialDemoData?.home_player_stats || []);
  const [awayStats, setAwayStats] = useState(initialDemoData?.away_player_stats || []);
  const [playByPlay, setPlayByPlay] = useState([]);
  
  // Ref to prevent duplicate play entries (for React strict mode / double renders)
  const lastPlayIdRef = useRef(null);
  const playCounterRef = useRef(0);
  
  // Starter configuration state
  const [showStarterConfig, setShowStarterConfig] = useState(false);
  const [startersConfigured, setStartersConfigured] = useState(demoMode); // Skip for demo
  const [homeBattingOrder, setHomeBattingOrder] = useState([]);
  const [awayBattingOrder, setAwayBattingOrder] = useState([]);
  const [homeDefense, setHomeDefense] = useState({});
  const [awayDefense, setAwayDefense] = useState({});
  
  // UI state
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);
  const [homeBatterIndex, setHomeBatterIndex] = useState(0);  // Track home team's batter separately
  const [awayBatterIndex, setAwayBatterIndex] = useState(0);  // Track away team's batter separately
  const [currentPitcherIndex, setCurrentPitcherIndex] = useState(0);
  const [showInPlayModal, setShowInPlayModal] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("home");
  
  // Substitution state
  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
  const [playerToSubstitute, setPlayerToSubstitute] = useState(null);
  const [substitutionTeam, setSubstitutionTeam] = useState(null); // 'home' or 'away'
  
  // Base runner management state
  const [showRunnerModal, setShowRunnerModal] = useState(false);
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [selectedRunnerBase, setSelectedRunnerBase] = useState(null);
  
  // Error tracking
  const [homeErrors, setHomeErrors] = useState(0);
  const [awayErrors, setAwayErrors] = useState(0);
  
  // Undo history - stores snapshots of the full game state
  const [undoHistory, setUndoHistory] = useState([]);
  
  // Game control state
  const [showGameControlModal, setShowGameControlModal] = useState(false);
  const [gameFinalized, setGameFinalized] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  
  // Inning/Score control modal state
  const [showInningScoreModal, setShowInningScoreModal] = useState(false);
  
  // Get current batting team's roster and stats (use configured batting order if available)
  const battingTeamIsHome = game?.inning_half === "bottom";
  const battingRoster = battingTeamIsHome 
    ? (homeBattingOrder.length > 0 ? homeBattingOrder : homeRoster)
    : (awayBattingOrder.length > 0 ? awayBattingOrder : awayRoster);
  const battingStats = battingTeamIsHome ? homeStats : awayStats;
  const pitchingRoster = battingTeamIsHome ? awayRoster : homeRoster;
  const pitchingStats = battingTeamIsHome ? awayStats : homeStats;
  
  // Get current fielding team's defense (the team that's NOT batting)
  const currentFieldingDefense = battingTeamIsHome ? awayDefense : homeDefense;
  
  // Get the correct batter index for the current batting team
  const activeBatterIndex = battingTeamIsHome ? homeBatterIndex : awayBatterIndex;
  const setActiveBatterIndex = battingTeamIsHome ? setHomeBatterIndex : setAwayBatterIndex;
  
  // Sync currentBatterIndex with the team-specific index
  useEffect(() => {
    setCurrentBatterIndex(activeBatterIndex);
  }, [activeBatterIndex, battingTeamIsHome]);
  
  const currentBatter = battingRoster[activeBatterIndex];
  const currentBatterStats = battingStats.find(s => s.player_number === currentBatter?.player_number);
  const currentPitcher = currentFieldingDefense?.pitcher 
    ? pitchingRoster.find(p => p.player_number === currentFieldingDefense.pitcher.number) 
    : pitchingRoster[currentPitcherIndex];
  const currentPitcherStats = pitchingStats.find(s => s.player_number === currentPitcher?.player_number);
  
  // Fetch game data
  const fetchGame = useCallback(async () => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/games/${id}`);
      setGame(res.data);
      setHomeRoster(res.data.home_roster || []);
      setAwayRoster(res.data.away_roster || []);
      setHomeStats(res.data.home_player_stats || []);
      setAwayStats(res.data.away_player_stats || []);
      setPlayByPlay(res.data.play_by_play || []);
    } catch (error) {
      toast.error("Failed to load game");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, demoMode]);
  
  // Save game state to backend
  const saveGame = useCallback(async (updatedGame) => {
    if (demoMode) return; // Don't save in demo mode
    
    try {
      await axios.put(`${API}/games/${id}`, {
        home_score: updatedGame.home_score,
        away_score: updatedGame.away_score,
        current_inning: updatedGame.current_inning,
        inning_half: updatedGame.inning_half,
        balls: updatedGame.balls,
        strikes: updatedGame.strikes,
        outs: updatedGame.outs,
        bases: updatedGame.bases,
        inning_scores: updatedGame.inning_scores,
        home_player_stats: homeStats,
        away_player_stats: awayStats,
        play_by_play: playByPlay
      });
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  }, [id, demoMode, homeStats, awayStats, playByPlay]);
  
  useEffect(() => {
    if (!demoMode) {
      fetchGame();
    } else {
      setLoading(false);
    }
    document.title = "StatMoose BB";
  }, [id, demoMode, fetchGame]);
  
  // Show starter config after game loads (if not already configured and has rosters)
  useEffect(() => {
    if (!loading && game && !startersConfigured && !demoMode && homeRoster.length > 0 && awayRoster.length > 0) {
      setShowStarterConfig(true);
    }
  }, [loading, game, startersConfigured, demoMode, homeRoster.length, awayRoster.length]);
  
  // Handle starter configuration completion
  const handleStarterConfigComplete = (config) => {
    setHomeBattingOrder(config.homeBattingOrder);
    setAwayBattingOrder(config.awayBattingOrder);
    setHomeDefense(config.homeDefense);
    setAwayDefense(config.awayDefense);
    setStartersConfigured(true);
    setShowStarterConfig(false);
    toast.success("Starters configured! Game is ready.");
  };
  
  // Helper function to add a play to the log (with deduplication)
  const addPlay = useCallback((inning, inningHalf, description) => {
    playCounterRef.current += 1;
    const playId = `play_${Date.now()}_${playCounterRef.current}`;
    
    // Prevent duplicate plays (e.g., from React strict mode double renders)
    if (lastPlayIdRef.current === description) {
      return;
    }
    lastPlayIdRef.current = description;
    
    setPlayByPlay(plays => [{
      id: playId,
      inning: `${inning}${inningHalf === 'top' ? '▲' : '▼'}`,
      description,
      timestamp: new Date().toISOString()
    }, ...plays]);
    
    // Reset the duplicate check after a short delay
    setTimeout(() => {
      lastPlayIdRef.current = null;
    }, 100);
  }, []);
  
  // Save current state for undo functionality
  const saveStateForUndo = useCallback(() => {
    const snapshot = {
      game: game ? JSON.parse(JSON.stringify(game)) : null,
      homeStats: JSON.parse(JSON.stringify(homeStats)),
      awayStats: JSON.parse(JSON.stringify(awayStats)),
      playByPlay: JSON.parse(JSON.stringify(playByPlay)),
      currentBatterIndex,
      homeBattingOrder: JSON.parse(JSON.stringify(homeBattingOrder)),
      awayBattingOrder: JSON.parse(JSON.stringify(awayBattingOrder)),
      homeDefense: JSON.parse(JSON.stringify(homeDefense)),
      awayDefense: JSON.parse(JSON.stringify(awayDefense)),
      homeErrors,
      awayErrors,
    };
    setUndoHistory(prev => [...prev.slice(-19), snapshot]); // Keep last 20 states
  }, [game, homeStats, awayStats, playByPlay, currentBatterIndex, homeBattingOrder, awayBattingOrder, homeDefense, awayDefense, homeErrors, awayErrors]);
  
  // Handle undo - restore the previous state
  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) {
      toast.error("Nothing to undo");
      return;
    }
    
    const lastState = undoHistory[undoHistory.length - 1];
    
    // Restore all state
    setGame(lastState.game);
    setHomeStats(lastState.homeStats);
    setAwayStats(lastState.awayStats);
    setPlayByPlay(lastState.playByPlay);
    setCurrentBatterIndex(lastState.currentBatterIndex);
    setHomeBattingOrder(lastState.homeBattingOrder);
    setAwayBattingOrder(lastState.awayBattingOrder);
    setHomeDefense(lastState.homeDefense);
    setAwayDefense(lastState.awayDefense);
    setHomeErrors(lastState.homeErrors);
    setAwayErrors(lastState.awayErrors);
    
    // Remove the used state from history
    setUndoHistory(prev => prev.slice(0, -1));
    
    toast.success("Play undone");
  }, [undoHistory]);
  
  // Helper function to update batter stats
  const updateBatterStats = useCallback((playerNumber, updates) => {
    const isHomeBatter = battingTeamIsHome;
    const setStats = isHomeBatter ? setHomeStats : setAwayStats;
    
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
  }, [battingTeamIsHome]);
  
  // Helper function to update pitcher stats
  const updatePitcherStats = useCallback((playerNumber, updates) => {
    const isPitchingHome = !battingTeamIsHome;
    const setStats = isPitchingHome ? setHomeStats : setAwayStats;
    
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
  }, [battingTeamIsHome]);
  
  // Helper function to advance base runners
  const advanceRunners = useCallback((hitType, batterNumber, batterName) => {
    setGame(prev => {
      if (!prev) return prev;
      
      let newBases = { ...prev.bases } || {};
      let runsScored = 0;
      
      // Get batter info for base
      const batterInfo = { number: batterNumber, name: batterName };
      
      switch (hitType) {
        case 'single':
          // Runner on 3rd scores
          if (newBases.third) runsScored++;
          // Runner on 2nd goes to 3rd (or scores on single to outfield)
          newBases.third = newBases.second || null;
          // Runner on 1st goes to 2nd
          newBases.second = newBases.first || null;
          // Batter to 1st
          newBases.first = batterInfo;
          break;
          
        case 'double':
          // Runner on 3rd scores
          if (newBases.third) runsScored++;
          // Runner on 2nd scores
          if (newBases.second) runsScored++;
          // Runner on 1st goes to 3rd
          newBases.third = newBases.first || null;
          // Batter to 2nd
          newBases.second = batterInfo;
          newBases.first = null;
          break;
          
        case 'triple':
          // All runners score
          if (newBases.third) runsScored++;
          if (newBases.second) runsScored++;
          if (newBases.first) runsScored++;
          // Batter to 3rd
          newBases.third = batterInfo;
          newBases.second = null;
          newBases.first = null;
          break;
          
        case 'home_run':
          // All runners score + batter
          if (newBases.third) runsScored++;
          if (newBases.second) runsScored++;
          if (newBases.first) runsScored++;
          runsScored++; // Batter scores
          // Clear bases
          newBases = { first: null, second: null, third: null };
          break;
          
        case 'walk':
        case 'hbp':
          // Force runners if bases loaded
          if (newBases.first && newBases.second && newBases.third) {
            runsScored++; // Runner on 3rd scores
          }
          if (newBases.first && newBases.second) {
            newBases.third = newBases.second;
          }
          if (newBases.first) {
            newBases.second = newBases.first;
          }
          newBases.first = batterInfo;
          break;
          
        case 'out':
          // Don't change bases on out (unless it's an inning-ending out)
          break;
          
        default:
          break;
      }
      
      // Update score
      const isHomeBatting = prev.inning_half === 'bottom';
      return {
        ...prev,
        bases: newBases,
        home_score: isHomeBatting ? (prev.home_score || 0) + runsScored : prev.home_score,
        away_score: !isHomeBatting ? (prev.away_score || 0) + runsScored : prev.away_score,
      };
    });
  }, []);
  
  // Handle runner click
  const handleRunnerClick = (base, runner) => {
    setSelectedRunner(runner);
    setSelectedRunnerBase(base);
    setShowRunnerModal(true);
  };
  
  // Handle runner action
  const handleRunnerAction = useCallback((action, targetBase = null) => {
    const runner = selectedRunner;
    const currentBase = selectedRunnerBase;
    
    if (!runner || !currentBase) return;
    
    // Save state before making changes
    saveStateForUndo();
    
    const runnerNumber = typeof runner === 'object' ? runner.number : runner;
    
    setGame(prev => {
      if (!prev) return prev;
      
      let newBases = { ...prev.bases };
      let newOuts = prev.outs;
      let runScored = false;
      
      switch (action) {
        case 'steal':
          // Advance runner one base
          if (currentBase === 'first') {
            newBases.second = runner;
            newBases.first = null;
            addPlay(prev.current_inning, prev.inning_half, `Stolen base by #${runnerNumber} (1st to 2nd)`);
          } else if (currentBase === 'second') {
            newBases.third = runner;
            newBases.second = null;
            addPlay(prev.current_inning, prev.inning_half, `Stolen base by #${runnerNumber} (2nd to 3rd)`);
          } else if (currentBase === 'third') {
            // Steal home!
            newBases.third = null;
            runScored = true;
            addPlay(prev.current_inning, prev.inning_half, `STEAL HOME by #${runnerNumber}! Run scores!`);
          }
          // Update stolen base stat
          updateBatterStats(runnerNumber, { stolen_bases: 1 });
          break;
          
        case 'caught_stealing':
          newBases[currentBase] = null;
          newOuts++;
          addPlay(prev.current_inning, prev.inning_half, `Caught stealing - #${runnerNumber} out at ${currentBase === 'first' ? '2nd' : currentBase === 'second' ? '3rd' : 'home'}`);
          updateBatterStats(runnerNumber, { caught_stealing: 1 });
          break;
          
        case 'picked_off':
          newBases[currentBase] = null;
          newOuts++;
          addPlay(prev.current_inning, prev.inning_half, `Picked off - #${runnerNumber} out at ${currentBase}`);
          break;
          
        case 'move':
          if (targetBase) {
            newBases[targetBase] = runner;
            newBases[currentBase] = null;
            addPlay(prev.current_inning, prev.inning_half, `Runner #${runnerNumber} moved from ${currentBase} to ${targetBase}`);
          }
          break;
          
        default:
          break;
      }
      
      // Handle inning end if 3 outs
      let newInningHalf = prev.inning_half;
      let newInning = prev.current_inning;
      if (newOuts >= 3) {
        newOuts = 0;
        newBases = { first: null, second: null, third: null };
        if (newInningHalf === 'top') {
          newInningHalf = 'bottom';
        } else {
          newInningHalf = 'top';
          newInning++;
        }
      }
      
      const isHomeBatting = prev.inning_half === 'bottom';
      return {
        ...prev,
        bases: newBases,
        outs: newOuts,
        inning_half: newInningHalf,
        current_inning: newInning,
        home_score: runScored && isHomeBatting ? (prev.home_score || 0) + 1 : prev.home_score,
        away_score: runScored && !isHomeBatting ? (prev.away_score || 0) + 1 : prev.away_score,
      };
    });
    
    setShowRunnerModal(false);
    setSelectedRunner(null);
    setSelectedRunnerBase(null);
  }, [selectedRunner, selectedRunnerBase, addPlay, updateBatterStats, saveStateForUndo]);
  
  // Handle pitch result
  const handlePitchResult = useCallback((resultType) => {
    if (resultType === "in_play") {
      setShowInPlayModal(true);
      return;
    }
    
    // Save state before making changes
    saveStateForUndo();
    
    // Get current game state for the play description
    const currentGame = game;
    if (!currentGame) return;
    
    let newBalls = currentGame.balls;
    let newStrikes = currentGame.strikes;
    let newOuts = currentGame.outs;
    let newInningHalf = currentGame.inning_half;
    let newInning = currentGame.current_inning;
    let description = "";
    let shouldAdvanceBatter = false;
    let batterStatUpdate = {};
    let pitcherStatUpdate = { pitches_thrown: 1 };
    
    switch (resultType) {
      case "ball":
        newBalls = currentGame.balls + 1;
        if (newBalls >= 4) {
          description = `Walk to #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newBalls = 0;
          newStrikes = 0;
          shouldAdvanceBatter = true;
          batterStatUpdate = { walks: 1, plate_appearances: 1 };
        } else {
          description = `Ball ${newBalls} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        }
        break;
        
      case "strike_swinging":
      case "strike_looking":
        newStrikes = currentGame.strikes + 1;
        if (newStrikes >= 3) {
          description = `Strikeout ${resultType === "strike_swinging" ? "(swinging)" : "(looking)"} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newStrikes = 0;
          newBalls = 0;
          newOuts = currentGame.outs + 1;
          shouldAdvanceBatter = true;
          batterStatUpdate = { strikeouts_batting: 1, at_bats: 1, plate_appearances: 1 };
          pitcherStatUpdate.strikeouts_pitching = 1;
        } else {
          description = `Strike ${newStrikes} (${resultType === "strike_swinging" ? "swinging" : "looking"}) - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        }
        break;
        
      case "foul":
        if (currentGame.strikes < 2) {
          newStrikes = currentGame.strikes + 1;
        }
        description = `Foul ball (${newStrikes}-${newBalls}) - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        break;
        
      case "hbp":
        description = `Hit by pitch - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newBalls = 0;
        newStrikes = 0;
        shouldAdvanceBatter = true;
        batterStatUpdate = { hit_by_pitch: 1, plate_appearances: 1 };
        break;
        
      case "intentional_walk":
        description = `Intentional walk - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newBalls = 0;
        newStrikes = 0;
        shouldAdvanceBatter = true;
        batterStatUpdate = { walks: 1, plate_appearances: 1 };
        break;
        
      default:
        break;
    }
    
    // Check for end of half inning
    if (newOuts >= 3) {
      newOuts = 0;
      newBalls = 0;
      newStrikes = 0;
      if (newInningHalf === "top") {
        newInningHalf = "bottom";
      } else {
        newInningHalf = "top";
        newInning = currentGame.current_inning + 1;
      }
      description += " - Side retired";
      setCurrentBatterIndex(0);
      // Clear bases on inning end
      setGame(prev => ({ ...prev, bases: { first: null, second: null, third: null } }));
    } else if (shouldAdvanceBatter) {
      // Advance base runners for walks and HBP
      if (resultType === "ball" && newBalls === 0) { // Walk occurred
        advanceRunners('walk', currentBatter?.player_number, currentBatter?.player_name);
      } else if (resultType === "hbp" || resultType === "intentional_walk") {
        advanceRunners('walk', currentBatter?.player_number, currentBatter?.player_name);
      }
      setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
    }
    
    // Update stats
    if (currentBatter?.player_number && Object.keys(batterStatUpdate).length > 0) {
      updateBatterStats(currentBatter.player_number, batterStatUpdate);
    }
    if (currentPitcher?.player_number || currentPitcher?.number) {
      updatePitcherStats(currentPitcher.player_number || currentPitcher.number, pitcherStatUpdate);
    }
    
    // Add play to log
    if (description) {
      addPlay(currentGame.current_inning, currentGame.inning_half, description);
    }
    
    // Update game state
    setGame(prev => ({
      ...prev,
      balls: newBalls,
      strikes: newStrikes,
      outs: newOuts,
      inning_half: newInningHalf,
      current_inning: newInning
    }));
  }, [game, currentBatter, currentPitcher, battingRoster.length, addPlay, updateBatterStats, updatePitcherStats, advanceRunners, saveStateForUndo]);
  
  // Handle in-play result
  const handleInPlayResult = useCallback((resultType) => {
    setShowInPlayModal(false);
    
    // Save state before making changes
    saveStateForUndo();
    
    const currentGame = game;
    if (!currentGame) return;
    
    let newOuts = currentGame.outs;
    let newHomeScore = currentGame.home_score || 0;
    let newAwayScore = currentGame.away_score || 0;
    let newInningHalf = currentGame.inning_half;
    let newInning = currentGame.current_inning;
    let description = "";
    let batterStatUpdate = { at_bats: 1, plate_appearances: 1 };
    let pitcherStatUpdate = { pitches_thrown: 1 };
    
    const isHomeTeamBatting = currentGame.inning_half === "bottom";
    
    switch (resultType) {
      case "single":
        description = `Single by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        batterStatUpdate.hits = 1;
        batterStatUpdate.singles = 1;
        advanceRunners('single', currentBatter?.player_number, currentBatter?.player_name);
        break;
      case "double":
        description = `Double by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        batterStatUpdate.hits = 1;
        batterStatUpdate.doubles = 1;
        advanceRunners('double', currentBatter?.player_number, currentBatter?.player_name);
        break;
      case "triple":
        description = `Triple by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        batterStatUpdate.hits = 1;
        batterStatUpdate.triples = 1;
        advanceRunners('triple', currentBatter?.player_number, currentBatter?.player_name);
        break;
      case "home_run":
        description = `HOME RUN by #${currentBatter?.player_number} ${currentBatter?.player_name}!`;
        batterStatUpdate.hits = 1;
        batterStatUpdate.home_runs = 1;
        batterStatUpdate.runs = 1;
        batterStatUpdate.rbis = 1;
        advanceRunners('home_run', currentBatter?.player_number, currentBatter?.player_name);
        // Score is handled by advanceRunners now
        break;
      case "ground_out":
      case "fly_out":
      case "line_out":
      case "pop_out":
        description = `${resultType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 1;
        break;
      case "strikeout":
        description = `Strikeout - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 1;
        batterStatUpdate.strikeouts_batting = 1;
        pitcherStatUpdate.strikeouts_pitching = 1;
        break;
      case "double_play":
        description = `Double play - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 2;
        // Clear a base runner for double play
        setGame(prev => {
          const newBases = { ...prev?.bases };
          if (newBases.first) newBases.first = null;
          else if (newBases.second) newBases.second = null;
          return { ...prev, bases: newBases };
        });
        break;
      case "sacrifice_fly":
        description = `Sacrifice fly - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 1;
        batterStatUpdate.sacrifice_flies = 1;
        batterStatUpdate.at_bats = 0; // Sac fly doesn't count as AB
        // Score runner from 3rd
        if (game?.bases?.third) {
          const isHomeBatting = currentGame.inning_half === 'bottom';
          setGame(prev => ({
            ...prev,
            bases: { ...prev.bases, third: null },
            home_score: isHomeBatting ? (prev.home_score || 0) + 1 : prev.home_score,
            away_score: !isHomeBatting ? (prev.away_score || 0) + 1 : prev.away_score,
          }));
          batterStatUpdate.rbis = 1;
        }
        break;
      case "sacrifice_bunt":
        description = `Sacrifice bunt - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 1;
        batterStatUpdate.sacrifice_bunts = 1;
        batterStatUpdate.at_bats = 0; // Sac bunt doesn't count as AB
        // Advance runners on sac bunt
        setGame(prev => {
          const newBases = { ...prev?.bases };
          if (newBases.second) {
            newBases.third = newBases.second;
            newBases.second = null;
          }
          if (newBases.first) {
            newBases.second = newBases.first;
            newBases.first = null;
          }
          return { ...prev, bases: newBases };
        });
        break;
      case "error":
        description = `Error - #${currentBatter?.player_number} ${currentBatter?.player_name} reaches on error`;
        // Track error for fielding team
        const isHomeBatting = currentGame.inning_half === 'bottom';
        if (isHomeBatting) {
          setAwayErrors(e => e + 1);
        } else {
          setHomeErrors(e => e + 1);
        }
        // Batter reaches first on error
        advanceRunners('single', currentBatter?.player_number, currentBatter?.player_name);
        break;
      case "fielders_choice":
        description = `Fielder's choice - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        // One runner out, batter reaches first
        setGame(prev => {
          const newBases = { ...prev?.bases };
          // Remove lead runner
          if (newBases.third) newBases.third = null;
          else if (newBases.second) newBases.second = null;
          else if (newBases.first) newBases.first = null;
          // Batter to first
          newBases.first = { number: currentBatter?.player_number, name: currentBatter?.player_name };
          return { ...prev, bases: newBases };
        });
        newOuts += 1;
        break;
      default:
        break;
    }
    
    // Check for end of half inning
    if (newOuts >= 3) {
      newOuts = 0;
      if (newInningHalf === "top") {
        newInningHalf = "bottom";
      } else {
        newInningHalf = "top";
        newInning = currentGame.current_inning + 1;
      }
      description += " - Side retired";
      setCurrentBatterIndex(0);
      // Clear bases
      setGame(prev => ({ ...prev, bases: { first: null, second: null, third: null } }));
    } else {
      // Advance batter
      setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
    }
    
    // Update stats
    if (currentBatter?.player_number) {
      updateBatterStats(currentBatter.player_number, batterStatUpdate);
    }
    if (currentPitcher?.player_number || currentPitcher?.number) {
      updatePitcherStats(currentPitcher.player_number || currentPitcher.number, pitcherStatUpdate);
    }
    
    // Add play to log
    if (description) {
      addPlay(currentGame.current_inning, currentGame.inning_half, description);
    }
    
    // Determine if this was a hit type where advanceRunners handles the score
    const isHitType = ['single', 'double', 'triple', 'home_run', 'error'].includes(resultType);
    
    // Update game state - don't overwrite score for hit types (advanceRunners handles it)
    setGame(prev => ({
      ...prev,
      balls: 0,
      strikes: 0,
      outs: newOuts,
      // Only update score for non-hit types (like sacrifice fly)
      ...(isHitType ? {} : { home_score: newHomeScore, away_score: newAwayScore }),
      inning_half: newInningHalf,
      current_inning: newInning
    }));
  }, [game, currentBatter, currentPitcher, battingRoster.length, addPlay, updateBatterStats, updatePitcherStats, advanceRunners, saveStateForUndo]);
  
  // Auto-save game state when it changes (debounced)
  useEffect(() => {
    if (!game || demoMode) return;
    
    const timeoutId = setTimeout(() => {
      saveGame(game);
    }, 1000); // Debounce saves by 1 second
    
    return () => clearTimeout(timeoutId);
  }, [game, demoMode, saveGame]);
  
  // Handle substitution request
  const handleSubstitutionRequest = (player, isHomeTeam) => {
    setPlayerToSubstitute(player);
    setSubstitutionTeam(isHomeTeam ? 'home' : 'away');
    setShowSubstitutionDialog(true);
  };
  
  // Execute substitution
  const executeSubstitution = (oldPlayer, newPlayerNumber, subType) => {
    const isHome = substitutionTeam === 'home';
    const roster = isHome ? homeRoster : awayRoster;
    const newPlayer = roster.find(p => p.player_number === newPlayerNumber);
    
    if (!newPlayer) return;
    
    // Offensive substitution (batting order)
    if (subType === 'offensive' || subType === 'both') {
      if (isHome) {
        setHomeBattingOrder(prev => 
          prev.map(p => p.player_number === oldPlayer.player_number ? { ...newPlayer, hits: 0, at_bats: 0 } : p)
        );
      } else {
        setAwayBattingOrder(prev => 
          prev.map(p => p.player_number === oldPlayer.player_number ? { ...newPlayer, hits: 0, at_bats: 0 } : p)
        );
      }
    }
    
    // Defensive substitution (field position)
    if (subType === 'defensive' || subType === 'both') {
      const updateDefense = (prevDefense) => {
        const newDefense = { ...prevDefense };
        Object.keys(newDefense).forEach(pos => {
          if (newDefense[pos]?.number === oldPlayer.player_number) {
            newDefense[pos] = { number: newPlayer.player_number, name: newPlayer.player_name };
          }
        });
        return newDefense;
      };
      
      if (isHome) {
        setHomeDefense(updateDefense);
      } else {
        setAwayDefense(updateDefense);
      }
    }
    
    // Add substitution to play-by-play
    addPlay(
      game?.current_inning || 1, 
      game?.inning_half || 'top',
      `Substitution: #${newPlayer.player_number} ${newPlayer.player_name} replaces #${oldPlayer.player_number} ${oldPlayer.player_name} (${subType})`
    );
    
    toast.success(`Substitution complete: #${newPlayer.player_number} ${newPlayer.player_name} in for #${oldPlayer.player_number} ${oldPlayer.player_name}`);
  };
  
  // Handle game finalization
  const handleFinalizeGame = async (finalizationData) => {
    setGameResult(finalizationData);
    setGameFinalized(true);
    
    // Update game status
    setGame(prev => ({
      ...prev,
      status: 'final',
      winning_pitcher: finalizationData.winningPitcher,
      losing_pitcher: finalizationData.losingPitcher,
      saving_pitcher: finalizationData.savingPitcher,
    }));
    
    // Add finalization to play-by-play
    addPlay(
      game?.current_inning || 1,
      game?.inning_half || 'top',
      `FINAL: ${game?.away_team_name} ${game?.away_score || 0} - ${game?.home_score || 0} ${game?.home_team_name}`
    );
    
    toast.success("Game finalized! Status: FINAL");
    
    // Save to backend if not demo mode
    if (!demoMode && game?.id) {
      try {
        await axios.put(`${API}/games/${game.id}`, {
          ...game,
          status: 'final',
          winning_pitcher: finalizationData.winningPitcher,
          losing_pitcher: finalizationData.losingPitcher,
          saving_pitcher: finalizationData.savingPitcher,
        });
      } catch (error) {
        console.error("Failed to save finalized game:", error);
      }
    }
  };
  
  // Handle inning/score update
  const handleInningScoreUpdate = (updates) => {
    saveStateForUndo();
    
    setGame(prev => ({
      ...prev,
      ...updates,
    }));
    
    // Reset balls, strikes when inning changes
    if (updates.current_inning !== game?.current_inning || updates.inning_half !== game?.inning_half) {
      setGame(prev => ({
        ...prev,
        balls: 0,
        strikes: 0,
        outs: 0,
        bases: { first: null, second: null, third: null },
      }));
      setCurrentBatterIndex(0);
    }
    
    toast.success("Game updated");
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl animate-bounce">⚾</span>
          <p className="mt-4 text-zinc-400">Loading game...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen bg-black text-white ${demoMode ? 'pt-10' : ''}`}>
      {/* Starter Configuration Dialog */}
      <StarterConfigDialog
        isOpen={showStarterConfig}
        onClose={() => setShowStarterConfig(false)}
        homeRoster={homeRoster.map(p => ({ player_number: p.player_number || p.number, player_name: p.player_name || p.name, position: p.position }))}
        awayRoster={awayRoster.map(p => ({ player_number: p.player_number || p.number, player_name: p.player_name || p.name, position: p.position }))}
        homeTeamName={game?.home_team_name || 'Home'}
        awayTeamName={game?.away_team_name || 'Away'}
        homeTeamColor={game?.home_team_color || '#dc2626'}
        awayTeamColor={game?.away_team_color || '#2563eb'}
        onComplete={handleStarterConfigComplete}
      />
      
      {/* Demo Mode Bar */}
      {demoMode && <DemoModeBar />}
      
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(demoMode ? "/" : "/dashboard")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-2xl">⚾</span>
            <span className="text-lg font-bold">Baseball</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleUndo}
              disabled={undoHistory.length === 0}
              className={`${undoHistory.length > 0 ? 'text-amber-500 hover:text-amber-400' : 'text-zinc-600'}`}
              data-testid="undo-btn"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Undo {undoHistory.length > 0 ? `(${undoHistory.length})` : ''}
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Box Score
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowStarterConfig(true)}
              className="text-zinc-400 hover:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Lineups
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Scoreboard */}
        <Scoreboard game={game} />
        
        {/* Current Batter/Pitcher */}
        <div className="mt-3">
          <CurrentPlayerInfo 
            batter={currentBatter}
            pitcher={currentPitcher}
            batterStats={currentBatterStats}
            pitcherStats={currentPitcherStats}
          />
        </div>
        
        {/* Main Grid - 3 columns: Left (Play-by-play + Batting), Center (Field), Right (Pitch + Stats) */}
        <div className="grid grid-cols-12 gap-3 mt-3">
          {/* Left Column - Play by Play & Batting Order */}
          <div className="col-span-3 space-y-2">
            <PlayByPlayLog plays={playByPlay} />
            <BattingOrder 
              players={battingRoster}
              currentBatterIndex={currentBatterIndex}
              onSelectBatter={setCurrentBatterIndex}
              onSubstitute={(player) => handleSubstitutionRequest(player, battingTeamIsHome)}
              teamName={battingTeamIsHome ? game?.home_team_name : game?.away_team_name}
            />
          </div>
          
          {/* Center - Baseball Diamond */}
          <div className="col-span-6">
            <BaseballDiamond 
              bases={game?.bases}
              fieldingPositions={currentFieldingDefense}
              fieldingTeamColor={battingTeamIsHome ? game?.away_team_color : game?.home_team_color}
              battingTeamColor={battingTeamIsHome ? game?.home_team_color : game?.away_team_color}
              onRunnerClick={handleRunnerClick}
            />
          </div>
          
          {/* Right Column - Pitch Results & Stats */}
          <div className="col-span-3 space-y-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <PitchResultButtons 
                onPitchResult={handlePitchResult}
                disabled={!startersConfigured}
              />
              {!startersConfigured && !demoMode && (
                <p className="text-center text-amber-500 text-xs mt-2">
                  Configure lineups to start
                </p>
              )}
            </div>
            <TeamStatsSummary 
              homeStats={homeStats}
              awayStats={awayStats}
              homeTeamName={game?.home_team_name}
              awayTeamName={game?.away_team_name}
              homeErrors={homeErrors}
              awayErrors={awayErrors}
            />
            
            {/* Game Control Button - for inning/score changes */}
            <Button 
              onClick={() => setShowInningScoreModal(true)}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-2"
              data-testid="game-control-btn"
            >
              <Settings className="w-4 h-4 mr-2" />
              Game Control
            </Button>
            
            {/* Wrap-Up Button - for finalization */}
            <Button 
              onClick={() => setShowGameControlModal(true)}
              className={`w-full ${gameFinalized ? 'bg-green-700 hover:bg-green-600' : 'bg-amber-700 hover:bg-amber-600'} text-white py-2`}
              data-testid="wrap-up-btn"
            >
              <Flag className="w-4 h-4 mr-2" />
              {gameFinalized ? 'Game FINAL' : 'Wrap-Up'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Substitution Dialog */}
      <SubstitutionDialog
        isOpen={showSubstitutionDialog}
        onClose={() => {
          setShowSubstitutionDialog(false);
          setPlayerToSubstitute(null);
          setSubstitutionTeam(null);
        }}
        player={playerToSubstitute}
        roster={substitutionTeam === 'home' ? homeRoster : awayRoster}
        onSubstitute={executeSubstitution}
      />
      
      {/* Inning/Score Control Modal */}
      <InningScoreControlModal
        isOpen={showInningScoreModal}
        onClose={() => setShowInningScoreModal(false)}
        game={game}
        onUpdate={handleInningScoreUpdate}
      />
      
      {/* Wrap-Up Modal (was Game Control Modal) */}
      <GameControlModal
        isOpen={showGameControlModal}
        onClose={() => setShowGameControlModal(false)}
        game={game}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        onFinalize={handleFinalizeGame}
        onLiveOutput={() => {}}
        onPdfExport={() => {}}
      />
      
      {/* Base Runner Modal */}
      <BaseRunnerModal
        isOpen={showRunnerModal}
        onClose={() => {
          setShowRunnerModal(false);
          setSelectedRunner(null);
          setSelectedRunnerBase(null);
        }}
        runner={selectedRunner}
        currentBase={selectedRunnerBase}
        onAction={handleRunnerAction}
      />
      
      {/* In Play Modal */}
      <InPlayModal 
        isOpen={showInPlayModal}
        onClose={() => setShowInPlayModal(false)}
        onResult={handleInPlayResult}
      />
    </div>
  );
}
