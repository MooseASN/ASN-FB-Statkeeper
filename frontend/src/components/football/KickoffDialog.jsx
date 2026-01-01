import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * KickoffDialog - Dialog to select which team kicks off first
 */
export default function KickoffDialog({ open, homeTeam, awayTeam, homeColor, awayColor, onSelect }) {
  return (
    <Dialog open={open}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">KICKOFF</DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            Which team kicks off first?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            onClick={() => onSelect('home')}
            className="h-24 text-lg font-bold"
            style={{ backgroundColor: homeColor }}
          >
            {homeTeam}
          </Button>
          <Button
            onClick={() => onSelect('away')}
            className="h-24 text-lg font-bold"
            style={{ backgroundColor: awayColor }}
          >
            {awayTeam}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
