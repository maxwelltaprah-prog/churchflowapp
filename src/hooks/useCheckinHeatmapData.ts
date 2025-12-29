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
  endTime: string | null;
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
 * Parse time string (HH:MM:SS) to hour number
 */
function parseTimeToHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":");
  if (parts.length >= 1) {
    return parseInt(parts[0], 10);
  }
  return null;
}

/**
 * Calculate hour range based on service times
 * Start: 3 hours before earliest service start
 * End: 1 hour after latest service end
 */
function calculateHourRange(
  services: { start_time: string | null; end_time: string | null }[]
): number[] {
  let earliestStart = 24;
  let latestEnd = 0;

  services.forEach(service => {
    const startHour = parseTimeToHour(service.start_time);
    const endHour = parseTimeToHour(service.end_time);
    
    if (startHour !== null) {
      earliestStart = Math.min(earliestStart, startHour);
    }
    if (endHour !== null) {
      latestEnd = Math.max(latestEnd, endHour);
    }
  });

  // If no valid times found, default to reasonable range
  if (earliestStart === 24) earliestStart = 8;
  if (latestEnd === 0) latestEnd = 14;

  // Apply 3 hours before start, 1 hour after end
  const rangeStart = Math.max(0, earliestStart - 3);
  const rangeEnd = Math.min(23, latestEnd + 1);

  // Generate array of hours
  const hours: number[] = [];
  for (let h = rangeStart; h <= rangeEnd; h++) {
    hours.push(h);
  }

  return hours;
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
        .select("id, name, service_date, start_time, end_time, branch_id, branches(name)")
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
        endTime: s.end_time,
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

      // Fetch services in range (include end_time for hour range calculation)
      let servicesQuery = supabase
        .from("services")
        .select("id, name, service_date, start_time, end_time, branch_id, branches(name)")
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

      // Calculate hour range based on service times (3hrs before, 1hr after)
      const hourRange = calculateHourRange(services);

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

      const isSingleService = !!serviceId;

      if (isSingleService) {
        // Single service mode: rows = 10-minute buckets
        return buildSingleServiceHeatmap(attendance || [], services[0], hourRange);
      } else {
        // All services mode: rows = service instances
        return buildAllServicesHeatmap(attendance || [], services, hourRange);
      }
    },
    enabled: !!profile?.church_id,
  });
}

function buildSingleServiceHeatmap(
  attendance: { service_id: string; checked_in_at: string }[],
  service: { id: string; name: string; service_date: string; start_time: string | null; end_time: string | null; branches: unknown },
  hourRange: number[]
): HeatmapData {
  // Create 10-minute buckets for rows (00, 10, 20, 30, 40, 50)
  const minuteBuckets = [0, 10, 20, 30, 40, 50];
  const rows = minuteBuckets.map(m => `:${m.toString().padStart(2, "0")}`);

  const checkinMatrix: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  attendance.forEach(a => {
    const checkinTime = new Date(a.checked_in_at);
    const hour = getHours(checkinTime);
    const minute = getMinutes(checkinTime);
    const bucket = Math.floor(minute / 10) * 10;
    
    const key = `${hour}-${bucket}`;
    checkinMatrix[key] = (checkinMatrix[key] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Build cells using the calculated hour range
  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  hourRange.forEach(hour => {
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
    hours: hourRange,
    rows,
    maxCount,
    peakHour,
    peakCount,
    totalCheckins: attendance.length,
    hasData: attendance.length > 0,
  };
}

function buildAllServicesHeatmap(
  attendance: { service_id: string; checked_in_at: string }[],
  services: { id: string; name: string; service_date: string; start_time: string | null; end_time: string | null; branches: unknown }[],
  hourRange: number[]
): HeatmapData {
  // Rows = service instances
  const serviceMap = new Map(services.map((s, i) => [s.id, { 
    index: i, 
    label: `${s.name} — ${format(parseISO(s.service_date), "MMM d")}`,
    ...s
  }]));
  
  const rows = services.map(s => `${s.name} — ${format(parseISO(s.service_date), "MMM d")}`);

  const checkinMatrix: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  attendance.forEach(a => {
    const checkinTime = new Date(a.checked_in_at);
    const hour = getHours(checkinTime);
    const serviceInfo = serviceMap.get(a.service_id);
    if (!serviceInfo) return;
    
    const key = `${hour}-${serviceInfo.index}`;
    checkinMatrix[key] = (checkinMatrix[key] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Build cells using the calculated hour range
  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  hourRange.forEach(hour => {
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
    hours: hourRange,
    rows,
    maxCount,
    peakHour,
    peakCount,
    totalCheckins: attendance.length,
    hasData: attendance.length > 0,
  };
}
