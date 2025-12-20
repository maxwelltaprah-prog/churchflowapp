import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakFlameProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function StreakFlame({ streak, size = "md", animate = true }: StreakFlameProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const flameColors = streak >= 10 
    ? "text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]" 
    : streak >= 4 
    ? "text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]"
    : streak >= 1
    ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
    : "text-muted-foreground/40";

  if (!animate || streak === 0) {
    return <Flame className={`${sizeClasses[size]} ${flameColors}`} />;
  }

  return (
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <Flame className={`${sizeClasses[size]} ${flameColors}`} />
    </motion.div>
  );
}
