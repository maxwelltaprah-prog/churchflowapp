import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { startOfDay, endOfDay, subHours, parseISO, formatDistanceToNow } from "date-fns";

export type FeedMode = "today" | "open_service" | "last_24h" | "by_service";

export interface CheckinFeedItem {
  id: string;
  memberId: string;
  memberName: string;
  memberStatus: string;
  memberPhoto: string | null;
  memberPhone: string | null;
  memberEmail: string | null;
  memberGender: string | null;
  memberDateOfBirth: string | null;
  memberMaritalStatus: string | null;
  memberOccupation: string | null;
  memberResidentialArea: string | null;
  memberAreaZone: string | null;
  memberDateJoined: string | null;
  memberType: string | null;
  branchId: string;
  branchName: string;
  serviceId: string;
  serviceName: string;
  checkedInAt: string;
  checkinMethod: string | null;
  isNew?: boolean;
  isVisitor?: boolean;
}

export function useLiveCheckinFeed(mode: FeedMode = "today", branchId?: string, serviceId?: string) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();
  const queryClient = useQueryClient();
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  // Get date range based on mode
  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (mode) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "last_24h":
        return { start: subHours(now, 24), end: now };
      case "open_service":
        // Will filter by service later
        return { start: startOfDay(now), end: endOfDay(now) };
      case "by_service":
        // No date restriction for by_service mode - fetch all historical data
        return { start: null, end: null };
    }
  }, [mode]);

  // Main query for fetching check-ins (members + visitors)
  const query = useQuery({
    queryKey: ["live-checkin-feed", profile?.church_id, branchId, mode, accessibleBranchIds, serviceId],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      const { start, end } = getDateRange();

      // Fetch member check-ins
      let memberQuery = supabase
        .from("attendance")
        .select(`
          id,
          member_id,
          branch_id,
          service_id,
          checked_in_at,
          checkin_method,
          members!inner(full_name, membership_status, photo_url, phone, email, gender, date_of_birth, marital_status, occupation, residential_area, area_zone, date_joined, member_type),
          services!inner(name, service_date, start_time, end_time),
          branches!attendance_branch_id_fkey(name)
        `)
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false });

      // Apply date filters only if not in by_service mode
      if (start && end) {
        memberQuery = memberQuery
          .gte("checked_in_at", start.toISOString())
          .lte("checked_in_at", end.toISOString());
      }

      // Apply service filter in by_service mode
      if (mode === "by_service" && serviceId) {
        memberQuery = memberQuery.eq("service_id", serviceId);
      }

      memberQuery = memberQuery.limit(mode === "by_service" ? 200 : 50);

      memberQuery = applyBranchFilter(memberQuery, "branch_id", branchId, accessibleBranchIds);

      // Fetch visitor check-ins
      let visitorQuery = supabase
        .from("visitor_checkins")
        .select(`
          id,
          visitor_id,
          service_id,
          checked_in_at,
          checkin_method,
          visitors!inner(first_name, last_name, phone, email, gender, date_of_birth, address, branch_id),
          services!inner(name, service_date, start_time, end_time, branch_id, branches!services_branch_id_fkey(name))
        `)
        .eq("church_id", profile.church_id)
        .order("checked_in_at", { ascending: false });

      // Apply date filters only if not in by_service mode
      if (start && end) {
        visitorQuery = visitorQuery
          .gte("checked_in_at", start.toISOString())
          .lte("checked_in_at", end.toISOString());
      }

      // Apply service filter in by_service mode
      if (mode === "by_service" && serviceId) {
        visitorQuery = visitorQuery.eq("service_id", serviceId);
      }

      visitorQuery = visitorQuery.limit(mode === "by_service" ? 200 : 50);

      const [memberResult, visitorResult] = await Promise.all([memberQuery, visitorQuery]);

      if (memberResult.error) throw memberResult.error;
      if (visitorResult.error) throw visitorResult.error;

      const memberItems: CheckinFeedItem[] = (memberResult.data || []).map((item: any) => ({
        id: item.id,
        memberId: item.member_id,
        memberName: item.members?.full_name || "Unknown Member",
        memberStatus: item.members?.membership_status || "member",
        memberPhoto: item.members?.photo_url || null,
        memberPhone: item.members?.phone || null,
        memberEmail: item.members?.email || null,
        memberGender: item.members?.gender || null,
        memberDateOfBirth: item.members?.date_of_birth || null,
        memberMaritalStatus: item.members?.marital_status || null,
        memberOccupation: item.members?.occupation || null,
        memberResidentialArea: item.members?.residential_area || null,
        memberAreaZone: item.members?.area_zone || null,
        memberDateJoined: item.members?.date_joined || null,
        memberType: item.members?.member_type || null,
        branchId: item.branch_id,
        branchName: item.branches?.name || "Unknown Branch",
        serviceId: item.service_id,
        serviceName: item.services?.name || "Unknown Service",
        checkedInAt: item.checked_in_at,
        checkinMethod: item.checkin_method,
        isNew: false,
        isVisitor: false,
      }));

      const visitorItems: CheckinFeedItem[] = (visitorResult.data || []).map((item: any) => ({
        id: `visitor-${item.id}`,
        memberId: item.visitor_id,
        memberName: `${item.visitors?.first_name || ""} ${item.visitors?.last_name || ""}`.trim() || "Unknown Visitor",
        memberStatus: "visitor",
        memberPhoto: null,
        memberPhone: item.visitors?.phone || null,
        memberEmail: item.visitors?.email || null,
        memberGender: item.visitors?.gender || null,
        memberDateOfBirth: item.visitors?.date_of_birth || null,
        memberMaritalStatus: null,
        memberOccupation: null,
        memberResidentialArea: item.visitors?.address || null,
        memberAreaZone: null,
        memberDateJoined: null,
        memberType: null,
        branchId: item.visitors?.branch_id || item.services?.branch_id || "",
        branchName: item.services?.branches?.name || "Unknown Branch",
        serviceId: item.service_id,
        serviceName: item.services?.name || "Unknown Service",
        checkedInAt: item.checked_in_at,
        checkinMethod: item.checkin_method,
        isNew: false,
        isVisitor: true,
      }));

      // Merge and sort by check-in time
      const allItems = [...memberItems, ...visitorItems].sort(
        (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
      );

      // Apply branch filter to visitors if needed
      let filteredItems = allItems;
      if (branchId) {
        filteredItems = allItems.filter(item => item.branchId === branchId);
      } else if (accessibleBranchIds !== null) {
        filteredItems = allItems.filter(item => accessibleBranchIds.includes(item.branchId));
      }

      return filteredItems.slice(0, mode === "by_service" ? 200 : 50);
    },
    enabled: !!profile?.church_id && !accessLoading && (mode !== "by_service" || !!serviceId),
    refetchInterval: mode === "by_service" ? false : 30000, // No polling for historical view
  });

  // Real-time subscription for new member check-ins (only for live modes)
  useEffect(() => {
    if (!profile?.church_id || mode === "by_service") return;

    const memberChannel = supabase
      .channel("live-member-checkins")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
          filter: `church_id=eq.${profile.church_id}`,
        },
        async (payload) => {
          const newRecord = payload.new as any;
          
          // Check if this record is within our branch scope
          if (accessibleBranchIds !== null && !accessibleBranchIds.includes(newRecord.branch_id)) {
            return;
          }

          // If specific branch filter is set, check it
          if (branchId && newRecord.branch_id !== branchId) {
            return;
          }

          // Fetch the full record with joins
          const { data: fullRecord } = await supabase
            .from("attendance")
            .select(`
              id,
              member_id,
              branch_id,
              service_id,
              checked_in_at,
              checkin_method,
              members!inner(full_name, membership_status, photo_url, phone, email, gender, date_of_birth, marital_status, occupation, residential_area, area_zone, date_joined, member_type),
              services!inner(name),
              branches!attendance_branch_id_fkey(name)
            `)
            .eq("id", newRecord.id)
            .single();

          if (fullRecord) {
            const members = fullRecord.members as any;
            const newItem: CheckinFeedItem = {
              id: fullRecord.id,
              memberId: fullRecord.member_id,
              memberName: members?.full_name || "Unknown Member",
              memberStatus: members?.membership_status || "member",
              memberPhoto: members?.photo_url || null,
              memberPhone: members?.phone || null,
              memberEmail: members?.email || null,
              memberGender: members?.gender || null,
              memberDateOfBirth: members?.date_of_birth || null,
              memberMaritalStatus: members?.marital_status || null,
              memberOccupation: members?.occupation || null,
              memberResidentialArea: members?.residential_area || null,
              memberAreaZone: members?.area_zone || null,
              memberDateJoined: members?.date_joined || null,
              memberType: members?.member_type || null,
              branchId: fullRecord.branch_id,
              branchName: (fullRecord.branches as any)?.name || "Unknown Branch",
              serviceId: fullRecord.service_id,
              serviceName: (fullRecord.services as any)?.name || "Unknown Service",
              checkedInAt: fullRecord.checked_in_at,
              checkinMethod: fullRecord.checkin_method,
              isNew: true,
              isVisitor: false,
            };

            // Add to new items set for highlighting
            setNewItemIds((prev) => new Set(prev).add(newItem.id));

            // Remove highlight after 5 seconds
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(newItem.id);
                return next;
              });
            }, 5000);

            // Prepend to cache
            queryClient.setQueryData<CheckinFeedItem[]>(
              ["live-checkin-feed", profile.church_id, branchId, mode, accessibleBranchIds, serviceId],
              (old) => {
                if (!old) return [newItem];
                // Prevent duplicates
                if (old.some((item) => item.id === newItem.id)) return old;
                return [newItem, ...old].slice(0, 50);
              }
            );
          }
        }
      )
      .subscribe();

    // Real-time subscription for new visitor check-ins
    const visitorChannel = supabase
      .channel("live-visitor-checkins")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visitor_checkins",
          filter: `church_id=eq.${profile.church_id}`,
        },
        async (payload) => {
          const newRecord = payload.new as any;

          // Fetch the full record with joins
          const { data: fullRecord } = await supabase
            .from("visitor_checkins")
            .select(`
              id,
              visitor_id,
              service_id,
              checked_in_at,
              checkin_method,
              visitors!inner(first_name, last_name, phone, email, gender, date_of_birth, address, branch_id),
              services!inner(name, branch_id, branches!services_branch_id_fkey(name))
            `)
            .eq("id", newRecord.id)
            .single();

          if (fullRecord) {
            const visitor = fullRecord.visitors as any;
            const visitorBranchId = visitor?.branch_id || (fullRecord.services as any)?.branch_id || "";

            // Check if this record is within our branch scope
            if (accessibleBranchIds !== null && !accessibleBranchIds.includes(visitorBranchId)) {
              return;
            }

            // If specific branch filter is set, check it
            if (branchId && visitorBranchId !== branchId) {
              return;
            }

            const newItem: CheckinFeedItem = {
              id: `visitor-${fullRecord.id}`,
              memberId: fullRecord.visitor_id,
              memberName: `${visitor?.first_name || ""} ${visitor?.last_name || ""}`.trim() || "Unknown Visitor",
              memberStatus: "visitor",
              memberPhoto: null,
              memberPhone: visitor?.phone || null,
              memberEmail: visitor?.email || null,
              memberGender: visitor?.gender || null,
              memberDateOfBirth: visitor?.date_of_birth || null,
              memberMaritalStatus: null,
              memberOccupation: null,
              memberResidentialArea: visitor?.address || null,
              memberAreaZone: null,
              memberDateJoined: null,
              memberType: null,
              branchId: visitorBranchId,
              branchName: (fullRecord.services as any)?.branches?.name || "Unknown Branch",
              serviceId: fullRecord.service_id,
              serviceName: (fullRecord.services as any)?.name || "Unknown Service",
              checkedInAt: fullRecord.checked_in_at,
              checkinMethod: fullRecord.checkin_method,
              isNew: true,
              isVisitor: true,
            };

            // Add to new items set for highlighting
            setNewItemIds((prev) => new Set(prev).add(newItem.id));

            // Remove highlight after 5 seconds
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(newItem.id);
                return next;
              });
            }, 5000);

            // Prepend to cache
            queryClient.setQueryData<CheckinFeedItem[]>(
              ["live-checkin-feed", profile.church_id, branchId, mode, accessibleBranchIds, serviceId],
              (old) => {
                if (!old) return [newItem];
                // Prevent duplicates
                if (old.some((item) => item.id === newItem.id)) return old;
                return [newItem, ...old].slice(0, 50);
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
      supabase.removeChannel(visitorChannel);
    };
  }, [profile?.church_id, branchId, accessibleBranchIds, mode, queryClient, serviceId]);

  // Merge isNew status into items
  const itemsWithNewStatus = (query.data || []).map((item) => ({
    ...item,
    isNew: newItemIds.has(item.id),
  }));

  return {
    items: itemsWithNewStatus,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Helper to format relative time
export function formatCheckinTime(dateString: string): { relative: string; exact: string } {
  const date = parseISO(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let relative: string;
  if (diffMins < 1) {
    relative = "Just now";
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else {
    relative = formatDistanceToNow(date, { addSuffix: true });
  }

  const exact = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return { relative, exact };
}

// Helper to get initials from name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper to get status badge variant
export function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "first_timer":
      return "destructive";
    case "visitor":
      return "secondary";
    default:
      return "outline";
  }
}

// Format status label
export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
