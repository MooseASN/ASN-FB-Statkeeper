import { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Search, AlertTriangle, CheckCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { 
  PENALTY_CATALOG, 
  RULESETS, 
  PENALTY_CATEGORIES,
  searchPenalties, 
  getPenaltyVariant,
  getPenaltyById,
  calculatePenaltyEnforcement,
  CONTEXT_QUESTIONS,
} from '@/data/penaltyCatalog';

/**
 * PenaltyWorkflowDialog - A comprehensive penalty tracking dialog
 * 
 * Features:
 * - Search/fuzzy match by penalty name or alias
 * - Ruleset-aware enforcement (NFHS, NCAA, NAIA)
 * - Context-aware follow-up questions
 * - One question at a time UX
 */
export default function PenaltyWorkflowDialog({
  open,
  onClose,
  onSubmit,
  homeTeamName,
  awayTeamName,
  homeColor,
  awayColor,
  possession, // 'home' or 'away'
  ballPosition,
  down,
  distance,
  homeRoster = [],
  awayRoster = [],
  defaultRuleset = 'NFHS',
}) {
  // Step tracking
  const [step, setStep] = useState(1); // 1: Search, 2: Team, 3: Context Questions, 4: Review
  
  // Penalty selection
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [ruleset, setRuleset] = useState(defaultRuleset);
  
  // Against which team
  const [againstTeam, setAgainstTeam] = useState(null); // 'offense' or 'defense'
  const [playerNumber, setPlayerNumber] = useState('');
  
  // Context questions
  const [currentContextIndex, setCurrentContextIndex] = useState(0);
  const [contextAnswers, setContextAnswers] = useState({});
  
  // Spot of foul input
  const [spotOfFoulInput, setSpotOfFoulInput] = useState(ballPosition);
  
  // Result preview
  const [declined, setDeclined] = useState(false);
  const [offsetting, setOffsetting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSearchInput('');
      setSearchResults([]);
      setSelectedPenalty(null);
      setAgainstTeam(null);
      setPlayerNumber('');
      setCurrentContextIndex(0);
      setContextAnswers({});
      setSpotOfFoulInput(ballPosition);
      setDeclined(false);
      setOffsetting(false);
    }
  }, [open, ballPosition]);

  // Search effect
  useEffect(() => {
    if (searchInput.length >= 2) {
      const results = searchPenalties(searchInput, 8);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchInput]);

  // Get current variant based on ruleset
  const currentVariant = useMemo(() => {
    if (!selectedPenalty) return null;
    return getPenaltyVariant(selectedPenalty, ruleset);
  }, [selectedPenalty, ruleset]);

  // Get required context questions for selected penalty
  const contextQuestions = useMemo(() => {
    if (!selectedPenalty || !selectedPenalty.requires_context) return [];
    return selectedPenalty.requires_context
      .map(id => CONTEXT_QUESTIONS[id.toUpperCase()])
      .filter(Boolean);
  }, [selectedPenalty]);

  // Calculate enforcement preview
  const enforcementResult = useMemo(() => {
    if (!selectedPenalty || !againstTeam || declined || offsetting) return null;
    
    return calculatePenaltyEnforcement(
      selectedPenalty,
      ruleset,
      againstTeam,
      {
        ballPosition,
        spotOfFoul: contextAnswers.spot_of_foul || spotOfFoulInput || ballPosition,
        endOfRun: ballPosition,
        possession,
        down,
        distance,
      }
    );
  }, [selectedPenalty, ruleset, againstTeam, contextAnswers, spotOfFoulInput, ballPosition, possession, down, distance, declined, offsetting]);

  // Handle penalty selection
  const handleSelectPenalty = (penalty) => {
    setSelectedPenalty(penalty);
    setStep(2);
  };

  // Handle team selection
  const handleSelectTeam = (team) => {
    setAgainstTeam(team);
    
    // Check if we need context questions
    if (selectedPenalty && selectedPenalty.requires_context && selectedPenalty.requires_context.length > 0) {
      setStep(3);
      setCurrentContextIndex(0);
    } else {
      setStep(4); // Skip to review
    }
  };

  // Handle context answer
  const handleContextAnswer = (value) => {
    const currentQuestion = contextQuestions[currentContextIndex];
    if (!currentQuestion) return;
    
    setContextAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
    
    // Move to next question or review
    if (currentContextIndex < contextQuestions.length - 1) {
      setCurrentContextIndex(prev => prev + 1);
    } else {
      setStep(4); // Go to review
    }
  };

  // Handle final submission
  const handleSubmit = () => {
    if (!selectedPenalty) return;
    
    const teamAgainst = againstTeam === 'offense' 
      ? (possession === 'home' ? 'home' : 'away')
      : (possession === 'home' ? 'away' : 'home');
    
    const penaltyLog = {
      penalty_id: selectedPenalty.penalty_id,
      display_name: selectedPenalty.display_name,
      ruleset,
      against_team: againstTeam,
      team: teamAgainst,
      player_number: playerNumber || null,
      context: contextAnswers,
      spot_of_foul: contextAnswers.spot_of_foul || spotOfFoulInput,
      yards: declined || offsetting ? 0 : (enforcementResult?.yardsApplied || 0),
      auto_first_down: declined || offsetting ? false : (enforcementResult?.autoFirstDown || false),
      loss_of_down: declined || offsetting ? false : (enforcementResult?.lossOfDown || false),
      disqualification: declined || offsetting ? 'none' : (currentVariant?.disqualification || 'none'),
      declined,
      offsetting,
      raw_user_text: searchInput,
    };
    
    onSubmit(penaltyLog);
  };

  // Render category browser when no search
  const renderCategoryBrowser = () => {
    const categories = Object.entries(PENALTY_CATEGORIES);
    
    return (
      <div className="space-y-3">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Browse by Category</div>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(([key, name]) => {
            const penaltiesInCategory = PENALTY_CATALOG.filter(p => p.category === name);
            return (
              <button
                key={key}
                onClick={() => setSearchInput(name)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-left text-sm"
              >
                <div className="font-medium text-zinc-200">{name}</div>
                <div className="text-xs text-zinc-500">{penaltiesInCategory.length} penalties</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render common penalties quick access
  const renderCommonPenalties = () => {
    const common = [
      'false_start', 'offside', 'holding_offense', 'holding_defense',
      'pass_interference_defensive', 'facemask', 'delay_of_game', 'illegal_motion'
    ];
    
    return (
      <div className="space-y-2">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Common Penalties</div>
        <div className="flex flex-wrap gap-1">
          {common.map(id => {
            const penalty = getPenaltyById(id);
            if (!penalty) return null;
            return (
              <button
                key={id}
                onClick={() => handleSelectPenalty(penalty)}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-300"
              >
                {penalty.display_name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            PENALTY
          </DialogTitle>
          {selectedPenalty && (
            <DialogDescription className="text-zinc-400 text-center">
              {selectedPenalty.display_name}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Ruleset Selector - Always visible */}
        <div className="flex items-center justify-center gap-2 border-b border-zinc-700 pb-3">
          <span className="text-xs text-zinc-500 uppercase">Ruleset:</span>
          {Object.values(RULESETS).map(rs => (
            <button
              key={rs.id}
              onClick={() => setRuleset(rs.id)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                ruleset === rs.id 
                  ? 'bg-red-600 text-white' 
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {rs.shortName}
            </button>
          ))}
        </div>

        {/* Step 1: Search & Select Penalty */}
        {step === 1 && (
          <div className="space-y-4 mt-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search penalty name or abbreviation..."
                className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                autoFocus
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searchResults.map(({ penalty, score, matchType }) => {
                  const variant = getPenaltyVariant(penalty, ruleset);
                  return (
                    <button
                      key={penalty.penalty_id}
                      onClick={() => handleSelectPenalty(penalty)}
                      className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-zinc-200">{penalty.display_name}</div>
                          <div className="text-xs text-zinc-500">{penalty.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-400">
                            {variant?.yards === 'spot' ? 'Spot' : `${variant?.yards} yds`}
                          </div>
                          {variant?.auto_first_down && (
                            <div className="text-xs text-green-400">Auto 1st</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : searchInput.length >= 2 ? (
              <div className="text-center text-zinc-500 py-4">
                No penalties found for "{searchInput}"
              </div>
            ) : (
              <>
                {renderCommonPenalties()}
                <div className="mt-4">
                  {renderCategoryBrowser()}
                </div>
              </>
            )}
            
            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t border-zinc-700">
              <Button
                variant="outline"
                className="flex-1 border-zinc-600"
                onClick={() => {
                  setDeclined(true);
                  setStep(4);
                }}
              >
                Penalty Declined
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-zinc-600"
                onClick={() => {
                  setOffsetting(true);
                  setStep(4);
                }}
              >
                Offsetting Penalties
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Team */}
        {step === 2 && selectedPenalty && (
          <div className="space-y-4 mt-4">
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-red-400">{selectedPenalty.display_name}</div>
              <div className="text-sm text-zinc-500">
                {currentVariant?.yards === 'spot' ? 'Spot foul' : `${currentVariant?.yards} yards`}
                {currentVariant?.auto_first_down && ' • Auto First Down'}
                {currentVariant?.loss_of_down && ' • Loss of Down'}
              </div>
            </div>
            
            <div className="text-sm text-zinc-400 uppercase text-center mb-2">Penalty Against</div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectTeam('offense')}
                className="p-4 rounded-lg border-2 border-zinc-600 hover:border-red-500 transition-all text-center"
                style={{ backgroundColor: (possession === 'home' ? homeColor : awayColor) + '30' }}
              >
                <div className="text-lg font-bold" style={{ color: possession === 'home' ? homeColor : awayColor }}>
                  OFFENSE
                </div>
                <div className="text-sm text-zinc-400">
                  {possession === 'home' ? homeTeamName : awayTeamName}
                </div>
              </button>
              
              <button
                onClick={() => handleSelectTeam('defense')}
                className="p-4 rounded-lg border-2 border-zinc-600 hover:border-red-500 transition-all text-center"
                style={{ backgroundColor: (possession === 'home' ? awayColor : homeColor) + '30' }}
              >
                <div className="text-lg font-bold" style={{ color: possession === 'home' ? awayColor : homeColor }}>
                  DEFENSE
                </div>
                <div className="text-sm text-zinc-400">
                  {possession === 'home' ? awayTeamName : homeTeamName}
                </div>
              </button>
            </div>
            
            {/* Optional Player Number */}
            <div className="mt-4">
              <div className="text-xs text-zinc-500 uppercase mb-2">Player Number (Optional)</div>
              <input
                type="text"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="#"
                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold"
              />
            </div>
            
            <Button
              variant="outline"
              className="w-full border-zinc-600 mt-4"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </div>
        )}

        {/* Step 3: Context Questions */}
        {step === 3 && selectedPenalty && contextQuestions.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="text-center mb-4">
              <div className="text-sm text-zinc-500">
                Question {currentContextIndex + 1} of {contextQuestions.length}
              </div>
            </div>
            
            {contextQuestions[currentContextIndex]?.type === 'yardline' && (
              <div className="space-y-4">
                <div className="text-lg font-medium text-center">
                  {contextQuestions[currentContextIndex].question}
                </div>
                
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => setSpotOfFoulInput(prev => Math.max(0, prev - 5))}
                  >
                    -5
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => setSpotOfFoulInput(prev => Math.max(0, prev - 1))}
                  >
                    -1
                  </Button>
                  <div className="px-4 py-2 bg-zinc-800 rounded text-center min-w-[80px]">
                    <div className="text-xs text-zinc-500">Yard Line</div>
                    <div className="text-2xl font-bold text-red-400">{spotOfFoulInput}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => setSpotOfFoulInput(prev => Math.min(100, prev + 1))}
                  >
                    +1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    onClick={() => setSpotOfFoulInput(prev => Math.min(100, prev + 5))}
                  >
                    +5
                  </Button>
                </div>
                
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => handleContextAnswer(spotOfFoulInput)}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            {contextQuestions[currentContextIndex]?.type === 'boolean' && (
              <div className="space-y-4">
                <div className="text-lg font-medium text-center">
                  {contextQuestions[currentContextIndex].question}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="h-16 bg-green-600 hover:bg-green-700"
                    onClick={() => handleContextAnswer(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    className="h-16 bg-zinc-700 hover:bg-zinc-600"
                    onClick={() => handleContextAnswer(false)}
                  >
                    No
                  </Button>
                </div>
              </div>
            )}
            
            {contextQuestions[currentContextIndex]?.type === 'player' && (
              <div className="space-y-4">
                <div className="text-lg font-medium text-center">
                  {contextQuestions[currentContextIndex].question}
                </div>
                
                <input
                  type="text"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="Enter #"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-3 text-white text-center text-xl font-bold"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-600"
                    onClick={() => handleContextAnswer(null)}
                  >
                    Skip
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleContextAnswer(playerNumber)}
                    disabled={!playerNumber}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              className="w-full border-zinc-600"
              onClick={() => {
                if (currentContextIndex > 0) {
                  setCurrentContextIndex(prev => prev - 1);
                } else {
                  setStep(2);
                }
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-4 mt-4">
            {declined ? (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-zinc-400 mb-2">PENALTY DECLINED</div>
                <div className="text-sm text-zinc-500">No yardage assessed - play stands as called</div>
              </div>
            ) : offsetting ? (
              <div className="text-center py-6">
                <div className="text-2xl font-bold text-yellow-500 mb-2">OFFSETTING PENALTIES</div>
                <div className="text-sm text-zinc-500">Penalties offset - replay the down</div>
              </div>
            ) : selectedPenalty && enforcementResult ? (
              <>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold text-red-400">{selectedPenalty.display_name}</div>
                    <div className="text-sm text-zinc-500">
                      {againstTeam === 'offense' ? 'On Offense' : 'On Defense'}
                      {playerNumber && ` • #${playerNumber}`}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-zinc-900 rounded p-3">
                      <div className="text-xs text-zinc-500 uppercase">Yards</div>
                      <div className="text-2xl font-bold text-red-400">
                        {againstTeam === 'offense' ? '-' : '+'}{enforcementResult.yardsApplied}
                      </div>
                    </div>
                    <div className="bg-zinc-900 rounded p-3">
                      <div className="text-xs text-zinc-500 uppercase">Ruleset</div>
                      <div className="text-lg font-bold text-zinc-200">{ruleset}</div>
                    </div>
                  </div>
                  
                  {/* Flags */}
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {enforcementResult.autoFirstDown && (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium">
                        AUTO FIRST DOWN
                      </span>
                    )}
                    {enforcementResult.lossOfDown && (
                      <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium">
                        LOSS OF DOWN
                      </span>
                    )}
                    {currentVariant?.disqualification === 'ejection' && (
                      <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium">
                        PLAYER EJECTED
                      </span>
                    )}
                    {currentVariant?.disqualification === 'player_dq' && (
                      <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded text-xs font-medium">
                        POSSIBLE DQ
                      </span>
                    )}
                  </div>
                  
                  {currentVariant?.notes && (
                    <div className="mt-3 text-xs text-zinc-500 text-center">
                      {currentVariant.notes}
                    </div>
                  )}
                </div>
              </>
            ) : null}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-600"
                onClick={() => {
                  if (declined || offsetting) {
                    setDeclined(false);
                    setOffsetting(false);
                    setStep(1);
                  } else {
                    setStep(contextQuestions.length > 0 ? 3 : 2);
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleSubmit}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Penalty
              </Button>
            </div>
          </div>
        )}
        
        {/* Close Button */}
        <Button
          variant="ghost"
          className="absolute top-2 right-2 text-zinc-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
