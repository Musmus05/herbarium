import { ViewTransition } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { getUser } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand";
import { LocaleSwitch } from "@/components/locale-switch";
import { Forest } from "@/components/forest";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ locale, t }, params, user] = await Promise.all([getDictionary(), searchParams, getUser()]);
  if (user) redirect("/app");
  const mode = params.mode === "signup" ? "signup" : "signin";
  const next = typeof params.next === "string" ? params.next : "/app";

  return (
    // Cross-fades with the next page; see the view transitions in globals.css.
    <ViewTransition default="page-swap">
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-fern lg:block" aria-hidden>
        <div className="absolute inset-x-12 top-10 z-10">
          <BrandMark name={t.meta.title} tone="fern" />
        </div>
        <Forest scene="login" className="absolute inset-x-0 bottom-0 h-[78%]" />
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <BrandMark name={t.meta.title} />
          </span>
          <LocaleSwitch locale={locale} label={t.nav.language} className="text-ink-2" />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-serif text-[2rem] font-semibold leading-tight">{t.auth.title}</h1>
          <p className="mt-2 text-ink-2">{t.auth.subtitle}</p>
          <LoginForm t={t.auth} mode={mode} next={next} linkError={params.error === "link"} />
        </div>
      </main>
    </div>
    </ViewTransition>
  );
}
