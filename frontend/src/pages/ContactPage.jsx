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
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
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
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Message Sent!</h1>
          <p className="text-gray-400 mb-8">
            Thank you for your interest in StatMoose. We'll get back to you as soon as possible.
          </p>
          <Link to="/">
            <Button className="bg-white text-black hover:bg-gray-200 font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/logo-white.png" 
              alt="StatMoose" 
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
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
            <p className="text-gray-500 uppercase tracking-widest text-sm mb-4 font-medium">
              Get in Touch
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tight">
              Contact Us
            </h1>
            <p className="text-gray-400 text-lg">
              Interested in StatMoose for your school? Fill out the form below and we'll be in touch.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-lg p-8">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-white mb-2 block font-medium">
                  Name <span className="text-gray-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="bg-black border-gray-700 text-white placeholder:text-gray-600 focus:border-white focus:ring-white"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-white mb-2 block font-medium">
                  Email <span className="text-gray-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@school.edu"
                  className="bg-black border-gray-700 text-white placeholder:text-gray-600 focus:border-white focus:ring-white"
                  required
                />
              </div>

              {/* School */}
              <div>
                <Label htmlFor="school" className="text-white mb-2 block font-medium">
                  School <span className="text-gray-500">*</span>
                </Label>
                <Input
                  id="school"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  placeholder="School or University name"
                  className="bg-black border-gray-700 text-white placeholder:text-gray-600 focus:border-white focus:ring-white"
                  required
                />
              </div>

              {/* State */}
              <div>
                <Label htmlFor="state" className="text-white mb-2 block font-medium">
                  State <span className="text-gray-500">*</span>
                </Label>
                <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger className="bg-black border-gray-700 text-white focus:border-white focus:ring-white">
                    <SelectValue placeholder="Select your state" className="text-gray-600" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 max-h-[300px]">
                    {usStates.map(state => (
                      <SelectItem 
                        key={state} 
                        value={state}
                        className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                      >
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-white mb-2 block font-medium">
                  Role <span className="text-gray-500">*</span>
                </Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="bg-black border-gray-700 text-white focus:border-white focus:ring-white">
                    <SelectValue placeholder="Select your role" className="text-gray-600" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="SID" className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer">
                      Sports Information Director (SID)
                    </SelectItem>
                    <SelectItem value="Athletic Director" className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer">
                      Athletic Director
                    </SelectItem>
                    <SelectItem value="Coach" className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer">
                      Coach
                    </SelectItem>
                    <SelectItem value="Other" className="text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-white mb-2 block font-medium">
                  Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your needs or ask any questions..."
                  rows={5}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-600 focus:border-white focus:ring-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black hover:bg-gray-200 py-6 text-lg font-bold uppercase tracking-wide"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
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
          <p className="text-center text-gray-600 mt-8">
            Or email us directly at{" "}
            <a href="mailto:jaredmoosejones@gmail.com" className="text-white hover:underline">
              jaredmoosejones@gmail.com
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/">
            <img 
              src="/logo-white.png" 
              alt="StatMoose" 
              className="h-6 w-auto opacity-60"
            />
          </Link>
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} StatMoose. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
