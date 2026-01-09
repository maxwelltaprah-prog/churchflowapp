import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronRight, ChevronLeft, Sparkles,
  LayoutDashboard, Users, Calendar, QrCode, BarChart3, Settings, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tip?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to ChurchFlow! 🎉",
    description: "Your church management dashboard is ready. Let's take a quick tour of the key features to help you get started.",
    icon: Sparkles,
    color: "kpi-purple",
    tip: "This tour takes about 1 minute"
  },
  {
    id: "dashboard",
    title: "Care Dashboard",
    description: "Your command center. See real-time attendance, engagement signals, and pastoral care insights all in one place.",
    icon: LayoutDashboard,
    color: "kpi-purple",
    tip: "Check this daily for quick insights"
  },
  {
    id: "members",
    title: "People Directory",
    description: "Manage your congregation with detailed member profiles, contact info, and group assignments. Import existing data or add members one by one.",
    icon: Users,
    color: "kpi-blue",
    tip: "Click 'Add Member' to start building your directory"
  },
  {
    id: "services",
    title: "Services",
    description: "Create services for each gathering. Members check in to services, which drives all your attendance analytics.",
    icon: Calendar,
    color: "kpi-green",
    tip: "Create your first service to enable check-ins"
  },
  {
    id: "checkin",
    title: "Scan to Connect",
    description: "Use QR codes for fast check-ins. Members can scan their personal QR or staff can scan at the door. Both work seamlessly!",
    icon: QrCode,
    color: "kpi-orange",
    tip: "Print member QR cards for faster arrivals"
  },
  {
    id: "analytics",
    title: "Engagement Insights",
    description: "Track attendance trends, identify members who've missed services, and celebrate pastoral milestones like birthdays and anniversaries.",
    icon: BarChart3,
    color: "kpi-teal",
    tip: "Check 'Engagement Signals' for follow-up priorities"
  },
  {
    id: "settings",
    title: "Customize Settings",
    description: "Configure your church profile, add branches, manage admin access, and set up SMS messaging for member communication.",
    icon: Settings,
    color: "kpi-amber",
    tip: "Invite other admins from 'Roles & Access'"
  }
];

const STORAGE_KEY = "churchflow_onboarding_completed";

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay showing the tour for a smoother experience
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
      "kpi-purple": { bg: "bg-kpi-purple/20", text: "text-kpi-purple", glow: "shadow-kpi-purple/30" },
      "kpi-blue": { bg: "bg-kpi-blue/20", text: "text-kpi-blue", glow: "shadow-kpi-blue/30" },
      "kpi-teal": { bg: "bg-kpi-teal/20", text: "text-kpi-teal", glow: "shadow-kpi-teal/30" },
      "kpi-green": { bg: "bg-kpi-green/20", text: "text-kpi-green", glow: "shadow-kpi-green/30" },
      "kpi-orange": { bg: "bg-kpi-orange/20", text: "text-kpi-orange", glow: "shadow-kpi-orange/30" },
      "kpi-amber": { bg: "bg-kpi-amber/20", text: "text-kpi-amber", glow: "shadow-kpi-amber/30" },
    };
    return colorMap[color] || colorMap["kpi-purple"];
  };

  const colors = getColorClasses(step.color);
  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-kpi-purple to-kpi-blue"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-8 pt-10">
              {/* Step indicator */}
              <div className="flex justify-center gap-1.5 mb-6">
                {tourSteps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      idx === currentStep
                        ? "w-6 bg-primary"
                        : idx < currentStep
                        ? "bg-primary/50"
                        : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Icon */}
              <motion.div
                key={step.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center mb-6"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg",
                  colors.bg,
                  colors.glow
                )}>
                  <StepIcon className={cn("w-10 h-10", colors.text)} />
                </div>
              </motion.div>

              {/* Title & Description */}
              <motion.div
                key={`text-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-center space-y-3"
              >
                <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                
                {step.tip && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>{step.tip}</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={isFirstStep ? handleSkip : prevStep}
                className="text-muted-foreground"
              >
                {isFirstStep ? (
                  "Skip tour"
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </>
                )}
              </Button>

              <Button
                onClick={nextStep}
                className="bg-gradient-to-r from-kpi-purple to-kpi-blue hover:opacity-90 text-white px-6"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manually trigger the tour (e.g., from settings)
export function useOnboardingTour() {
  const resetTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  const isTourCompleted = () => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  };

  return { resetTour, isTourCompleted };
}
