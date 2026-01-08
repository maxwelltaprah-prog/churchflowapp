import { useSubscription, useChurchTotals } from "./useSubscription";

export interface TierLimit {
  tierName: string;
  limit: number;
  nextTierName: string | null;
  nextTierPrice: number | null;
}

export interface MemberTierStatus {
  currentMembers: number;
  tierLimit: number;
  tierName: string;
  nextTierName: string | null;
  nextTierPrice: number | null;
  isAtLimit: boolean;
  isApproachingLimit: boolean;
  remainingSlots: number;
  warningThreshold: number;
  canAddMember: boolean;
  isLoading: boolean;
}

// Define tier boundaries
const TIERS: TierLimit[] = [
  { tierName: "Starter", limit: 149, nextTierName: "Growth", nextTierPrice: 299 },
  { tierName: "Growth", limit: 5000, nextTierName: "Enterprise", nextTierPrice: 599 },
  { tierName: "Enterprise", limit: Infinity, nextTierName: null, nextTierPrice: null },
];

function getTierForMemberCount(members: number): TierLimit {
  if (members < 150) return TIERS[0]; // Starter: 0-149
  if (members <= 5000) return TIERS[1]; // Growth: 150-5000
  return TIERS[2]; // Enterprise: 5001+
}

export function useMemberTierLimit(): MemberTierStatus {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: totals, isLoading: totalsLoading } = useChurchTotals();

  const isLoading = subLoading || totalsLoading;
  const currentMembers = totals?.total_members || 0;

  // Get current tier info
  const currentTier = getTierForMemberCount(currentMembers);
  
  // Calculate remaining slots and warning threshold
  const remainingSlots = Math.max(0, currentTier.limit - currentMembers);
  const warningThreshold = Math.floor(currentTier.limit * 0.93); // Warn at ~93% (e.g., 139/149 for Starter)
  
  // Determine status
  const isAtLimit = currentMembers >= currentTier.limit;
  const isApproachingLimit = !isAtLimit && currentMembers >= warningThreshold;

  // During trial or active subscription, check if at limit
  // For Starter tier (< 150), limit is 149 members
  // User must upgrade to add more
  const subscriptionStatus = subscription?.status;
  const isActiveOrTrialing = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  
  // Can add member if not at limit, or if on unlimited Enterprise tier
  const canAddMember = !isAtLimit || currentTier.tierName === "Enterprise";

  return {
    currentMembers,
    tierLimit: currentTier.limit === Infinity ? currentMembers : currentTier.limit,
    tierName: currentTier.tierName,
    nextTierName: currentTier.nextTierName,
    nextTierPrice: currentTier.nextTierPrice,
    isAtLimit,
    isApproachingLimit,
    remainingSlots: remainingSlots === Infinity ? 999999 : remainingSlots,
    warningThreshold,
    canAddMember,
    isLoading,
  };
}
