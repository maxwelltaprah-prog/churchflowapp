import { useQuery } from "@tanstack/react-query";
import { X, Users, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@/hooks/useGroupsData";

interface GroupMembersDrawerProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GroupMember {
  id: string;
  member_id: string;
  joined_at: string;
  members: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    photo_url: string | null;
    is_active: boolean | null;
  };
}

export function GroupMembersDrawer({ group, open, onOpenChange }: GroupMembersDrawerProps) {
  const { data: members, isLoading } = useQuery({
    queryKey: ["group-members", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      
      const { data, error } = await supabase
        .from("member_groups")
        .select(`
          id,
          member_id,
          joined_at,
          members!inner (
            id,
            full_name,
            phone,
            email,
            photo_url,
            is_active
          )
        `)
        .eq("group_id", group.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as unknown as GroupMember[];
    },
    enabled: !!group?.id && open,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {group?.name}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {members?.length || 0} member{members?.length !== 1 ? "s" : ""} in this group
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : members?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No members in this group yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={item.members.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(item.members.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.members.full_name}</p>
                      {!item.members.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {item.members.phone && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3" />
                          {item.members.phone}
                        </span>
                      )}
                      {item.members.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {item.members.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
