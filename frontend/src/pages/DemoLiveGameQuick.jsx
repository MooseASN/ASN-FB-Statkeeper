import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { DemoModeBar } from "./BasketballDemoSelector";

// Placeholder for Quick Mode Demo
export default function DemoLiveGameQuick() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900">
      <DemoModeBar />
      
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen px-6">
        <Construction className="w-16 h-16 text-orange-500 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Quick Mode Demo</h1>
        <p className="text-slate-400 text-center max-w-md mb-8">
          Quick Mode offers a streamlined interface for fast-paced tracking. 
          Try the Classic Mode demo to experience the core tracking features.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => navigate("/demo/basketball")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Mode Selection
          </Button>
          <Button
            onClick={() => navigate("/demo/basketball/classic")}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Try Classic Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
