import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Beaker, MessageSquare, Gift, X } from "lucide-react";
import { useState } from "react";

export function TrialBanner() {
  const { isChurchAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show to church admins
  if (!isChurchAdmin() || dismissed) {
    return null;
  }

  return (
    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4 border rounded-lg mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Beaker className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-900 flex items-center gap-2">
            You're in the Testing Phase
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              All Features Free
            </span>
          </span>
          <p className="text-sm text-slate-600">
            We'd love your feedback! Share your thoughts at{" "}
            <a 
              href="mailto:info@easychurchflow.com" 
              className="font-medium text-indigo-600 hover:text-indigo-700 underline"
            >
              info@easychurchflow.com
            </a>
          </p>
          <p className="text-sm text-purple-600 flex items-center gap-1">
            <Gift className="h-3.5 w-3.5" />
            <span className="font-medium">Special discount for constructive feedback!</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a href="mailto:info@easychurchflow.com?subject=ChurchFlow Feedback">
          <Button
            size="sm"
            variant="default"
            className="whitespace-nowrap bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Send Feedback
          </Button>
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
