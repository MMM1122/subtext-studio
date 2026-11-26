import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";

export const metadata: Metadata = {
  title: { default: "Subtext Studio", template: "%s · Subtext Studio" },
  description:
    "A cognitive storytelling workspace for novel writing, character psychology, nonlinear narratives, and human-AI collaborative creativity.",
  applicationName: "Subtext Studio",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#171917" },
  ],
};

// Runs before first paint to apply the saved theme and editor preferences (no flash).
const prePaint = `(function(){try{var t=localStorage.getItem('subtext-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');var e=JSON.parse(localStorage.getItem('subtext-editor')||'null');if(e){var s=document.documentElement.style;s.setProperty('--editor-font-size',e.f+'px');s.setProperty('--editor-line-height',String(e.l));s.setProperty('--editor-width',e.w+'px');}}catch(_){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
