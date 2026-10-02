import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Wordmark } from "@/components/wordmark";
import { APP_DESCRIPTION, APP_NAME, THEME_COLOR } from "@/config/app";
import { APP_URL } from "@/config/app-url";

// Body and interface text.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

// Headings, figures, equations and clocks, with its optical sizes.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: APP_URL,
  title: APP_NAME,
  applicationName: APP_NAME,
  description: APP_DESCRIPTION,
  // With the manifest, Chrome offers "Install app" and iOS adds it to the home screen.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: THEME_COLOR };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center px-6 pt-5">
          <Wordmark />
        </header>
        {children}
      </body>
    </html>
  );
}
