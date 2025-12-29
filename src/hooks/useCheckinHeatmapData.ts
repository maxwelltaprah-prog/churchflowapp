import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchAccess, applyBranchFilter } from "./useBranchAccess";
import { format, parseISO, getHours, getMinutes } from "date-fns";

export interface ServiceInstance {
  id: string;
  name: string;
  serviceDate: string;
  startTime: string | null;
  branchId: string;
  branchName?: string;
}

export interface HeatmapCell {
  hour: number;
  row: string; // Either minute bucket or service label
  rowIndex: number;
  count: number;
  serviceId?: string;
  serviceName?: string;
  serviceDate?: string;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  hours: number[];
  rows: string[];
  maxCount: number;
  peakHour: number | null;
  peakCount: number;
  totalCheckins: number;
  hasData: boolean;
}

/**
 * Fetch service instances within date range
 */
export function useServiceInstances(
  startDate: Date,
  endDate: Date,
  branchId?: string
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["heatmap-service-instances", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      let query = supabase
        .from("services")
        .select("id, name, service_date, start_time, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(startDate, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: false })
        .order("start_time", { ascending: false });

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        serviceDate: s.service_date,
        startTime: s.start_time,
        branchId: s.branch_id,
        branchName: (s.branches as any)?.name || "Unknown",
      })) as ServiceInstance[];
    },
    enabled: !!profile?.church_id,
  });
}

/**
 * Main heatmap data hook
 * - Single service: rows = 10-minute buckets, columns = hours
 * - All services: rows = service instances, columns = hours
 */
export function useCheckinHeatmapData(
  startDate: Date,
  endDate: Date,
  branchId?: string,
  serviceId?: string // undefined = all services
) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["checkin-heatmap", profile?.church_id, startDate.toISOString(), endDate.toISOString(), branchId, serviceId, accessibleBranchIds],
    queryFn: async (): Promise<HeatmapData> => {
      if (!profile?.church_id) {
        return { cells: [], hours: [], rows: [], maxCount: 0, peakHour: null, peakCount: 0, totalCheckins: 0, hasData: false };
      }

      // Fetch services in range
      let servicesQuery = supabase
        .from("services")
        .select("id, name, service_date, start_time, branch_id, branches(name)")
        .eq("church_id", profile.church_id)
        .gte("service_date", format(startDate, "yyyy-MM-dd"))
        .lte("service_date", format(endDate, "yyyy-MM-dd"))
        .eq("is_active", true)
        .order("service_date", { ascending: true })
        .order("start_time", { ascending: true });

      servicesQuery = applyBranchFilter(servicesQuery, "branch_id", branchId, accessibleBranchIds);
      
      if (serviceId) {
        servicesQuery = servicesQuery.eq("id", serviceId);
      }

      const { data: services, error: servicesError } = await servicesQuery;
      if (servicesError) throw servicesError;

      if (!services?.length) {
        return { cells: [], hours: [], rows: [], maxCount: 0, peakHour: null, peakCount: 0, totalCheckins: 0, hasData: false };
      }

      const serviceIds = services.map(s => s.id);

      // Fetch attendance for these services
      let attendanceQuery = supabase
        .from("attendance")
        .select("service_id, checked_in_at")
        .eq("church_id", profile.church_id)
        .in("service_id", serviceIds);

      attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", branchId, accessibleBranchIds);

      const { data: attendance, error: attendanceError } = await attendanceQuery;
      if (attendanceError) throw attendanceError;

      if (!attendance?.length) {
        return { cells: [], hours: [], rows: [], maxCount: 0, peakHour: null, peakCount: 0, totalCheckins: 0, hasData: false };
      }

      const isSingleService = !!serviceId;

      if (isSingleService) {
        // Single service mode: rows = 10-minute buckets
        return buildSingleServiceHeatmap(attendance, services[0]);
      } else {
        // All services mode: rows = service instances
        return buildAllServicesHeatmap(attendance, services);
      }
    },
    enabled: !!profile?.church_id,
  });
}

