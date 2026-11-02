import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { getCvs, getRailStats } from "@/lib/data";
import { accession } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { ApplicationForm } from "../application-form";
import { createApplication } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.form.newTitle };
}

export default async function NewApplicationPage() {
  const [{ locale, t }, cvs, stats] = await Promise.all([getDictionary(), getCvs(), getRailStats()]);
  // Chosen here so the preview's plant is the plant the record will have.
  const id = crypto.randomUUID();
  return (
    <>
      <PageHeader title={t.form.newTitle} />
      <ApplicationForm
        t={t}
        locale={locale}
        cvs={cvs}
        plantSeed={id}
        number={accession(stats.nextNumber)}
        action={createApplication}
        cancelHref="/app/applications"
      />
    </>
  );
}
