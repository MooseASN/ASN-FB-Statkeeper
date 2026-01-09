import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2, Upload, Link as LinkIcon, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SchoolSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [nameAvailable, setNameAvailable] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  
  // Logo options
  const [logoType, setLogoType] = useState("url"); // "url" or "upload"
  
  // Form data
  const [formData, setFormData] = useState({
    schoolName: "",
    state: "",
    classification: "",
    classificationOther: "",
    logoUrl: "",
    userName: "",
    userEmail: "",
    password: "",
    confirmPassword: "",
    securityQuestion1: "",
    securityAnswer1: "",
    securityQuestion2: "",
    securityAnswer2: ""
  });

  useEffect(() => {
    // Fetch US states and security questions
    const fetchData = async () => {
      try {
        const [statesRes, questionsRes] = await Promise.all([
          axios.get(`${API}/states`),
          axios.get(`${API}/security-questions`)
        ]);
        setStates(statesRes.data);
        setSecurityQuestions(questionsRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Check school name availability with debounce
  useEffect(() => {
    if (!formData.schoolName || formData.schoolName.length < 3) {
      setNameAvailable(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await axios.get(`${API}/schools/check-name/${encodeURIComponent(formData.schoolName)}`);
        setNameAvailable(res.data.available);
      } catch (error) {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.schoolName]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, logoUrl: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.schoolName || !formData.state || !formData.userName || 
        !formData.userEmail || !formData.password) {
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
    
    if (!formData.classification) {
      toast.error("Please select a school classification");
      return;
    }
    
    if (formData.classification === "other" && !formData.classificationOther.trim()) {
      toast.error("Please enter your custom classification");
      return;
    }
    
    if (nameAvailable === false) {
      toast.error("This school/organization name is already taken");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/schools/register`, {
        school_name: formData.schoolName,
        state: formData.state,
        classification: formData.classification,
        classification_other: formData.classification === "other" ? formData.classificationOther : null,
        logo_url: formData.logoUrl || null,
        user_name: formData.userName,
        user_email: formData.userEmail,
        password: formData.password,
        security_questions: [
          { question: formData.securityQuestion1, answer: formData.securityAnswer1 },
          { question: formData.securityQuestion2, answer: formData.securityAnswer2 }
        ]
      });
      
      // Save session
      sessionStorage.setItem("session_token", res.data.session_token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      
      toast.success("School registered successfully!");
      navigate("/school-dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/signup")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Register Your School</h1>
              <p className="text-slate-400 text-sm">Create an account for your school or organization</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* School Information */}
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">School/Organization Information</CardTitle>
              <CardDescription>Enter details about your school or organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* School Name */}
              <div>
                <Label className="text-slate-200">School/Organization Name *</Label>
                <div className="relative">
                  <Input
                    value={formData.schoolName}
                    onChange={(e) => handleChange("schoolName", e.target.value)}
                    placeholder="e.g., Lincoln High School"
                    className="bg-slate-900/50 border-slate-600 text-white pr-10"
                    data-testid="school-name-input"
                  />
                  {formData.schoolName.length >= 3 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingName ? (
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : nameAvailable === true ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : nameAvailable === false ? (
                        <X className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {nameAvailable === false && (
                  <p className="text-red-400 text-sm mt-1">This name is already taken</p>
                )}
              </div>

              {/* State */}
              <div>
                <Label className="text-slate-200">State *</Label>
                <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="state-select">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Classification */}
              <div>
                <Label className="text-slate-200">Classification *</Label>
                <Select value={formData.classification} onValueChange={(v) => handleChange("classification", v)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white" data-testid="classification-select">
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="prep">Prep</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Custom Classification (shown when "Other" is selected) */}
              {formData.classification === "other" && (
                <div>
                  <Label className="text-slate-200">Custom Classification *</Label>
                  <Input
                    value={formData.classificationOther}
                    onChange={(e) => handleChange("classificationOther", e.target.value)}
                    placeholder="e.g., Club Team, Recreation League"
                    className="bg-slate-900/50 border-slate-600 text-white"
                    data-testid="classification-other-input"
                  />
                </div>
              )}

              {/* Logo */}
              <div>
                <Label className="text-slate-200">School Logo (optional)</Label>
                <div className="flex gap-2 mt-2 mb-3">
                  <Button
                    type="button"
                    variant={logoType === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogoType("url")}
                    className={logoType === "url" ? "bg-orange-500 hover:bg-orange-600" : "border-slate-600 text-slate-300"}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={logoType === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLogoType("upload")}
                    className={logoType === "upload" ? "bg-orange-500 hover:bg-orange-600" : "border-slate-600 text-slate-300"}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </Button>
                </div>
                
                {logoType === "url" ? (
                  <Input
                    value={formData.logoUrl}
                    onChange={(e) => handleChange("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                )}
                
                {formData.logoUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain rounded border border-slate-600"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange("logoUrl", "")}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Account */}
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Admin Account</CardTitle>
              <CardDescription>Your account will be the administrator for this school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-200">Your Name *</Label>
                <Input
                  value={formData.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                  placeholder="John Smith"
                  className="bg-slate-900/50 border-slate-600 text-white"
                  data-testid="user-name-input"
                />
              </div>
              
              <div>
                <Label className="text-slate-200">Email *</Label>
                <Input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => handleChange("userEmail", e.target.value)}
                  placeholder="john.smith@school.edu"
                  className="bg-slate-900/50 border-slate-600 text-white"
                  data-testid="user-email-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Password *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    className="bg-slate-900/50 border-slate-600 text-white"
                    data-testid="password-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Confirm Password *</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                    className="bg-slate-900/50 border-slate-600 text-white"
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Questions */}
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Security Questions</CardTitle>
              <CardDescription>These will be used to recover your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-200">Security Question 1 *</Label>
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
                <Label className="text-slate-200">Security Question 2 *</Label>
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

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || nameAvailable === false}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
            data-testid="submit-btn"
          >
            {loading ? "Creating School Account..." : "Create School Account"}
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
