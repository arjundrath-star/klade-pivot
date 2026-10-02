/** The session is a focus view: no navigation, the ribbon and the breadcrumb above the blocks. */
export default function SessionLayout({ children }: LayoutProps<"/student/session">) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
      {children}
    </main>
  );
}
