import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Minus } from "lucide-react";

const StatButton = ({ label, onClick, variant = "default", testId, disabled }) => (
  <Button
    size="sm"
    variant={variant}
    className={`stat-btn h-10 min-w-[60px] ${
      variant === "make" ? "bg-emerald-500 hover:bg-emerald-600 text-white" :
      variant === "miss" ? "bg-red-500 hover:bg-red-600 text-white" :
      "bg-slate-600 hover:bg-slate-700 text-white"
    }`}
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
  >
    {label}
  </Button>
);

const UndoButton = ({ onClick, testId, disabled }) => (
  <Button
    size="sm"
    variant="outline"
    className="h-8 w-8 p-0"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
  >
    <Minus className="w-3 h-3" />
  </Button>
);

export default function PlayerStatRow({ player, onStatUpdate, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const pts = player.ft_made + (player.fg2_made * 2) + (player.fg3_made * 3);
  const totalReb = player.offensive_rebounds + player.defensive_rebounds;
  
  const fg_made = player.fg2_made + player.fg3_made;
  const fg_att = fg_made + player.fg2_missed + player.fg3_missed;
  const fg_pct = fg_att > 0 ? ((fg_made / fg_att) * 100).toFixed(1) : 0;
  
  const ft_att = player.ft_made + player.ft_missed;
  const ft_pct = ft_att > 0 ? ((player.ft_made / ft_att) * 100).toFixed(1) : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b last:border-b-0" data-testid={`player-stat-row-${player.id}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#000000] text-white flex items-center justify-center font-bold">
                {player.player_number}
              </div>
              <div>
                <p className="font-semibold">{player.player_name}</p>
                <p className="text-sm text-muted-foreground">
                  {pts} PTS | {totalReb} REB | {player.assists} AST
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-muted-foreground">
                  FG: {fg_made}/{fg_att} ({fg_pct}%) | FT: {player.ft_made}/{ft_att} ({ft_pct}%)
                </p>
                <p className="text-sm text-muted-foreground">
                  STL: {player.steals} | BLK: {player.blocks} | TO: {player.turnovers} | PF: {player.fouls}
                </p>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Scoring */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-sm">Scoring</h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Free Throws */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Free Throw ({player.ft_made}/{ft_att})</p>
                  <div className="flex gap-1">
                    <StatButton 
                      label="Make" 
                      variant="make" 
                      onClick={() => onStatUpdate(player.id, "ft_made")}
                      testId={`ft-make-${player.id}`}
                      disabled={disabled}
                    />
                    <StatButton 
                      label="Miss" 
                      variant="miss" 
                      onClick={() => onStatUpdate(player.id, "ft_missed")}
                      testId={`ft-miss-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* 2PT */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">2PT ({player.fg2_made}/{player.fg2_made + player.fg2_missed})</p>
                  <div className="flex gap-1">
                    <StatButton 
                      label="Make" 
                      variant="make" 
                      onClick={() => onStatUpdate(player.id, "fg2_made")}
                      testId={`fg2-make-${player.id}`}
                      disabled={disabled}
                    />
                    <StatButton 
                      label="Miss" 
                      variant="miss" 
                      onClick={() => onStatUpdate(player.id, "fg2_missed")}
                      testId={`fg2-miss-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* 3PT */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">3PT ({player.fg3_made}/{player.fg3_made + player.fg3_missed})</p>
                  <div className="flex gap-1">
                    <StatButton 
                      label="Make" 
                      variant="make" 
                      onClick={() => onStatUpdate(player.id, "fg3_made")}
                      testId={`fg3-make-${player.id}`}
                      disabled={disabled}
                    />
                    <StatButton 
                      label="Miss" 
                      variant="miss" 
                      onClick={() => onStatUpdate(player.id, "fg3_missed")}
                      testId={`fg3-miss-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Other Stats */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-sm">Other Stats</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Assist */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Assist</p>
                    <p className="font-bold">{player.assists}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "assist")}
                      testId={`assist-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "assist", -1)}
                      testId={`assist-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* O-Reb */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">O-Reb</p>
                    <p className="font-bold">{player.offensive_rebounds}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "oreb")}
                      testId={`oreb-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "oreb", -1)}
                      testId={`oreb-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* D-Reb */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">D-Reb</p>
                    <p className="font-bold">{player.defensive_rebounds}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "dreb")}
                      testId={`dreb-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "dreb", -1)}
                      testId={`dreb-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* Steal */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Steal</p>
                    <p className="font-bold">{player.steals}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "steal")}
                      testId={`steal-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "steal", -1)}
                      testId={`steal-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* Block */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Block</p>
                    <p className="font-bold">{player.blocks}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "block")}
                      testId={`block-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "block", -1)}
                      testId={`block-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* Turnover */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Turnover</p>
                    <p className="font-bold">{player.turnovers}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "turnover")}
                      testId={`turnover-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "turnover", -1)}
                      testId={`turnover-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
                {/* Foul */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Foul</p>
                    <p className={`font-bold ${player.fouls >= 5 ? 'text-red-500' : ''}`}>{player.fouls}</p>
                  </div>
                  <div className="flex gap-1">
                    <StatButton 
                      label="+" 
                      onClick={() => onStatUpdate(player.id, "foul")}
                      testId={`foul-${player.id}`}
                      disabled={disabled}
                    />
                    <UndoButton 
                      onClick={() => onStatUpdate(player.id, "foul", -1)}
                      testId={`foul-undo-${player.id}`}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
