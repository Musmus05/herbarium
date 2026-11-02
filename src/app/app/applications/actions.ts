"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CHANNELS, STATUSES, TYPES, type Status } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: "generic"; fieldErrors?: Record<string, string> };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const optionalDate = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/)
  .transform((v) => v || null);

const schema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  type: z.enum(TYPES as [string, ...string[]]),
  status: z.enum(STATUSES as [string, ...string[]]),
  channel: z.enum(CHANNELS as [string, ...string[]]),
  city: optionalText(80),
  country: optionalText(80),
  url: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v || null))
    .pipe(z.string().url().nullable()),
  cv_id: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().uuid().nullable()),
  applied_on: optionalDate,
  follow_up_on: optionalDate,
  answered_on: optionalDate,
  start_on: optionalDate,
  duration_months: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(1).max(24).nullable()),
  contact_name: optionalText(120),
  contact_email: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.string().email().nullable()),
  notes: optionalText(5000),
  feedback: optionalText(5000),
});

function parse(form: FormData) {
  const raw = Object.fromEntries(
    Object.keys(schema.shape).map((k) => [k, String(form.get(k) ?? "")]),
  );
  return schema.safeParse(raw);
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.code;
  }
  return out;
}

type Parsed = z.infer<typeof schema>;
type Row = Omit<Parsed, "type" | "status" | "channel"> & {
  type: (typeof TYPES)[number];
  status: Status;
  channel: (typeof CHANNELS)[number];
};

export async function createApplication(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parse(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  // The page draws the plant from this id before the record exists, so the
  // preview and the saved specimen are the same plant.
  const id = z.string().uuid().safeParse(form.get("id"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .insert({ ...(parsed.data as Row), ...(id.success ? { id: id.data } : {}) })
    .select("id")
    .single();
  if (error) return { error: "generic" };

  revalidatePath("/app", "layout");
  redirect(`/app/applications/${data.id}`);
}

export async function updateApplication(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parse(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("applications").update(parsed.data as Row).eq("id", id);
  if (error) return { error: "generic" };

  revalidatePath("/app", "layout");
  redirect(`/app/applications/${id}`);
}

export async function setStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("applications").update({ status }).eq("id", id);
  revalidatePath("/app", "layout");
}

export async function deleteApplication(id: string) {
  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", id);
  revalidatePath("/app", "layout");
  redirect("/app/applications");
}
