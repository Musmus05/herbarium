import Link from "next/link";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/dictionaries";
import { getProfile, getRailStats } from "@/lib/data";
import { accession } from "@/lib/domain";
import { Avatar } from "@/components/avatar";
import { BrandMark } from "@/components/brand";
import { Forest } from "@/components/forest";
import { LocaleSwitch } from "@/components/locale-switch";
import { signOut } from "@/app/auth/actions";
import { AppNav } from "./app-nav";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const [{ locale, t }, account, stats] = await Promise.all([getDictionary(), getProfile(), getRailStats()]);
  if (!account) redirect("/login");
  const { user, profile, avatarUrl } = account;
  const name = profile?.display_name || user.email || "";

  const links = [
    {
      href: "/app",
      label: t.nav.overview,
      icon: "overview" as const,
      alert: { count: stats.followUpsDue, title: format(t.nav.dueTitle, { n: stats.followUpsDue }) },
    },
    { href: "/app/applications", label: t.nav.applications, icon: "applications" as const, count: stats.applications },
    { href: "/app/cvs", label: t.nav.cvs, icon: "cvs" as const, count: stats.cvs },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_1fr]">
      {/* The rail fades in when entering the app, then stays still between sections. */}
      <ViewTransition enter="page-swap" exit="page-swap" default="none">
      <aside className="sticky top-0 z-20 bg-fern text-fern-ink lg:h-dvh">
        {/* A fern painted with p5.brush rises behind the menu. */}
        <Forest scene="rail" duration={3000} className="absolute inset-x-0 bottom-0 hidden h-[58%] lg:block" />

        <div className="relative flex h-full items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:justify-start lg:py-7 lg:pl-5 lg:pr-0">
          <div className="lg:pl-1">
            <BrandMark name={t.meta.title} href="/app" tone="fern" />
          </div>

          <AppNav links={links} newLabel={t.applications.new} nextNumber={accession(stats.nextNumber)} nextNumberTitle={t.nav.nextNumber} />

          {/* The owner's label, pinned at the foot of the sheet like a specimen label. */}
          <div className="hidden lg:mr-5 lg:mt-auto lg:block">
            <div className="rounded-[3px] bg-sheet-raised p-3 text-ink shadow-sheet">
              <Link href="/app/profile" className="group flex items-center gap-3" title={t.nav.profile}>
                <Avatar url={avatarUrl} name={name} size={36} />
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[0.9375rem] font-semibold leading-tight group-hover:underline">{name}</span>
                  <span className="block truncate text-xs text-ink-3">{profile?.programme || t.nav.profile}</span>
                </span>
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-dotted border-rule-strong pt-2 text-xs text-ink-2">
                <LocaleSwitch locale={locale} label={t.nav.language} className="text-xs text-ink-2" />
                <form action={signOut}>
                  <button type="submit" className="cursor-pointer underline-offset-4 hover:text-ink hover:underline">
                    {t.nav.signOut}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </aside>
      </ViewTransition>
      <main className="min-w-0 px-4 pb-24 pt-6 sm:px-8 lg:px-12 lg:pt-10">
        {/* Cross-fades the page on navigation; see globals.css. */}
        <ViewTransition default="page-swap">
          <div className="mx-auto max-w-6xl">{children}</div>
        </ViewTransition>
        <div className="mx-auto mt-16 flex max-w-6xl items-center gap-5 border-t border-rule pt-5 text-sm text-ink-2 lg:hidden">
          <Link href="/app/profile" className="flex items-center gap-2 hover:text-ink">
            <Avatar url={avatarUrl} name={name} size={26} /> {t.nav.profile}
          </Link>
          <LocaleSwitch locale={locale} label={t.nav.language} />
          <form action={signOut}>
            <button type="submit" className="cursor-pointer underline-offset-4 hover:underline">
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
