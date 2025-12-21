import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle, Copy, Check, Shield, AlertTriangle } from "lucide-react";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("email"); // "email", "security", "success"
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [resetLink, setResetLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [noSecurityQuestions, setNoSecurityQuestions] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First check if user exists
      const checkRes = await axios.post(`${API}/auth/forgot-password`, { email });
      
      if (!checkRes.data.exists) {
        toast.error("No account found with this email");
        setLoading(false);
        return;
      }
      
      if (!checkRes.data.has_security_questions) {
        setNoSecurityQuestions(true);
        setLoading(false);
        return;
      }
      
      // Get a security question for this user
      const questionRes = await axios.post(`${API}/auth/security-question/get`, { email });
      
      if (questionRes.data.question) {
        setSecurityQuestion(questionRes.data.question);
        setStep("security");
      } else {
        setNoSecurityQuestions(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/auth/security-question/verify`, {
        email,
        question: securityQuestion,
        answer: securityAnswer
      });
      
      if (res.data.reset_link) {
        setResetLink(res.data.reset_link);
        setStep("success");
        toast.success("Security question verified!");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Incorrect answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setEmail("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setResetLink(null);
    setStep("email");
    setNoSecurityQuestions(false);
  };

  // No security questions set
  if (noSecurityQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Cannot Reset Password</CardTitle>
            <CardDescription>
              This account was created before security questions were required, or no security questions were set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please contact the administrator or create a new account with security questions enabled.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={resetForm} className="w-full">
                Try a different email
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - show reset link
  if (step === "success" && resetLink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Verified!</CardTitle>
            <CardDescription>
              Click the link below to reset your password for <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100 p-3 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <a 
                  href={resetLink} 
                  className="text-sm text-blue-600 hover:underline break-all flex-1"
                >
                  {resetLink}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              This link will expire in 1 hour.
            </p>
            <div className="flex flex-col gap-2">
              <Link to={resetLink.replace(window.location.origin, '')} className="w-full">
                <Button className="w-full bg-black hover:bg-gray-800">
                  Reset Password Now
                </Button>
              </Link>
              <Button variant="outline" onClick={resetForm} className="w-full">
                Try a different email
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Security question step
  if (step === "security") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Security Verification</CardTitle>
            <CardDescription>
              Please answer your security question to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSecuritySubmit} className="space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <Label className="text-sm text-muted-foreground">Your Security Question</Label>
                <p className="font-medium mt-1">{securityQuestion}</p>
              </div>
              <div>
                <Label htmlFor="answer">Your Answer</Label>
                <Input
                  id="answer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  required
                  className="mt-1"
                  data-testid="security-answer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Answer is not case-sensitive
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-gray-800" 
                disabled={loading || !securityAnswer.trim()}
                data-testid="verify-submit"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={resetForm} className="text-sm text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email step (default)
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MooseIcon className="w-16 h-16 text-black" />
          </div>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email to reset your password using your security question.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="pl-10"
                  data-testid="forgot-email"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-black hover:bg-gray-800" 
              disabled={loading}
              data-testid="forgot-submit"
            >
              {loading ? "Checking..." : "Continue"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-black flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
