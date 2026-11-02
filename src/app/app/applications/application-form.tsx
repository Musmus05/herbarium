"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Field, fieldClass, ruledClass, StatusMark } from "@/components/ui";
import { SpecimenPlate } from "@/components/specimen-plate";
import { SpecimenLabel } from "@/components/specimen-label";
import { CHANNELS, FOLLOW_UP_DAYS, STATUSES, TYPES, type Application, type Cv, type InternshipType, type Status } from "@/lib/domain";
import { addDays, formatDay, toIsoDay } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FormState } from "./actions";

type Props = {
  t: Pick<Dictionary, "form" | "type" | "status" | "channel" | "detail" | "meta">;
  locale: string;
  cvs: Cv[];
  application?: Application;
  /** Id of the record: the existing one, or the one the new record will get. */
  plantSeed: string;
  /** Accession number shown on the label and the submit ticket. */
  number: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  cancelHref: string;
};

type Draft = { company: string; role: string; type: InternshipType; status: Status; applied: string; cv: string; city: string; country: string };

/**
 * The application form, filled in like a herbarium label: ruled blanks,
 * hand-cut type tags, and beside it the specimen being made, whose plant and
 * label follow what is typed.
 */
export function ApplicationForm({ t, locale, cvs, application: a, plantSeed, number, action, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const initialApplied = a ? (a.applied_on ?? "") : toIsoDay(new Date());
  const [applied, setApplied] = useState(initialApplied);
  const [followUp, setFollowUp] = useState(
    a ? (a.follow_up_on ?? "") : initialApplied ? addDays(initialApplied, FOLLOW_UP_DAYS) : "",
  );
  const [followUpTouched, setFollowUpTouched] = useState(Boolean(a?.follow_up_on));
  const activeCvs = cvs.filter((cv) => !cv.archived || cv.id === a?.cv_id);
  const [draft, setDraft] = useState<Draft>({
    company: a?.company ?? "",
    role: a?.role ?? "",
    type: a?.type ?? "other",
    status: a?.status ?? "applied",
    applied: initialApplied,
    cv: a?.cv_id ?? activeCvs[0]?.id ?? "",
    city: a?.city ?? "",
    country: a?.country ?? "",
  });

  const f = t.form;
  const err = (name: string) => (state.fieldErrors?.[name] ? f.required : undefined);
  const invalid = (name: string) => (state.fieldErrors?.[name] ? true : undefined);

  function readDraft() {
    const data = new FormData(formRef.current!);
    const get = (k: string) => String(data.get(k) ?? "");
    setDraft({
      company: get("company"),
      role: get("role"),
      type: (get("type") || "other") as InternshipType,
      status: (get("status") || "applied") as Status,
      applied: get("applied_on"),
      cv: get("cv_id"),
      city: get("city"),
      country: get("country"),
    });
  }

  const place = [draft.city, draft.country].filter(Boolean).join(", ");
  const cvLabel = cvs.find((cv) => cv.id === draft.cv)?.label;

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-16">
      <form ref={formRef} action={formAction} onInput={readDraft} onChange={readDraft} className="grid max-w-3xl gap-10" noValidate>
        {!a && <input type="hidden" name="id" value={plantSeed} />}

        <Section title={f.essentials}>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label={f.company} htmlFor="company" error={err("company")}>
              <input id="company" name="company" required autoFocus={!a} defaultValue={a?.company} aria-invalid={invalid("company")} className={`${fieldClass} font-serif text-lg`} autoComplete="organization" />
            </Field>
            <Field label={f.role} htmlFor="role" error={err("role")}>
              <input id="role" name="role" required defaultValue={a?.role} aria-invalid={invalid("role")} className={fieldClass} autoComplete="organization-title" />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-medium text-ink">{f.type}</legend>
            <div className="flex flex-wrap gap-x-2 gap-y-2.5">
              {TYPES.map((type) => (
                <label key={type} className="cursor-pointer">
                  <input type="radio" name="type" value={type} defaultChecked={(a?.type ?? "other") === type} className="peer sr-only" />
                  <span className="tag-cut inline-flex h-9 items-center border-[1.5px] border-rule-strong bg-sheet-raised/60 px-4 text-sm text-ink-2 hover:border-ink-3 hover:text-ink peer-checked:border-fern peer-checked:bg-fern peer-checked:text-fern-ink peer-checked:hover:border-fern peer-checked:hover:text-fern-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tape">
                    {t.type[type]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            <Field label={f.status} htmlFor="status">
              <select id="status" name="status" defaultValue={a?.status ?? "applied"} className={fieldClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.status[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.appliedOn} htmlFor="applied_on" error={err("applied_on")}>
              <input
                id="applied_on"
                name="applied_on"
                type="date"
                value={applied}
                onChange={(e) => {
                  setApplied(e.target.value);
                  if (!followUpTouched) setFollowUp(e.target.value ? addDays(e.target.value, FOLLOW_UP_DAYS) : "");
                }}
                className={fieldClass}
              />
            </Field>
            <Field label={f.cv} htmlFor="cv_id">
              <select id="cv_id" name="cv_id" defaultValue={a?.cv_id ?? activeCvs[0]?.id ?? ""} className={fieldClass}>
                <option value="">{f.noCv}</option>
                {activeCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.label}
                  </option>
                ))}
              </select>
              {cvs.length === 0 && (
                <Link href="/app/cvs" className="mt-1.5 inline-block text-sm text-action underline underline-offset-4">
                  {f.addCv}
                </Link>
              )}
            </Field>
          </div>
        </Section>

        <Collapsible title={f.details} defaultOpen={Boolean(a)}>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label={f.channel} htmlFor="channel">
              <select id="channel" name="channel" defaultValue={a?.channel ?? "job_board"} className={fieldClass}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {t.channel[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.url} htmlFor="url" error={err("url")} optional={f.optional}>
              <input id="url" name="url" type="url" inputMode="url" defaultValue={a?.url ?? ""} aria-invalid={invalid("url")} className={fieldClass} placeholder="https://" />
            </Field>
            <Field label={f.city} htmlFor="city" optional={f.optional}>
              <input id="city" name="city" defaultValue={a?.city ?? ""} className={fieldClass} autoComplete="address-level2" />
            </Field>
            <Field label={f.country} htmlFor="country" optional={f.optional}>
              <input id="country" name="country" defaultValue={a?.country ?? ""} className={fieldClass} autoComplete="country-name" />
            </Field>
            <Field label={f.contactName} htmlFor="contact_name" optional={f.optional}>
              <input id="contact_name" name="contact_name" defaultValue={a?.contact_name ?? ""} className={fieldClass} />
            </Field>
            <Field label={f.contactEmail} htmlFor="contact_email" error={err("contact_email")} optional={f.optional}>
              <input id="contact_email" name="contact_email" type="email" defaultValue={a?.contact_email ?? ""} aria-invalid={invalid("contact_email")} className={fieldClass} />
            </Field>
            <Field label={f.startOn} htmlFor="start_on" optional={f.optional}>
              <input id="start_on" name="start_on" type="date" defaultValue={a?.start_on ?? ""} className={fieldClass} />
            </Field>
            <Field label={f.duration} htmlFor="duration_months" error={err("duration_months")} optional={f.optional}>
              <input id="duration_months" name="duration_months" type="number" min={1} max={24} inputMode="numeric" defaultValue={a?.duration_months ?? ""} aria-invalid={invalid("duration_months")} className={fieldClass} />
            </Field>
          </div>
        </Collapsible>

        <Collapsible title={f.tracking} defaultOpen={Boolean(a)}>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Field label={f.followUpOn} htmlFor="follow_up_on" hint={f.followUpHint}>
              <input
                id="follow_up_on"
                name="follow_up_on"
                type="date"
                value={followUp}
                onChange={(e) => {
                  setFollowUp(e.target.value);
                  setFollowUpTouched(true);
                }}
                aria-describedby="follow_up_on-hint"
                className={fieldClass}
              />
            </Field>
            <Field label={f.answeredOn} htmlFor="answered_on" optional={f.optional}>
              <input id="answered_on" name="answered_on" type="date" defaultValue={a?.answered_on ?? ""} className={fieldClass} />
            </Field>
          </div>
          <Field label={f.notes} htmlFor="notes" hint={f.notesHint}>
            <textarea id="notes" name="notes" rows={4} defaultValue={a?.notes ?? ""} aria-describedby="notes-hint" className={ruledClass} />
          </Field>
          <Field label={f.feedback} htmlFor="feedback" hint={f.feedbackHint}>
            <textarea id="feedback" name="feedback" rows={4} defaultValue={a?.feedback ?? ""} aria-describedby="feedback-hint" className={ruledClass} />
          </Field>
        </Collapsible>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule bg-sheet/95 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:px-0">
          {/* The accession ticket, like the one in the rail. */}
          <button
            type="submit"
            disabled={pending}
            className="rail-ticket inline-flex h-12 cursor-pointer items-center gap-4 bg-action px-6 font-semibold text-fern-ink transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-action-hover disabled:cursor-wait disabled:opacity-70"
          >
            <span>{pending ? f.saving : a ? f.save : f.create}</span>
            <span className="tnum border-l border-dashed border-fern-ink/40 pl-4 font-serif text-sm font-semibold text-fern-ink/80">N° {number}</span>
          </button>
          <Link href={cancelHref} className="text-sm text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ink">
            {f.cancel}
          </Link>
          <p aria-live="polite" className="text-sm text-danger">
            {state.error || state.fieldErrors ? f.error : ""}
          </p>
        </div>
      </form>

      {/* The specimen being made: its plant and label follow the form. */}
      <aside aria-label={f.preview}>
        <div className="lg:sticky lg:top-8">
          <div className="border border-rule-strong bg-sheet-raised p-4 shadow-sheet" style={{ borderRadius: 2 }}>
            <SpecimenPlate seed={plantSeed} status={draft.status} label={t.status[draft.status]} className="mx-auto max-w-[15rem] lg:max-w-none" />
            <SpecimenLabel
              className="mt-3 border-t-2 border-ink"
              heading={t.meta.title}
              number={number}
              title={draft.company || f.company}
              subtitle={draft.role || f.role}
              rows={[
                { label: t.detail.labelRows.type, value: t.type[draft.type] },
                ...(place ? [{ label: t.detail.labelRows.place, value: place }] : []),
                { label: t.detail.labelRows.cv, value: cvLabel ?? "–" },
                { label: t.detail.labelRows.applied, value: formatDay(draft.applied || null, locale, "long") ?? t.detail.noDate },
                { label: t.detail.labelRows.status, value: <StatusMark status={draft.status} label={t.status[draft.status]} /> },
              ]}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-7">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Collapsible({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group border-t border-dashed border-rule-strong pt-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 text-ink-3 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-6 grid gap-6">{children}</div>
    </details>
  );
}
