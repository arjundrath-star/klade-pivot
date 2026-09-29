export default function StudentLayout({ children }: LayoutProps<"/student">) {
  return <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">{children}</main>;
}
