import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, X, Edit2 } from "lucide-react";

/**
 * Box Score Editor Component
 * Allows editing player stats before finalizing a basketball game
 * Automatically updates team totals and percentages
 */
export default function BoxScoreEditor({ 
  open, 
  onOpenChange, 
  homeStats, 
  awayStats, 
  homeTeamName, 
  awayTeamName, 
  homeColor, 
  awayColor,
  onSave,
  quarterScores
}) {
  const [editedHomeStats, setEditedHomeStats] = useState([]);
  const [editedAwayStats, setEditedAwayStats] = useState([]);
  const [editingCell, setEditingCell] = useState(null);

  // Initialize stats when dialog opens
  useEffect(() => {
    if (open) {
      setEditedHomeStats(homeStats.map(p => ({ ...p })));
      setEditedAwayStats(awayStats.map(p => ({ ...p })));
    }
  }, [open, homeStats, awayStats]);

  // Calculate player points
  const calcPoints = (player) => {
    return (player.ft_made || 0) + (player.fg2_made || 0) * 2 + (player.fg3_made || 0) * 3;
  };

  // Calculate player rebounds
  const calcRebounds = (player) => {
    return (player.offensive_rebounds || 0) + (player.defensive_rebounds || 0);
  };

  // Calculate FG percentage
  const calcFGPct = (player) => {
    const made = (player.fg2_made || 0) + (player.fg3_made || 0);
    const attempts = made + (player.fg2_missed || 0) + (player.fg3_missed || 0);
    return attempts > 0 ? ((made / attempts) * 100).toFixed(1) : '0.0';
  };

  // Calculate 3PT percentage
  const calc3Pct = (player) => {
    const made = player.fg3_made || 0;
    const attempts = made + (player.fg3_missed || 0);
    return attempts > 0 ? ((made / attempts) * 100).toFixed(1) : '0.0';
  };

  // Calculate FT percentage
  const calcFTPct = (player) => {
    const made = player.ft_made || 0;
    const attempts = made + (player.ft_missed || 0);
    return attempts > 0 ? ((made / attempts) * 100).toFixed(1) : '0.0';
  };

  // Calculate team totals
  const calcTeamTotals = (stats) => {
    const totals = stats.reduce((acc, p) => ({
      points: acc.points + calcPoints(p),
      fg2_made: acc.fg2_made + (p.fg2_made || 0),
      fg2_missed: acc.fg2_missed + (p.fg2_missed || 0),
      fg3_made: acc.fg3_made + (p.fg3_made || 0),
      fg3_missed: acc.fg3_missed + (p.fg3_missed || 0),
      ft_made: acc.ft_made + (p.ft_made || 0),
      ft_missed: acc.ft_missed + (p.ft_missed || 0),
      offensive_rebounds: acc.offensive_rebounds + (p.offensive_rebounds || 0),
      defensive_rebounds: acc.defensive_rebounds + (p.defensive_rebounds || 0),
      assists: acc.assists + (p.assists || 0),
      steals: acc.steals + (p.steals || 0),
      blocks: acc.blocks + (p.blocks || 0),
      turnovers: acc.turnovers + (p.turnovers || 0),
      fouls: acc.fouls + (p.fouls || 0),
    }), {
      points: 0, fg2_made: 0, fg2_missed: 0, fg3_made: 0, fg3_missed: 0,
      ft_made: 0, ft_missed: 0, offensive_rebounds: 0, defensive_rebounds: 0,
      assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0
    });

    const fgMade = totals.fg2_made + totals.fg3_made;
    const fgAttempts = fgMade + totals.fg2_missed + totals.fg3_missed;
    const fg3Attempts = totals.fg3_made + totals.fg3_missed;
    const ftAttempts = totals.ft_made + totals.ft_missed;

    return {
      ...totals,
      rebounds: totals.offensive_rebounds + totals.defensive_rebounds,
      fgPct: fgAttempts > 0 ? ((fgMade / fgAttempts) * 100).toFixed(1) : '0.0',
      fg3Pct: fg3Attempts > 0 ? ((totals.fg3_made / fg3Attempts) * 100).toFixed(1) : '0.0',
      ftPct: ftAttempts > 0 ? ((totals.ft_made / ftAttempts) * 100).toFixed(1) : '0.0',
    };
  };

  const homeTotals = useMemo(() => calcTeamTotals(editedHomeStats), [editedHomeStats]);
  const awayTotals = useMemo(() => calcTeamTotals(editedAwayStats), [editedAwayStats]);

  // Handle stat edit
  const handleStatChange = (team, playerIndex, field, value) => {
    const numValue = parseInt(value) || 0;
    const setStats = team === 'home' ? setEditedHomeStats : setEditedAwayStats;
    
    setStats(prev => prev.map((p, i) => 
      i === playerIndex ? { ...p, [field]: Math.max(0, numValue) } : p
    ));
  };

  // Save changes
  const handleSave = () => {
    onSave(editedHomeStats, editedAwayStats);
    toast.success("Box score saved");
    onOpenChange(false);
  };

  // Stat columns configuration
  const statColumns = [
    { key: 'player', label: 'Player', width: 'w-32' },
    { key: 'fg2_made', label: '2PM', width: 'w-14', editable: true },
    { key: 'fg2_missed', label: '2PA', width: 'w-14', editable: true, computed: true },
    { key: 'fg3_made', label: '3PM', width: 'w-14', editable: true },
    { key: 'fg3_missed', label: '3PA', width: 'w-14', editable: true, computed: true },
    { key: 'ft_made', label: 'FTM', width: 'w-14', editable: true },
    { key: 'ft_missed', label: 'FTA', width: 'w-14', editable: true, computed: true },
    { key: 'offensive_rebounds', label: 'OREB', width: 'w-14', editable: true },
    { key: 'defensive_rebounds', label: 'DREB', width: 'w-14', editable: true },
    { key: 'assists', label: 'AST', width: 'w-14', editable: true },
    { key: 'steals', label: 'STL', width: 'w-14', editable: true },
    { key: 'blocks', label: 'BLK', width: 'w-14', editable: true },
    { key: 'turnovers', label: 'TO', width: 'w-14', editable: true },
    { key: 'fouls', label: 'PF', width: 'w-14', editable: true },
    { key: 'points', label: 'PTS', width: 'w-16', computed: true },
  ];

  const renderTeamTable = (stats, teamName, teamColor, teamKey, totals) => (
    <div className="mb-6">
      <h3 className="font-bold text-lg mb-2 flex items-center gap-2" style={{ color: teamColor }}>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: teamColor }}></span>
        {teamName}
        <span className="ml-auto text-2xl font-black">{totals.points}</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {statColumns.map(col => (
                <th key={col.key} className={`${col.width} px-1 py-2 text-center font-semibold text-gray-700 border-b`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((player, pIdx) => (
              <tr key={player.id || pIdx} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1 font-medium">
                  #{player.player_number} {player.player_name?.split(' ').pop()}
                </td>
                {statColumns.slice(1, -1).map(col => (
                  <td key={col.key} className="px-1 py-1 text-center">
                    {col.editable ? (
                      <Input
                        type="number"
                        min="0"
                        value={player[col.key] || 0}
                        onChange={(e) => handleStatChange(teamKey, pIdx, col.key, e.target.value)}
                        className="w-12 h-7 text-center p-0 text-sm"
                      />
                    ) : (
                      player[col.key] || 0
                    )}
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-bold" style={{ color: teamColor }}>
                  {calcPoints(player)}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-gray-100 font-bold">
              <td className="px-2 py-2">TOTALS</td>
              <td className="px-1 py-2 text-center">{totals.fg2_made}</td>
              <td className="px-1 py-2 text-center">{totals.fg2_made + totals.fg2_missed}</td>
              <td className="px-1 py-2 text-center">{totals.fg3_made}</td>
              <td className="px-1 py-2 text-center">{totals.fg3_made + totals.fg3_missed}</td>
              <td className="px-1 py-2 text-center">{totals.ft_made}</td>
              <td className="px-1 py-2 text-center">{totals.ft_made + totals.ft_missed}</td>
              <td className="px-1 py-2 text-center">{totals.offensive_rebounds}</td>
              <td className="px-1 py-2 text-center">{totals.defensive_rebounds}</td>
              <td className="px-1 py-2 text-center">{totals.assists}</td>
              <td className="px-1 py-2 text-center">{totals.steals}</td>
              <td className="px-1 py-2 text-center">{totals.blocks}</td>
              <td className="px-1 py-2 text-center">{totals.turnovers}</td>
              <td className="px-1 py-2 text-center">{totals.fouls}</td>
              <td className="px-2 py-2 text-center text-lg" style={{ color: teamColor }}>{totals.points}</td>
            </tr>
            {/* Percentages Row */}
            <tr className="text-gray-600 text-xs">
              <td className="px-2 py-1">Shooting %</td>
              <td colSpan="2" className="px-1 py-1 text-center">FG: {totals.fgPct}%</td>
              <td colSpan="2" className="px-1 py-1 text-center">3PT: {totals.fg3Pct}%</td>
              <td colSpan="2" className="px-1 py-1 text-center">FT: {totals.ftPct}%</td>
              <td colSpan="2" className="px-1 py-1 text-center">REB: {totals.rebounds}</td>
              <td colSpan="6"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Edit Box Score Before Finalizing
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Review and edit player statistics. Team totals and percentages update automatically.
          </p>
        </DialogHeader>
        
        <div className="py-4">
          {renderTeamTable(editedAwayStats, awayTeamName, awayColor, 'away', awayTotals)}
          {renderTeamTable(editedHomeStats, homeTeamName, homeColor, 'home', homeTotals)}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Save & Finalize Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
