import "./globals.css";
import type { Metadata } from "next";
import contentJson from "@/content/content.json";
import { ContentSchema, mediaUrl } from "@/types/content";

const content = ContentSchema.parse(contentJson);

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: { canonical: content.meta.canonical },
  openGraph: {
    type: "website",
    siteName: content.meta.brand,
    title: content.meta.title,
    description: content.meta.description,
    images: [mediaUrl(content.meta.ogImage)],
  },
  twitter: { card: "summary_large_image", title: content.meta.title, description: content.meta.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main" className="visually-hidden">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
