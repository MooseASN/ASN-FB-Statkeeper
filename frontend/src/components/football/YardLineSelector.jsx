import React from "react";
import { Button } from "@/components/ui/button";

/**
 * YardLineSelector - Component for selecting yard line positions
 * Supports both numeric input and preset button selection
 */
export default function YardLineSelector({ label, value, onChange, direction = 'left', maxYards = 50, showSide = false }) {
  const presets = maxYards === 100 
    ? [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99] 
    : [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
  // For 100-yard selector, show which side of field
  const getYardLineDisplay = (val) => {
    if (maxYards !== 100 || !showSide) return val;
    if (val === 50) return "50";
    if (val < 50) return `Own ${val}`;
    return `Opp ${100 - val}`;
  };
  
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.max(0, value - 5))}
        >
          -5
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          -1
        </Button>
        <div className="flex-1 text-center">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Math.min(maxYards, parseInt(e.target.value) || 0)))}
            className="w-20 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-zinc-500 mt-1">
            {showSide ? getYardLineDisplay(value) : "Yard Line"}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(maxYards, value + 1))}
        >
          +1
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-zinc-600"
          onClick={() => onChange(Math.min(maxYards, value + 5))}
        >
          +5
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((yard) => (
          <button
            key={yard}
            onClick={() => onChange(yard)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              value === yard
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            {yard}
          </button>
        ))}
      </div>
    </div>
  );
}
