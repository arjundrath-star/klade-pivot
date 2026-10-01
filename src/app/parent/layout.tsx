export default function ParentLayout({ children }: LayoutProps<"/parent">) {
  return <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>;
}
