import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setError("No session ID received from Google");
        return;
      }
      
      try {
        const res = await axios.post(`${API}/auth/google/session`, 
          { session_id: sessionId },
          { withCredentials: true }
        );
        
        localStorage.setItem("session_token", res.data.session_token);
        localStorage.setItem("user", JSON.stringify(res.data));
        onLogin(res.data);
        toast.success("Welcome!");
        navigate("/");
      } catch (error) {
        console.error("Auth callback error:", error);
        setError(error.response?.data?.detail || "Authentication failed");
      }
    };
    
    handleCallback();
  }, [searchParams, navigate, onLogin]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <MooseIcon className="w-16 h-16 mx-auto mb-4 text-white" />
          <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <MooseIcon className="w-16 h-16 mx-auto mb-4 text-white animate-pulse" />
        <p className="text-lg">Signing you in...</p>
      </div>
    </div>
  );
}
