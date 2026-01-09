import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, X, Building2 } from "lucide-react";
import MooseIcon from "@/components/MooseIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    name: ""
  });
  const [securityQuestions, setSecurityQuestions] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" }
  ]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Fetch available security questions
    const fetchQuestions = async () => {
      try {
        const res = await axios.get(`${API}/auth/security-questions`);
        setAvailableQuestions(res.data.questions);
      } catch (error) {
        console.error("Failed to load security questions");
      }
    };
    fetchQuestions();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Validate security questions
    const answeredQuestions = securityQuestions.filter(sq => sq.question && sq.answer.trim());
    if (answeredQuestions.length < 2) {
      newErrors.securityQuestions = "Please answer at least 2 security questions";
    }
    
    // Check for duplicate questions
    const selectedQuestions = securityQuestions.filter(sq => sq.question).map(sq => sq.question);
    if (new Set(selectedQuestions).size !== selectedQuestions.length) {
      newErrors.securityQuestions = "Please select different questions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const validQuestions = securityQuestions
        .filter(sq => sq.question && sq.answer.trim())
        .map(sq => ({ question: sq.question, answer: sq.answer.trim() }));

      const res = await axios.post(`${API}/auth/register`, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        security_questions: validQuestions
      }, { withCredentials: true });
      
      localStorage.setItem("session_token", res.data.session_token);
      localStorage.setItem("user", JSON.stringify(res.data));
      onLogin(res.data);
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.includes("Email")) {
        setErrors({ email: detail });
      } else if (detail?.includes("Username")) {
        setErrors({ username: detail });
      } else if (detail?.includes("security")) {
        setErrors({ securityQuestions: detail });
      } else {
        toast.error(detail || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSecurityQuestion = (index, field, value) => {
    const updated = [...securityQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setSecurityQuestions(updated);
  };

  const addSecurityQuestion = () => {
    if (securityQuestions.length < 5) {
      setSecurityQuestions([...securityQuestions, { question: "", answer: "" }]);
    }
  };

  const removeSecurityQuestion = (index) => {
    if (securityQuestions.length > 2) {
      setSecurityQuestions(securityQuestions.filter((_, i) => i !== index));
    }
  };

  const getAvailableQuestionsForIndex = (currentIndex) => {
    const selectedQuestions = securityQuestions
      .map((sq, i) => i !== currentIndex ? sq.question : null)
      .filter(q => q);
    return availableQuestions.filter(q => !selectedQuestions.includes(q));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo192.png" 
              alt="StatMoose" 
              className="w-16 h-16"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="w-16 h-16 bg-orange-500 rounded-full items-center justify-center hidden">
              <span className="text-white font-bold text-2xl">SM</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start tracking your basketball stats</CardDescription>
          
          {/* School/Organization Signup - Moved to top */}
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800 mb-2">
              Are you a school or organization?
            </p>
            <Button
              variant="outline"
              className="w-full border-orange-500 text-orange-600 hover:bg-orange-100"
              onClick={() => navigate("/school/signup")}
              data-testid="school-signup-btn"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Sign Up A School/Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                data-testid="register-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
                className={errors.email ? "border-red-500" : ""}
                data-testid="register-email"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
                required
                className={errors.username ? "border-red-500" : ""}
                data-testid="register-username"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                className={errors.password ? "border-red-500" : ""}
                data-testid="register-password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                className={errors.confirmPassword ? "border-red-500" : ""}
                data-testid="register-confirm-password"
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Security Questions Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Security Questions</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Answer at least 2 questions to recover your account if you forget your password.
              </p>
              
              {securityQuestions.map((sq, index) => (
                <div key={index} className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Question {index + 1}</Label>
                    {securityQuestions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500"
                        onClick={() => removeSecurityQuestion(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Select
                    value={sq.question}
                    onValueChange={(value) => updateSecurityQuestion(index, "question", value)}
                  >
                    <SelectTrigger className="mb-2">
                      <SelectValue placeholder="Select a question" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableQuestionsForIndex(index).map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Your answer"
                    value={sq.answer}
                    onChange={(e) => updateSecurityQuestion(index, "answer", e.target.value)}
                    disabled={!sq.question}
                  />
                </div>
              ))}
              
              {securityQuestions.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addSecurityQuestion}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Question
                </Button>
              )}
              
              {errors.securityQuestions && (
                <p className="text-red-500 text-sm mt-2">{errors.securityQuestions}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-black hover:bg-gray-800" disabled={loading} data-testid="register-submit">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          
          {/* School/Organization Signup */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-center text-sm text-muted-foreground mb-3">
              Are you a school or organization?
            </p>
            <Button
              variant="outline"
              className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
              onClick={() => navigate("/school/signup")}
              data-testid="school-signup-btn"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Sign Up A School/Organization
            </Button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
