import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MemberTitheStats } from "./MemberTitheStats";

interface MemberTithesSectionProps {
  memberId: string;
  onBack: () => void;
}

export function MemberTithesSection({ memberId, onBack }: MemberTithesSectionProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <MemberTitheStats memberId={memberId} />
    </div>
  );
}
