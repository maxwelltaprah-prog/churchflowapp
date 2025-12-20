import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateSlug, generateJoinCode } from "@/lib/church-service";

export default function SetupChurch() {
  const [churchName, setChurchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!churchName.trim()) {
      toast.error("Please enter a church name");
      return;
    }

    setIsLoading(true);
    
    try {
      const slug = generateSlug(churchName);

      // 1. Create the church
      const { data: churchData, error: churchError } = await supabase
        .from("churches")
        .insert({
          name: churchName,
          slug: slug
        })
        .select()
        .single();

      if (churchError) throw churchError;

      const churchId = churchData.id;

      // 2. Create the main branch
      const joinCode = generateJoinCode(slug, "Main");
      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .insert({
          church_id: churchId,
          name: "Main Branch",
          is_main_branch: true,
          join_code: joinCode
        })
        .select()
        .single();

      if (branchError) throw branchError;

      // 3. Update the user's profile with church info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          church_id: churchId,
          branch_id: branchData.id
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 4. Assign church_admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          church_id: churchId,
          role: "church_admin"
        });

      if (roleError) throw roleError;

      toast.success("Church created successfully!");
      
      // Force page reload to refresh auth context
      window.location.href = "/app";
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(error.message || "Failed to create church");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
              <Church className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">ChurchFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Set Up Your Church</h1>
          <p className="text-muted-foreground">Create your church to get started</p>
        </div>

        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="churchName">Church Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="churchName"
                  type="text"
                  placeholder="Grace Community Church"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A main branch will be created automatically.
              </p>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Church"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
