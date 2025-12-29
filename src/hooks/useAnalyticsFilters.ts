import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays,
  parseISO,
  format,
  isValid
} from "date-fns";
import { useBranchAccess } from "./useBranchAccess";

export type DateRangePreset = "today" | "this_week" | "this_month" | "last_7_days" | "last_30_days" | "custom";

export interface AnalyticsFilters {
  datePreset: DateRangePreset;
  startDate: Date;
  endDate: Date;
  branchId: string | null; // null means "all branches"
  serviceId: string | null; // null means "all services"
}

export interface UseAnalyticsFiltersReturn {
  filters: AnalyticsFilters;
  setDatePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (start: Date, end: Date) => void;
  setBranchId: (branchId: string | null) => void;
  setServiceId: (serviceId: string | null) => void;
  resetFilters: () => void;
  // Helper for URL generation (for deep linking from dashboard)
  buildAnalyticsUrl: (overrides?: Partial<Pick<AnalyticsFilters, 'datePreset' | 'branchId'>>) => string;
  // Access control
  accessibleBranchIds: string[] | null;
  isChurchAdmin: boolean;
}

function getDateRangeForPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_7_days":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "last_30_days":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "custom":
    default:
      // For custom, return last 30 days as default
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useAnalyticsFilters(): UseAnalyticsFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessibleBranchIds, isChurchAdmin } = useBranchAccess();
  
  // Parse filters from URL
  const filters = useMemo<AnalyticsFilters>(() => {
    const preset = (searchParams.get("period") as DateRangePreset) || "this_month";
    const customStart = parseDate(searchParams.get("from"));
    const customEnd = parseDate(searchParams.get("to"));
    const branchId = searchParams.get("branch") || null;
    const serviceId = searchParams.get("service") || null;
    
    let dateRange: { start: Date; end: Date };
    
    if (preset === "custom" && customStart && customEnd) {
      dateRange = { start: startOfDay(customStart), end: endOfDay(customEnd) };
    } else {
      dateRange = getDateRangeForPreset(preset);
    }
    
    // Validate branch access
    let validBranchId = branchId;
    if (branchId && accessibleBranchIds !== null && !accessibleBranchIds.includes(branchId)) {
      // User doesn't have access to this branch, reset to first accessible or null
      validBranchId = accessibleBranchIds.length > 0 ? accessibleBranchIds[0] : null;
    }
    
    return {
      datePreset: preset,
      startDate: dateRange.start,
      endDate: dateRange.end,
      branchId: validBranchId,
      serviceId,
    };
  }, [searchParams, accessibleBranchIds]);
  
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);
  
  const setDatePreset = useCallback((preset: DateRangePreset) => {
    if (preset === "custom") {
      // Don't clear custom dates when switching to custom
      updateParams({ period: preset });
    } else {
      updateParams({ period: preset, from: null, to: null });
    }
  }, [updateParams]);
  
  const setCustomDateRange = useCallback((start: Date, end: Date) => {
    updateParams({
      period: "custom",
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    });
  }, [updateParams]);
  
  const setBranchId = useCallback((branchId: string | null) => {
    updateParams({ branch: branchId, service: null }); // Reset service when branch changes
  }, [updateParams]);
  
  const setServiceId = useCallback((serviceId: string | null) => {
    updateParams({ service: serviceId });
  }, [updateParams]);
  
  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);
  
  const buildAnalyticsUrl = useCallback((overrides?: Partial<Pick<AnalyticsFilters, 'datePreset' | 'branchId'>>) => {
    const params = new URLSearchParams();
    
    const preset = overrides?.datePreset ?? filters.datePreset;
    const branch = overrides?.branchId ?? filters.branchId;
    
    if (preset && preset !== "this_month") {
      params.set("period", preset);
    }
    if (branch) {
      params.set("branch", branch);
    }
    
    const queryString = params.toString();
    return `/app/analytics${queryString ? `?${queryString}` : ""}`;
  }, [filters]);
  
  return {
    filters,
    setDatePreset,
    setCustomDateRange,
    setBranchId,
    setServiceId,
    resetFilters,
    buildAnalyticsUrl,
    accessibleBranchIds,
    isChurchAdmin,
  };
}

// Helper to format date range for display
export function formatDateRangeLabel(filters: AnalyticsFilters): string {
  switch (filters.datePreset) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "last_7_days":
      return "Last 7 Days";
    case "last_30_days":
      return "Last 30 Days";
    case "custom":
      return `${format(filters.startDate, "MMM d")} - ${format(filters.endDate, "MMM d, yyyy")}`;
    default:
      return "Select Period";
  }
}

// Preset options for the filter UI
export const DATE_PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];
