import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Mail, Send, CheckCircle } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    school: "",
    state: "",
    role: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.school || !formData.state || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/contact`, formData);
      setSubmitted(true);
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Message Sent!</h1>
          <p className="text-slate-400 mb-8">
            Thank you for your interest in StatMoose. We'll get back to you as soon as possible.
          </p>
          <Link to="/">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-white">StatMoose</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Contact Form */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Contact Us</h1>
            <p className="text-slate-400 text-lg">
              Interested in StatMoose for your school? Fill out the form below and we'll be in touch.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">
                  Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-white mb-2 block">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@school.edu"
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* School */}
              <div>
                <Label htmlFor="school" className="text-white mb-2 block">
                  School <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  placeholder="School or University name"
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* State */}
              <div>
                <Label htmlFor="state" className="text-white mb-2 block">
                  State <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white focus:border-emerald-500">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {usStates.map(state => (
                      <SelectItem 
                        key={state} 
                        value={state}
                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                      >
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-white mb-2 block">
                  Role <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white focus:border-emerald-500">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="SID" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      Sports Information Director (SID)
                    </SelectItem>
                    <SelectItem value="Athletic Director" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      Athletic Director
                    </SelectItem>
                    <SelectItem value="Coach" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      Coach
                    </SelectItem>
                    <SelectItem value="Other" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-white mb-2 block">
                  Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your needs or ask any questions..."
                  rows={5}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Alternative Contact */}
          <p className="text-center text-slate-500 mt-8">
            Or email us directly at{" "}
            <a href="mailto:jaredmoosejones@gmail.com" className="text-emerald-400 hover:text-emerald-300">
              jaredmoosejones@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
