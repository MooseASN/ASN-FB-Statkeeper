import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, UserPlus } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SchoolJoin() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    securityQuestion1: "",
    securityAnswer1: "",
    securityQuestion2: "",
    securityAnswer2: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolRes, questionsRes] = await Promise.all([
          axios.get(`${API}/schools/invite/${inviteCode}`),
          axios.get(`${API}/security-questions`)
        ]);
        setSchool(schoolRes.data);
        setSecurityQuestions(questionsRes.data);
      } catch (err) {
        setError("Invalid or expired invite link");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [inviteCode]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (!formData.securityQuestion1 || !formData.securityAnswer1 ||
        !formData.securityQuestion2 || !formData.securityAnswer2) {
      toast.error("Please answer both security questions");
      return;
    }
    
    if (formData.securityQuestion1 === formData.securityQuestion2) {
      toast.error("Please select two different security questions");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await axios.post(`${API}/schools/join/${inviteCode}`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        security_questions: [
          { question: formData.securityQuestion1, answer: formData.securityAnswer1 },
          { question: formData.securityQuestion2, answer: formData.securityAnswer2 }
        ]
      });
      
      sessionStorage.setItem("session_token", res.data.session_token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      
      toast.success(`Welcome to ${school.name}!`);
      navigate("/school-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to join school");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <Button onClick={() => navigate("/login")} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* School Info */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center">
            {school.logo_url ? (
              <img src={school.logo_url} alt={school.name} className="w-20 h-20 object-contain mx-auto mb-4 rounded" />
            ) : (
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-orange-500" />
              </div>
            )}
            <h1 className="text-xl font-bold text-white">{school.name}</h1>
            <p className="text-slate-400">{school.state}</p>
            <p className="text-orange-400 text-sm mt-2">You've been invited to join!</p>
          </CardContent>
        </Card>

        {/* Join Form */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Your Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-200">Your Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John Smith"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label className="text-slate-200">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.smith@email.com"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Password *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Confirm *</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Questions */}
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Security Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-200">Question 1 *</Label>
                <Select 
                  value={formData.securityQuestion1} 
                  onValueChange={(v) => handleChange("securityQuestion1", v)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {securityQuestions.filter(q => q !== formData.securityQuestion2).map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={formData.securityAnswer1}
                  onChange={(e) => handleChange("securityAnswer1", e.target.value)}
                  placeholder="Your answer"
                  className="bg-slate-900/50 border-slate-600 text-white mt-2"
                />
              </div>
              
              <div>
                <Label className="text-slate-200">Question 2 *</Label>
                <Select 
                  value={formData.securityQuestion2} 
                  onValueChange={(v) => handleChange("securityQuestion2", v)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {securityQuestions.filter(q => q !== formData.securityQuestion1).map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={formData.securityAnswer2}
                  onChange={(e) => handleChange("securityAnswer2", e.target.value)}
                  placeholder="Your answer"
                  className="bg-slate-900/50 border-slate-600 text-white mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6"
          >
            {submitting ? "Joining..." : "Join School"}
          </Button>
          
          <p className="text-center text-slate-400 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-orange-400 hover:text-orange-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
