/** The session is a focus view: no navigation, the ribbon above the workspace, which fills the rest. */
export default function SessionLayout({ children }: LayoutProps<"/student/session">) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6">
      {children}
    </main>
  );
}
