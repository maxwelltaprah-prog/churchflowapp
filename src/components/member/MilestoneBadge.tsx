import { motion } from "framer-motion";
import { Trophy, Star, Crown, Zap, Target, Medal } from "lucide-react";

interface MilestoneBadgeProps {
  streak: number;
}

const milestones = [
  { threshold: 52, icon: Crown, label: "Year Champion", color: "from-yellow-400 to-amber-600", glow: "shadow-[0_0_20px_rgba(251,191,36,0.5)]" },
  { threshold: 26, icon: Trophy, label: "Half Year Hero", color: "from-purple-400 to-purple-600", glow: "shadow-[0_0_20px_rgba(168,85,247,0.5)]" },
  { threshold: 12, icon: Star, label: "Quarter Master", color: "from-blue-400 to-blue-600", glow: "shadow-[0_0_20px_rgba(59,130,246,0.5)]" },
  { threshold: 8, icon: Medal, label: "Faithful Eight", color: "from-emerald-400 to-emerald-600", glow: "shadow-[0_0_20px_rgba(52,211,153,0.5)]" },
  { threshold: 4, icon: Zap, label: "Month Warrior", color: "from-orange-400 to-orange-600", glow: "shadow-[0_0_20px_rgba(251,146,60,0.5)]" },
  { threshold: 1, icon: Target, label: "Getting Started", color: "from-slate-400 to-slate-600", glow: "" },
];

export function MilestoneBadge({ streak }: MilestoneBadgeProps) {
  const milestone = milestones.find(m => streak >= m.threshold) || milestones[milestones.length - 1];
  const nextMilestone = milestones.slice().reverse().find(m => streak < m.threshold);
  
  const Icon = milestone.icon;

  return (
    <motion.div 
      className="flex flex-col items-center gap-2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
    >
      <motion.div 
        className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${milestone.color} ${milestone.glow} flex items-center justify-center`}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <Icon className="w-8 h-8 text-white" />
        {streak >= 4 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center text-xs font-bold border-2 border-background"
            style={{ background: `linear-gradient(135deg, hsl(var(--primary)), hsl(25 95% 55%))` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-white text-[10px]">🔥</span>
          </motion.div>
        )}
      </motion.div>
      <div className="text-center">
        <p className="text-sm font-semibold">{milestone.label}</p>
        {nextMilestone && streak > 0 && (
          <p className="text-xs text-muted-foreground">
            {nextMilestone.threshold - streak} weeks to {nextMilestone.label}
          </p>
        )}
      </div>
    </motion.div>
  );
}
