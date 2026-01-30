import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MemberMenuCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  gradient?: string;
  className?: string;
}

export function MemberMenuCard({ 
  title, 
  icon: Icon, 
  onClick, 
  gradient = "from-primary/80 to-primary",
  className 
}: MemberMenuCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative aspect-[4/3] rounded-2xl overflow-hidden group transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className
      )}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br",
        gradient
      )} />
      
      {/* Overlay Pattern */}
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <span className="text-lg font-semibold text-white text-center drop-shadow-md">
          {title}
        </span>
      </div>
      
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
    </button>
  );
}
