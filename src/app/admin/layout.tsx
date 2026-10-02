export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {children}
    </main>
  );
}
