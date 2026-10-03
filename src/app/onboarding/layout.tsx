import { SiteHeader } from "@/components/site-header";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        {children}
      </main>
    </>
  );
}
