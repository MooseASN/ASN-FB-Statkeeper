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
  ArrowLeftRight
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

// Ball/Strike/Out Indicator Component
const CountIndicator = ({ label, count, maxCount, activeColor, inactiveColor = "bg-zinc-700" }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
    <div className="flex gap-1">
      {Array.from({ length: maxCount }).map((_, i) => (
        <div 
          key={i} 
          className={`w-4 h-4 rounded-full ${i < count ? activeColor : inactiveColor}`}
        />
      ))}
    </div>
  </div>
);

// Scoreboard Component
const Scoreboard = ({ game, onInningChange }) => {
  const innings = game?.inning_scores || { home: [], away: [] };
  const totalInnings = game?.total_innings || 9;
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      {/* Team Scores */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-4 h-8 rounded"
            style={{ backgroundColor: game?.away_team_color || "#3b82f6" }}
          />
          <span className="text-xl font-bold text-white">{game?.away_team_name || "Away"}</span>
          <span className="text-3xl font-bold text-white">{game?.away_score || 0}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent ${game?.inning_half === 'top' ? 'border-b-yellow-500' : 'border-b-zinc-600'}`} />
            <span className="text-2xl font-bold text-yellow-500">{game?.current_inning || 1}</span>
            <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent ${game?.inning_half === 'bottom' ? 'border-t-yellow-500' : 'border-t-zinc-600'}`} />
          </div>
          <span className="text-xs text-zinc-500 uppercase">{game?.inning_half === 'top' ? 'Top' : 'Bottom'}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-white">{game?.home_score || 0}</span>
          <span className="text-xl font-bold text-white">{game?.home_team_name || "Home"}</span>
          <div 
            className="w-4 h-8 rounded"
            style={{ backgroundColor: game?.home_team_color || "#f97316" }}
          />
        </div>
      </div>
      
      {/* Count Indicators */}
      <div className="flex justify-center gap-8">
        <CountIndicator label="Balls" count={game?.balls || 0} maxCount={4} activeColor="bg-green-500" />
        <CountIndicator label="Strikes" count={game?.strikes || 0} maxCount={3} activeColor="bg-red-500" />
        <CountIndicator label="Outs" count={game?.outs || 0} maxCount={3} activeColor="bg-yellow-500" />
      </div>
    </div>
  );
};

