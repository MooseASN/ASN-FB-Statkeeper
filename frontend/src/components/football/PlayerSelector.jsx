import React, { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * PlayerSelector - Component for selecting a player from a roster
 * Supports both direct number input and clicking from roster grid
 */
export default function PlayerSelector({ label, roster, selectedNumber, onSelect, teamColor }) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue) {
      const num = parseInt(inputValue);
      if (!isNaN(num)) {
        onSelect(num);
        setInputValue('');
      }
    }
  };
  
  return (
    <div className="space-y-3">
      <label className="text-sm text-zinc-400 uppercase tracking-wide">{label}</label>
      
      {/* Number Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onKeyPress={handleKeyPress}
          placeholder="Enter #"
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
        />
        <Button
          onClick={() => {
            const num = parseInt(inputValue);
            if (!isNaN(num)) {
              onSelect(num);
              setInputValue('');
            }
          }}
          disabled={!inputValue}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Select
        </Button>
      </div>
      
      {/* Roster Grid */}
      {roster && roster.length > 0 && (
        <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
          {roster.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.number)}
              className={`py-1 px-2 rounded text-sm font-bold transition-all ${
                selectedNumber === player.number
                  ? 'text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
              style={selectedNumber === player.number ? { backgroundColor: teamColor } : {}}
              title={player.name}
            >
              #{player.number}
            </button>
          ))}
        </div>
      )}
      
      {/* Selected Player Display */}
      {selectedNumber && (
        <div 
          className="text-center py-2 rounded font-bold"
          style={{ backgroundColor: `${teamColor}40`, color: teamColor }}
        >
          #{selectedNumber} Selected
        </div>
      )}
    </div>
  );
}
