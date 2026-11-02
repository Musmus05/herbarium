import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { LocaleSwitch } from "@/components/locale-switch";
import { SpecimenPlate } from "@/components/specimen-plate";
import { SpecimenLabel } from "@/components/specimen-label";
import { ButtonLink } from "@/components/ui";
import { BrandMark } from "@/components/brand";
import { Forest } from "@/components/forest";
import { DEMO_READY, DemoVideo } from "@/components/demo-video";

const REPO_URL = "https://github.com/Musmus05/herbarium";

export default async function Home() {
  const [{ locale, t }, user] = await Promise.all([getDictionary(), getUser()]);
  if (user) redirect("/app");

  const example = locale === "fr"
    ? { title: "Institut Pasteur", subtitle: "Stage en biologie computationnelle", place: "Paris, France", sent: "14 oct. 2026", cv: "CV recherche (FR)" }
    : { title: "Institut Pasteur", subtitle: "Computational biology internship", place: "Paris, France", sent: "14 Oct 2026", cv: "Research CV (FR)" };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative isolate flex flex-1 flex-col">
      <Forest
        scene="landing"
        className="absolute inset-x-0 bottom-0 -z-10 h-[min(82vh,760px)]"
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <BrandMark name={t.meta.title} />
        <nav className="flex items-center gap-5">
          <LocaleSwitch locale={locale} label={t.nav.language} className="text-ink-2" />
          <Link href="/login" className="text-sm font-medium text-ink hover:underline">
            {t.nav.signIn}
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-10">
        <section>
          <h1 className="max-w-[16ch] font-serif text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[3.25rem]">
            {t.landing.title}
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-2">{t.landing.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/login?mode=signup" className="h-11 px-5">
              {t.landing.cta}
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="h-11 px-5">
              {t.landing.secondary}
            </ButtonLink>
          </div>

          <ul className="mt-12 grid max-w-[60ch] gap-0 border-t border-rule">
            {t.landing.points.map((p) => (
              <li key={p.title} className="grid gap-1 border-b border-rule py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
                <span className="font-serif font-semibold text-ink">{p.title}</span>
                <span className="text-ink-2">{p.body}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink-3">{t.landing.privacy}</p>
        </section>

        <section aria-label={t.landing.plateCaption} className="relative mx-auto w-full max-w-md">
          <div className="relative border border-rule-strong bg-sheet-raised px-6 pb-6 pt-4 shadow-sheet" style={{ borderRadius: 2 }}>
            <SpecimenPlate seed="landing-plate-pasteur" status="offer" label={t.landing.plateCaption} />
            <SpecimenLabel
              className="relative mt-3 border-t-2 border-ink"
              heading={t.meta.title}
              number="001"
              title={example.title}
              subtitle={example.subtitle}
              rows={[
                { label: t.detail.labelRows.type, value: t.type.research },
                { label: t.detail.labelRows.place, value: example.place },
                { label: t.detail.labelRows.cv, value: example.cv },
                { label: t.detail.labelRows.status, value: t.status.offer },
              ]}
            />
          </div>
          <p className="mt-3 text-center font-serif text-sm italic text-ink-3">{t.landing.plateCaption}</p>
        </section>
      </main>
      </div>

      {DEMO_READY && (
        <section id="demo" aria-labelledby="demo-title" className="border-t border-rule bg-sheet">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
            <h2 id="demo-title" className="font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em]">
              {t.landing.demoTitle}
            </h2>
            <p className="mt-3 max-w-[56ch] text-lg text-ink-2">{t.landing.demoLede}</p>
            <div className="mt-8">
              <DemoVideo chapters={t.landing.demoChapters} label={t.landing.demoLabel} />
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-rule bg-sheet">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-3 sm:px-8">
          <span>{t.meta.title}</span>
          <a href={REPO_URL} className="hover:text-ink hover:underline">
            {t.landing.footer}
          </a>
        </div>
      </footer>
    </div>
  );
}
