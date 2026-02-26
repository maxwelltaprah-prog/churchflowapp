import { supabase } from "@/integrations/supabase/client";

// Generate a URL-friendly slug from a name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Generate a random code for branch join codes
export function generateJoinCode(churchSlug: string, branchName: string): string {
  const branchPrefix = branchName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase();
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${churchSlug.toUpperCase().substring(0, 3)}-${branchPrefix}-${randomNum}`;
}

// Generate a member code
export function generateMemberCode(churchSlug: string): string {
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `${churchSlug.toUpperCase().substring(0, 3)}-${randomNum}`;
}

// Generate a QR token (UUID-like)
export function generateQRToken(): string {
  return crypto.randomUUID();
}

interface CreateChurchParams {
  churchName: string;
  adminName: string;
  email: string;
  password: string;
}

export async function createChurchWithAdmin({ churchName, adminName, email, password }: CreateChurchParams) {
  const slug = generateSlug(churchName);

  // 1. Sign up the user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/app`,
      data: { full_name: adminName },
    },
  });

  if (signUpError) throw signUpError;
  if (!authData.user) throw new Error("Failed to create user");

  // If email confirmation is enabled, the session may be null. We must be authenticated
  // to create the church due to RLS.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error(
      "Account created. Please check your email to confirm, then sign in to finish setup."
    );
  }

  const userId = authData.user.id;
  const churchId = crypto.randomUUID();
  const branchId = crypto.randomUUID();

  // 2. Create the church (user can insert because they have no existing church_admin role)
  const { error: churchError } = await supabase.from("churches").insert({
    id: churchId,
    name: churchName,
    slug,
  });

  if (churchError) throw churchError;

  // 3. Assign church_admin role BEFORE creating branch (branch INSERT RLS requires is_church_admin)
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    church_id: churchId,
    role: "church_admin",
  });

  if (roleError) throw roleError;

  // 4. Create the main branch (now allowed because user has church_admin role)
  const joinCode = generateJoinCode(slug, "Main");
  const { error: branchError } = await supabase.from("branches").insert({
    id: branchId,
    church_id: churchId,
    name: "Main Branch",
    is_main_branch: true,
    join_code: joinCode,
  });

  if (branchError) throw branchError;

  // 5. Upsert the user's profile with church info
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: adminName,
        church_id: churchId,
        branch_id: branchId,
      },
      { onConflict: "id" }
    );

  if (profileError) throw profileError;

  return {
    church: { id: churchId, name: churchName, slug },
    branch: { id: branchId, name: "Main Branch", join_code: joinCode },
    user: authData.user,
  };
}

interface JoinBranchParams {
  branchCode: string;
  fullName: string;
  phone: string;
  gender?: "male" | "female";
  membershipStatus?: "active" | "inactive" | "transferred";
}

export async function joinBranchAsMember({ branchCode, fullName, phone, gender, membershipStatus }: JoinBranchParams) {
  // 1. Find the branch by join code
  const normalizedCode = branchCode.trim().toUpperCase();

  const { data: branchData, error: branchError } = await supabase
    .from("branches")
    .select("id, church_id, name, join_code")
    .eq("join_code", normalizedCode)
    .maybeSingle();

  if (branchError) throw branchError;
  if (!branchData) throw new Error("Branch not found. Please check the code and try again.");

  const churchId = branchData.church_id;
  const branchId = branchData.id;

  // 2. Generate member code and QR token
  // Use the join code prefix (first 3 chars) so we don't need to read church data in the public join flow.
  const memberCode = generateMemberCode(branchData.join_code);
  const qrToken = generateQRToken();

  const normalizedGender = gender === "male" || gender === "female" ? gender : undefined;
  const normalizedStatus =
    membershipStatus === "active" || membershipStatus === "inactive" || membershipStatus === "transferred"
      ? membershipStatus
      : undefined;

  // 3. Create the member record (no RETURNING; SELECT is restricted for privacy)
  const { error: memberError } = await supabase
    .from("members")
    .insert({
      church_id: churchId,
      branch_id: branchId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      gender: normalizedGender,
      membership_status: normalizedStatus || "active",
      member_code: memberCode,
      qr_code_token: qrToken,
    });

  if (memberError) throw memberError;

  return {
    member: { member_code: memberCode, qr_code_token: qrToken },
    branch: branchData,
  };
}

interface RecordAttendanceParams {
  serviceId: string;
  memberId: string;
  churchId: string;
  branchId: string;
  checkedInBy?: string;
  checkinMethod?: "staff_scan" | "self_scan";
  memberHomeBranchId?: string;
}

export async function recordAttendance({ 
  serviceId, 
  memberId, 
  churchId, 
  branchId, 
  checkedInBy,
  checkinMethod = "staff_scan",
  memberHomeBranchId
}: RecordAttendanceParams) {
  const isCrossBranch = memberHomeBranchId && memberHomeBranchId !== branchId;

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      church_id: churchId,
      branch_id: branchId,
      service_id: serviceId,
      member_id: memberId,
      checked_in_by: checkedInBy,
      checkin_method: checkinMethod,
      is_cross_branch: isCrossBranch,
      member_home_branch_id: isCrossBranch ? memberHomeBranchId : null
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Member already checked in for this service");
    }
    throw error;
  }

  return data;
}
