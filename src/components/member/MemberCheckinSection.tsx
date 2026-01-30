import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, User, Copy, Check, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

interface MemberCheckinSectionProps {
  member: {
    full_name: string;
    member_code: string;
    qr_code_token: string;
    phone: string | null;
  };
  onBack: () => void;
}

export function MemberCheckinSection({ member, onBack }: MemberCheckinSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(member.member_code);
    setCopied(true);
    toast.success("Member code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Your QR Code
            </CardTitle>
            <CardDescription>
              Show this to staff for quick check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl mb-4">
              <QRCodeSVG value={member.qr_code_token} size={160} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Staff can scan this code to check you in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Member Code
            </CardTitle>
            <CardDescription>
              Use for self check-in at services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Phone Number</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                {member.phone || "Not set"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Enter this for self check-in
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Member ID</p>
                <p className="font-mono font-semibold">{member.member_code}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