function buildSingleServiceHeatmap(
  attendance: { service_id: string; checked_in_at: string }[],
  service: { id: string; name: string; service_date: string; start_time: string | null; branches: unknown }
): HeatmapData {
  // Create 10-minute buckets for rows (00, 10, 20, 30, 40, 50)
  const minuteBuckets = [0, 10, 20, 30, 40, 50];
  const rows = minuteBuckets.map(m => `:${m.toString().padStart(2, "0")}`);

  // Determine hour range from data
  const hours = new Set<number>();
  const checkinMatrix: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  attendance.forEach(a => {
    const checkinTime = new Date(a.checked_in_at);
    const hour = getHours(checkinTime);
    const minute = getMinutes(checkinTime);
    const bucket = Math.floor(minute / 10) * 10;
    
    hours.add(hour);
    const key = `${hour}-${bucket}`;
    checkinMatrix[key] = (checkinMatrix[key] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  
  // Build cells
  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  sortedHours.forEach(hour => {
    minuteBuckets.forEach((bucket, rowIndex) => {
      const key = `${hour}-${bucket}`;
      const count = checkinMatrix[key] || 0;
      maxCount = Math.max(maxCount, count);
      
      cells.push({
        hour,
        row: `:${bucket.toString().padStart(2, "0")}`,
        rowIndex,
        count,
        serviceId: service.id,
        serviceName: service.name,
        serviceDate: service.service_date,
      });
    });
  });

  // Find peak hour
  let peakHour: number | null = null;
  let peakCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > peakCount) {
      peakHour = parseInt(hour);
      peakCount = count;
    }
  });

  return {
    cells,
    hours: sortedHours,
    rows,
    maxCount,
    peakHour,
    peakCount,
    totalCheckins: attendance.length,
    hasData: cells.some(c => c.count > 0),
  };
}

function buildAllServicesHeatmap(
  attendance: { service_id: string; checked_in_at: string }[],
  services: { id: string; name: string; service_date: string; start_time: string | null; branches: unknown }[]
): HeatmapData {
  // Rows = service instances
  const serviceMap = new Map(services.map((s, i) => [s.id, { 
    index: i, 
    label: `${s.name} — ${format(parseISO(s.service_date), "MMM d")}`,
    ...s
  }]));
  
  const rows = services.map(s => `${s.name} — ${format(parseISO(s.service_date), "MMM d")}`);

  // Build hour range and matrix
  const hours = new Set<number>();
  const checkinMatrix: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  attendance.forEach(a => {
    const checkinTime = new Date(a.checked_in_at);
    const hour = getHours(checkinTime);
    const serviceInfo = serviceMap.get(a.service_id);
    if (!serviceInfo) return;
    
    hours.add(hour);
    const key = `${hour}-${serviceInfo.index}`;
    checkinMatrix[key] = (checkinMatrix[key] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  
  // Build cells
  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  sortedHours.forEach(hour => {
    services.forEach((service, rowIndex) => {
      const key = `${hour}-${rowIndex}`;
      const count = checkinMatrix[key] || 0;
      maxCount = Math.max(maxCount, count);
      
      cells.push({
        hour,
        row: `${service.name} — ${format(parseISO(service.service_date), "MMM d")}`,
        rowIndex,
        count,
        serviceId: service.id,
        serviceName: service.name,
        serviceDate: service.service_date,
      });
    });
  });

  // Find peak hour
  let peakHour: number | null = null;
  let peakCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > peakCount) {
      peakHour = parseInt(hour);
      peakCount = count;
    }
  });

  return {
    cells,
    hours: sortedHours,
    rows,
    maxCount,
    peakHour,
    peakCount,
    totalCheckins: attendance.length,
    hasData: cells.some(c => c.count > 0),
  };
}
