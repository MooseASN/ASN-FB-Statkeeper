import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MARTY_HEAD = "https://customer-assets.emergentagent.com/job_stat-tracker-14/artifacts/im9bk6ab_Marty%20Head.png";

export default function SupportChatbot({ user }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey there! I'm Marty the StatMoose! 🦌 How can I help you today? Ask me anything about StatMoose - features, subscriptions, how to track stats, or troubleshooting!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check if badge was previously dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("marty_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem("marty_dismissed", "true");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API}/support-chat/message`, {
        message: userMessage,
        session_id: sessionId
      });

      // Save session ID for conversation continuity
      if (res.data.session_id && !sessionId) {
        setSessionId(res.data.session_id);
      }

      // Add assistant response
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Oops! I'm having a bit of trouble right now. Please try again in a moment, or you can always reach our support team through the Contact page!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContactSupport = () => {
    setIsOpen(false);
    navigate("/contact");
  };

  // Don't render if user is not logged in or badge is dismissed
  if (!user || isDismissed) return null;

  return (
    <>
      {/* Floating Badge */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-white text-xs z-10 shadow-lg transition-colors"
              title="Dismiss Marty"
              data-testid="marty-dismiss"
            >
              <X className="w-3 h-3" />
            </button>
            
            {/* Marty badge */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-400 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center overflow-hidden border-4 border-white"
              title="Chat with Marty"
              data-testid="marty-badge"
            >
              <img 
                src={MARTY_HEAD} 
                alt="Marty the StatMoose" 
                className="w-14 h-14 object-cover"
              />
            </button>
            
            {/* Pulse animation */}
            <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              <img 
                src={MARTY_HEAD} 
                alt="Marty" 
                className="w-10 h-10 object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">Marty the StatMoose</h3>
              <p className="text-orange-100 text-sm">Support Assistant</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              data-testid="chat-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-orange-500 text-white rounded-br-md"
                      : "bg-white text-zinc-800 rounded-bl-md shadow-sm border border-zinc-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-zinc-100">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Contact Support Link */}
          <div className="px-4 py-2 bg-zinc-100 border-t border-zinc-200">
            <button
              onClick={handleContactSupport}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-600 hover:text-orange-600 transition-colors"
              data-testid="contact-support-link"
            >
              <MessageCircle className="w-4 h-4" />
              Need more help? Contact Support
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-zinc-200">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Marty anything..."
                className="flex-1 border-zinc-300 focus:border-orange-500 focus:ring-orange-500"
                disabled={isLoading}
                data-testid="chat-input"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-orange-500 hover:bg-orange-400 text-white px-4"
                data-testid="chat-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