// Current Batter/Pitcher Info Component
const CurrentPlayerInfo = ({ batter, pitcher, batterStats, pitcherStats }) => (
  <div className="flex gap-4 mb-4">
    {/* At Bat */}
    <div className="flex-1 bg-blue-600 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-blue-200 uppercase">At Bat</span>
          <div className="text-white font-bold">
            #{batter?.player_number || "?"} {batter?.player_name || "No Batter"}
          </div>
        </div>
        <div className="text-right text-sm text-blue-100">
          <div>Today: {batterStats?.hits || 0}-{batterStats?.at_bats || 0}</div>
          <div>{batterStats?.hits || 0} H, {batterStats?.strikeouts_batting || 0} K</div>
        </div>
      </div>
    </div>
    
    {/* Pitching */}
    <div className="flex-1 bg-red-600 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-red-200 uppercase">Pitching</span>
          <div className="text-white font-bold">
            #{pitcher?.player_number || "?"} {pitcher?.player_name || "No Pitcher"}
          </div>
        </div>
        <div className="text-right text-sm text-red-100">
          <div>Today: {pitcherStats?.pitches_thrown || 0} P</div>
          <div>{pitcherStats?.strikeouts_pitching || 0} K, {pitcherStats?.earned_runs || 0} ER</div>
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
const BaseballDiamond = ({ bases, fieldingPositions, fieldingTeamColor, battingTeamColor }) => {
  // Position labels with coordinates - SS is LEFT of 2B, 2B is RIGHT of 2B position
  const positions = {
    pitcher: { top: '52%', left: '50%', label: 'P' },
    catcher: { top: '85%', left: '50%', label: 'C' },
    first: { top: '52%', left: '75%', label: '1B' },
    second: { top: '38%', left: '60%', label: '2B' },  // RIGHT of 2nd base
    third: { top: '52%', left: '25%', label: '3B' },
    shortstop: { top: '38%', left: '40%', label: 'SS' },  // LEFT of 2nd base
    left: { top: '12%', left: '15%', label: 'LF' },
    center: { top: '5%', left: '50%', label: 'CF' },
    right: { top: '12%', left: '85%', label: 'RF' },
  };
  
  // Base positions for highlighting runners
  const basePositions = {
    first: { top: '52%', left: '70%' },
    second: { top: '32%', left: '50%' },
    third: { top: '52%', left: '30%' },
  };
  
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Baseball field image */}
      <img 
        src="https://customer-assets.emergentagent.com/job_baseball-tracker-2/artifacts/xsmgreca_Field.png"
        alt="Baseball Field"
        className="w-full h-auto"
      />
      
      {/* Base runners indicators with player numbers */}
      {bases?.first && (
        <div 
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg animate-pulse text-white text-xs font-bold"
          style={{ 
            top: basePositions.first.top, 
            left: basePositions.first.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
        >
          {typeof bases.first === 'object' ? bases.first.number : (bases.first || '')}
        </div>
      )}
      {bases?.second && (
        <div 
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg animate-pulse text-white text-xs font-bold"
          style={{ 
            top: basePositions.second.top, 
            left: basePositions.second.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
        >
          {typeof bases.second === 'object' ? bases.second.number : (bases.second || '')}
        </div>
      )}
      {bases?.third && (
        <div 
          className="absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg animate-pulse text-white text-xs font-bold"
          style={{ 
            top: basePositions.third.top, 
            left: basePositions.third.left, 
            transform: 'translate(-50%, -50%)',
            backgroundColor: battingTeamColor || '#f59e0b',
            borderColor: 'white'
          }}
        >
          {typeof bases.third === 'object' ? bases.third.number : (bases.third || '')}
        </div>
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

// Batting Order Component
const BattingOrder = ({ players, currentBatterIndex, onSelectBatter }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Batting Order</h3>
    </div>
    <div className="max-h-64 overflow-y-auto">
      {players?.map((player, index) => (
        <div 
          key={player.id || index}
          className={`flex items-center justify-between px-4 py-2 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 ${
            index === currentBatterIndex ? 'bg-blue-900/50 border-l-4 border-l-blue-500' : ''
          }`}
          onClick={() => onSelectBatter(index)}
        >
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 w-4">{index + 1}.</span>
            <span className="text-white font-medium">#{player.player_number} {player.player_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">
              {player.hits || 0}-{player.at_bats || 0}
            </span>
            <div className="flex flex-col">
              <ChevronUp className="w-3 h-3 text-zinc-600" />
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Play by Play Log Component
const PlayByPlayLog = ({ plays }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
    <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Play by Play Log</h3>
    </div>
    <div className="max-h-48 overflow-y-auto p-4">
      {plays?.length > 0 ? (
        plays.map((play) => (
          <div key={play.id} className="text-sm text-zinc-300 mb-2 pb-2 border-b border-zinc-800">
            <span className="text-zinc-500">{play.inning} - </span>
            {play.description}
          </div>
        ))
      ) : (
        <div className="text-zinc-500 text-center py-4">No plays yet</div>
      )}
    </div>
  </div>
);

// Pitch Result Buttons Component
const PitchResultButtons = ({ onPitchResult, disabled }) => {
  const pitchButtons = [
    { label: "Foul Ball", type: "foul", color: "bg-zinc-700 hover:bg-zinc-600" },
    { label: "Swinging Strike", type: "strike_swinging", color: "bg-red-700 hover:bg-red-600" },
    { label: "Looking Strike", type: "strike_looking", color: "bg-red-700 hover:bg-red-600" },
    { label: "Ball", type: "ball", color: "bg-green-700 hover:bg-green-600" },
    { label: "Int. Walk", type: "intentional_walk", color: "bg-green-800 hover:bg-green-700" },
    { label: "Hit By Pitch", type: "hbp", color: "bg-yellow-700 hover:bg-yellow-600" },
    { label: "In Play", type: "in_play", color: "bg-blue-700 hover:bg-blue-600" },
  ];
  
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Pitch Result</h3>
      {pitchButtons.map((btn) => (
        <Button
          key={btn.type}
          onClick={() => onPitchResult(btn.type)}
          disabled={disabled}
          className={`w-full ${btn.color} text-white font-bold py-3 rounded-lg transition-colors`}
          data-testid={`pitch-${btn.type}`}
        >
          {btn.label}
        </Button>
      ))}
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
  const [currentPitcherIndex, setCurrentPitcherIndex] = useState(0);
  const [showInPlayModal, setShowInPlayModal] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("home");
  
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
  
  const currentBatter = battingRoster[currentBatterIndex];
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
  
  // Handle pitch result
  const handlePitchResult = useCallback((resultType) => {
    if (resultType === "in_play") {
      setShowInPlayModal(true);
      return;
    }
    
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
    
    switch (resultType) {
      case "ball":
        newBalls = currentGame.balls + 1;
        if (newBalls >= 4) {
          description = `Walk to #${currentBatter?.player_number} ${currentBatter?.player_name}`;
          newBalls = 0;
          newStrikes = 0;
          shouldAdvanceBatter = true;
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
        break;
        
      case "intentional_walk":
        description = `Intentional walk - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newBalls = 0;
        newStrikes = 0;
        shouldAdvanceBatter = true;
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
    } else if (shouldAdvanceBatter) {
      setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
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
  }, [game, currentBatter, battingRoster.length, addPlay]);
  
  // Handle in-play result
  const handleInPlayResult = useCallback((resultType) => {
    setShowInPlayModal(false);
    
    const currentGame = game;
    if (!currentGame) return;
    
    let newOuts = currentGame.outs;
    let newHomeScore = currentGame.home_score || 0;
    let newAwayScore = currentGame.away_score || 0;
    let newInningHalf = currentGame.inning_half;
    let newInning = currentGame.current_inning;
    let description = "";
    
    const isHomeTeamBatting = currentGame.inning_half === "bottom";
    
    switch (resultType) {
      case "single":
        description = `Single by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        break;
      case "double":
        description = `Double by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        break;
      case "triple":
        description = `Triple by #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        break;
      case "home_run":
        description = `HOME RUN by #${currentBatter?.player_number} ${currentBatter?.player_name}!`;
        if (isHomeTeamBatting) {
          newHomeScore += 1;
        } else {
          newAwayScore += 1;
        }
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
        break;
      case "double_play":
        description = `Double play - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 2;
        break;
      case "sacrifice_fly":
      case "sacrifice_bunt":
        description = `${resultType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
        newOuts += 1;
        break;
      case "error":
        description = `Error - #${currentBatter?.player_number} ${currentBatter?.player_name} reaches on error`;
        break;
      case "fielders_choice":
        description = `Fielder's choice - #${currentBatter?.player_number} ${currentBatter?.player_name}`;
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
    } else {
      // Advance batter
      setCurrentBatterIndex(i => (i + 1) % battingRoster.length);
    }
    
    // Add play to log
    if (description) {
      addPlay(currentGame.current_inning, currentGame.inning_half, description);
    }
    
    // Update game state
    setGame(prev => ({
      ...prev,
      balls: 0,
      strikes: 0,
      outs: newOuts,
      home_score: newHomeScore,
      away_score: newAwayScore,
      inning_half: newInningHalf,
      current_inning: newInning
    }));
  }, [game, currentBatter, battingRoster.length, addPlay]);
  
  // Auto-save game state when it changes (debounced)
  useEffect(() => {
    if (!game || demoMode) return;
    
    const timeoutId = setTimeout(() => {
      saveGame(game);
    }, 1000); // Debounce saves by 1 second
    
    return () => clearTimeout(timeoutId);
  }, [game, demoMode, saveGame]);
  
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
        <div className="mt-4">
          <CurrentPlayerInfo 
            batter={currentBatter}
            pitcher={currentPitcher}
            batterStats={currentBatterStats}
            pitcherStats={currentPitcherStats}
          />
        </div>
        
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4 mt-4">
          {/* Left Column - Play by Play & Batting Order */}
          <div className="col-span-3 space-y-4">
            <PlayByPlayLog plays={playByPlay} />
            <StatsTabs 
              activeTab={activeStatsTab}
              onTabChange={setActiveStatsTab}
              homeStats={homeStats}
              awayStats={awayStats}
            />
          </div>
          
          {/* Center - Batting Order & Diamond */}
          <div className="col-span-6 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Batting: {battingTeamIsHome ? game?.home_team_name : game?.away_team_name}
              </h3>
              <BattingOrder 
                players={battingRoster}
                currentBatterIndex={currentBatterIndex}
                onSelectBatter={setCurrentBatterIndex}
              />
            </div>
            
            <BaseballDiamond 
              bases={game?.bases}
              fieldingPositions={currentFieldingDefense}
            />
          </div>
          
          {/* Right Column - Pitch Results */}
          <div className="col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <PitchResultButtons 
                onPitchResult={handlePitchResult}
                disabled={!startersConfigured}
              />
              {!startersConfigured && !demoMode && (
                <p className="text-center text-amber-500 text-sm mt-2">
                  Configure lineups to start tracking
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* In Play Modal */}
      <InPlayModal 
        isOpen={showInPlayModal}
        onClose={() => setShowInPlayModal(false)}
        onResult={handleInPlayResult}
      />
    </div>
  );
}
