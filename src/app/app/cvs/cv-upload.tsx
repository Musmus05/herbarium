"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, fieldClass, ruledClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const MAX_BYTES = 5 * 1024 * 1024;

// Uploads straight to Supabase Storage from the browser (RLS restricts the
// path to the user's own folder), which avoids server body-size limits.
export function CvUpload({ t }: { t: Dictionary["cvs"] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    const file = form.get("file");
    if (!label) return setError(t.label);
    const hasFile = file instanceof File && file.size > 0;
    if (hasFile && file.type !== "application/pdf") return setError(t.errors.type);
    if (hasFile && file.size > MAX_BYTES) return setError(t.errors.size);

    setPending(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setPending(false);
      return setError(t.errors.generic);
    }

    let filePath: string | null = null;
    if (hasFile) {
      filePath = `${auth.user.id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("cvs")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (upErr) {
        setPending(false);
        return setError(t.errors.generic);
      }
    }

    const { error: dbErr } = await supabase.from("cvs").insert({
      label,
      language: String(form.get("language") ?? "fr"),
      notes: String(form.get("notes") ?? "").trim() || null,
      file_path: filePath,
      file_name: hasFile ? file.name : null,
      file_size: hasFile ? file.size : null,
    });
    setPending(false);
    if (dbErr) return setError(t.errors.generic);
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 border border-rule-strong bg-sheet-raised p-5 shadow-sheet" style={{ borderRadius: 2 }} noValidate>
      <h2 className="font-serif text-lg font-semibold">{t.upload}</h2>
      <Field label={t.label} htmlFor="cv-label">
        <input id="cv-label" name="label" required maxLength={80} placeholder={t.labelPlaceholder} className={fieldClass} />
      </Field>
      <Field label={t.language} htmlFor="cv-language">
        <select id="cv-language" name="language" className={fieldClass} defaultValue="fr">
          {(["fr", "en", "other"] as const).map((l) => (
            <option key={l} value={l}>
              {t.languages[l]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.file} htmlFor="cv-file" hint={t.fileHint}>
        <input
          id="cv-file"
          name="file"
          type="file"
          accept="application/pdf"
          aria-describedby="cv-file-hint"
          className="block w-full cursor-pointer text-sm text-ink-2 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-rule-strong file:bg-sheet file:px-3 file:text-sm file:font-medium file:text-ink hover:file:bg-folder"
        />
      </Field>
      <Field label={t.notes} htmlFor="cv-notes">
        <textarea id="cv-notes" name="notes" rows={3} className={ruledClass} />
      </Field>
      <p aria-live="polite" className="text-sm text-danger empty:hidden">
        {error}
      </p>
      <Button type="submit" disabled={pending}>
        <Upload className="size-4" aria-hidden /> {pending ? t.uploading : t.submit}
      </Button>
    </form>
  );
}
