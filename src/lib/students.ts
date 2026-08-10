import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type StudentStatus = "active" | "inactive";
export type Relationship = "mother" | "father" | "guardian" | "other";

export type Student = {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  grade_level: string | null;
  class_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  home_address: string | null;
  pickup_notes: string | null;
  status: StudentStatus;
  created_at: string;
};

export type GuardianLink = {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: Relationship;
  is_primary: boolean;
};

export type ParentOption = {
  id: string;
  full_name: string;
  phone: string | null;
};

export type StudentInput = {
  first_name: string;
  last_name: string;
  admission_no: string;
  grade_level: string | null;
  class_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  home_address: string | null;
  pickup_notes: string | null;
  status: StudentStatus;
};

const STUDENT_COLUMNS =
  "id, school_id, first_name, last_name, admission_no, grade_level, class_name, date_of_birth, gender, home_address, pickup_notes, status, created_at";

export const studentKeys = {
  all: ["students"] as const,
  links: ["student-guardians"] as const,
  parents: ["parent-options"] as const,
  children: ["my-children"] as const,
};

export function useStudents() {
  return useQuery({
    queryKey: studentKeys.all,
    queryFn: async (): Promise<Student[]> => {
      const { data, error } = await supabase
        .from("students")
        .select(STUDENT_COLUMNS)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}

export function useGuardianLinks() {
  return useQuery({
    queryKey: studentKeys.links,
    queryFn: async (): Promise<GuardianLink[]> => {
      const { data, error } = await supabase
        .from("student_guardians")
        .select("id, student_id, guardian_id, relationship, is_primary");
      if (error) throw error;
      return (data ?? []) as GuardianLink[];
    },
  });
}

export function useParentOptions() {
  return useQuery({
    queryKey: studentKeys.parents,
    queryFn: async (): Promise<ParentOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "parent")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ParentOption[];
    },
  });
}

export type ChildLink = GuardianLink & { student: Student };

export function useMyChildren() {
  return useQuery({
    queryKey: studentKeys.children,
    queryFn: async (): Promise<ChildLink[]> => {
      const { data, error } = await supabase
        .from("student_guardians")
        .select(
          `id, student_id, guardian_id, relationship, is_primary, student:students(${STUDENT_COLUMNS})`,
        );
      if (error) throw error;
      return ((data ?? []) as unknown as ChildLink[]).filter((row) => row.student);
    },
  });
}

function friendly(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("students_admission_unique")) {
    return "That admission number is already used by another pupil.";
  }
  if (message.includes("student_guardian_unique")) {
    return "That parent is already linked to this pupil.";
  }
  if (message.toLowerCase().includes("row-level security")) {
    return "You don't have permission to make that change.";
  }
  return "We couldn't save that change. Please try again.";
}

export function useSaveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
      schoolId,
    }: {
      id?: string;
      values: StudentInput;
      schoolId: string;
    }) => {
      if (id) {
        const { error } = await supabase.from("students").update(values).eq("id", id);
        if (error) throw new Error(friendly(error));
        return;
      }
      const { error } = await supabase
        .from("students")
        .insert({ ...values, school_id: schoolId });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studentKeys.all });
      void qc.invalidateQueries({ queryKey: studentKeys.links });
    },
  });
}

export function useLinkGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      guardianId,
      relationship,
      isPrimary,
      schoolId,
    }: {
      studentId: string;
      guardianId: string;
      relationship: Relationship;
      isPrimary: boolean;
      schoolId: string;
    }) => {
      const { error } = await supabase.from("student_guardians").insert({
        student_id: studentId,
        guardian_id: guardianId,
        relationship,
        is_primary: isPrimary,
        school_id: schoolId,
      });
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studentKeys.links });
    },
  });
}

export function useUnlinkGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_guardians").delete().eq("id", id);
      if (error) throw new Error(friendly(error));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studentKeys.links });
    },
  });
}

export function fullName(s: Student) {
  return `${s.first_name} ${s.last_name}`.trim();
}

export function initialsOf(s: Student) {
  return `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase();
}

export function ageFrom(dob: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export const relationshipLabel: Record<Relationship, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
  other: "Other",
};
