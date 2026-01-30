import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Phone, Mail, MapPin, Church } from "lucide-react";

interface MemberProfileSectionProps {
  member: {
    full_name: string;
    member_code: string;
    phone: string | null;
    email: string | null;
    branches: { name: string } | null;
    churches: { name: string } | null;
  };
  onBack: () => void;
}

export function MemberProfileSection({ member, onBack }: MemberProfileSectionProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">{member.full_name}</CardTitle>
          <p className="text-sm text-muted-foreground">Member ID: {member.member_code}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {member.phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{member.phone}</p>
                </div>
              </div>
            )}
            
            {member.email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{member.email}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Church className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Church</p>
                <p className="font-medium">{member.churches?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Branch</p>
                <p className="font-medium">{member.branches?.name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
