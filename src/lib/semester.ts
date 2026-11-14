import { supabase } from "@/integrations/supabase/client";

/** Matérias da turma no semestre ativo (vínculos sem semestre contam sempre). */
export async function activeClassSubjects(classId: string) {
  const { data: cls } = await supabase.from("classes").select("semester").eq("id", classId).maybeSingle();
  const n = cls?.semester ?? 1;
  return supabase
    .from("class_subjects")
    .select("id, subject_id")
    .eq("class_id", classId)
    .or(`semester_number.is.null,semester_number.eq.${n}`);
}

export interface SubjectCheck {
  code: string;
  name: string;
  taught: number;
  required: number | null;
  missingGrades: string[];
}

/** Aulas ministradas = soma, por data, do total de aulas do bloco. */
export function taughtLessons(rows: { attendance_date: string; total_classes: number }[]) {
  const byDate = new Map<string, number>();
  rows.forEach((r) => byDate.set(r.attendance_date, Math.max(byDate.get(r.attendance_date) ?? 0, r.total_classes)));
  return [...byDate.values()].reduce((a, b) => a + b, 0);
}

export function subjectReady(s: SubjectCheck) {
  return s.required != null && s.taught >= s.required && s.missingGrades.length === 0;
}

export async function checkSemester(classId: string, semester: number): Promise<SubjectCheck[]> {
  const [{ data: cs }, { data: enr }] = await Promise.all([
    supabase.from("class_subjects").select("id, subject_id").eq("class_id", classId)
      .or(`semester_number.is.null,semester_number.eq.${semester}`),
    supabase.from("enrollments").select("student_id").eq("class_id", classId),
  ]);
  const links = cs || [];
  const studentIds = (enr || []).map((e) => e.student_id);
  if (!links.length) return [];
  const csIds = links.map((l) => l.id);
  const [{ data: subs }, { data: att }, { data: grades }, { data: profs }] = await Promise.all([
    supabase.from("subjects").select("id, name, code, total_lessons").in("id", links.map((l) => l.subject_id)),
    supabase.from("attendance").select("class_subject_id, attendance_date, total_classes").in("class_subject_id", csIds),
    supabase.from("grades").select("class_subject_id, student_id").in("class_subject_id", csIds),
    studentIds.length ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  return links.map((l) => {
    const s = subs?.find((x) => x.id === l.subject_id);
    const graded = new Set((grades || []).filter((g) => g.class_subject_id === l.id).map((g) => g.student_id));
    return {
      code: s?.code ?? "?",
      name: s?.name ?? "",
      taught: taughtLessons((att || []).filter((a) => a.class_subject_id === l.id)),
      required: s?.total_lessons ?? null,
      missingGrades: studentIds.filter((id) => !graded.has(id)).map((id) => profs?.find((p) => p.id === id)?.full_name ?? "Aluno"),
    };
  });
}

/** Fecha o semestre ativo e ativa o próximo, vinculando as matérias dele. */
export async function closeSemester(classId: string, courseId: string | null, semester: number, totalSemesters: number) {
  const { error } = await supabase.from("class_semesters")
    .update({ status: "concluido", closed_at: new Date().toISOString() })
    .eq("class_id", classId).eq("semester_number", semester);
  if (error) throw error;
  const next = semester + 1;
  if (next > totalSemesters) return { finished: true };
  const { error: e2 } = await supabase.from("class_semesters").update({ status: "ativo" })
    .eq("class_id", classId).eq("semester_number", next);
  if (e2) throw e2;
  await supabase.from("classes").update({ semester: next }).eq("id", classId);
  if (courseId) {
    const { data: crs } = await supabase.from("course_subjects").select("subject_id")
      .eq("course_id", courseId).eq("semester_number", next);
    const { data: { user } } = await supabase.auth.getUser();
    if (crs?.length) {
      const { error: e3 } = await supabase.from("class_subjects").insert(
        crs.map((c) => ({ class_id: classId, subject_id: c.subject_id, teacher_id: user?.id, semester_number: next }))
      );
      if (e3) throw e3;
    }
  }
  return { finished: false };
}
