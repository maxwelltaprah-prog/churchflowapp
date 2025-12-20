import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface MilestoneConfettiProps {
  streak: number;
  previousStreak: number | null;
}

const MILESTONES = [4, 8, 12, 26, 52];

export function MilestoneConfetti({ streak, previousStreak }: MilestoneConfettiProps) {
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Only trigger if we've crossed a milestone threshold
    if (previousStreak === null || hasTriggered.current) return;
    
    const crossedMilestone = MILESTONES.find(
      milestone => previousStreak < milestone && streak >= milestone
    );

    if (crossedMilestone) {
      hasTriggered.current = true;
      triggerCelebration(crossedMilestone);
    }
  }, [streak, previousStreak]);

  const triggerCelebration = (milestone: number) => {
    const duration = milestone >= 52 ? 5000 : milestone >= 26 ? 4000 : 3000;
    const particleCount = milestone >= 52 ? 200 : milestone >= 26 ? 150 : 100;

    // Fire confetti from both sides
    const end = Date.now() + duration;

    const colors = milestone >= 52 
      ? ['#FFD700', '#FFA500', '#FF6347', '#FFE4B5'] // Gold celebration
      : milestone >= 26 
      ? ['#9333EA', '#A855F7', '#C084FC', '#E879F9'] // Purple celebration
      : milestone >= 12
      ? ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'] // Blue celebration
      : ['#F97316', '#FB923C', '#FDBA74', '#FED7AA']; // Orange celebration

    const frame = () => {
      confetti({
        particleCount: Math.floor(particleCount / 10),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        shapes: ['circle', 'square'],
        gravity: 1.2,
        scalar: 1.2,
        drift: 0.5,
      });

      confetti({
        particleCount: Math.floor(particleCount / 10),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        shapes: ['circle', 'square'],
        gravity: 1.2,
        scalar: 1.2,
        drift: -0.5,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Special burst for big milestones
    if (milestone >= 26) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { x: 0.5, y: 0.4 },
          colors,
          shapes: ['star'],
          scalar: 1.5,
        });
      }, 500);
    }
  };

  return null;
}

// Hook to track previous streak value
export function usePreviousStreak(streak: number): number | null {
  const ref = useRef<number | null>(null);
  const previous = ref.current;
  
  useEffect(() => {
    ref.current = streak;
  }, [streak]);

  return previous;
}