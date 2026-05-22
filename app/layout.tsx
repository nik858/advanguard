import "./globals.css";
import type { Metadata } from "next";
import contentJson from "@/content/content.json";
import { migrateContent, mediaUrl } from "@/types/content";
import Script from "next/script";

const content = migrateContent(contentJson);

// Browser-tab icon — editable from the admin (header.favicon), with the
// Advanguard logo as the on-brand fallback until one is uploaded.
const faviconUrl = mediaUrl(content.header.favicon) || "/assets/advanguard-logo-dark.png";

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  icons: { icon: faviconUrl },
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
    <html lang="en">
      <head>
  <meta name="color-scheme" content="light" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  <Script
    id="gtm"
    strategy="afterInteractive"
    dangerouslySetInnerHTML={{
      __html: `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-MPJP8GPC');
      `,
    }}
  />
</head>
     <body>
  <noscript>
    <iframe
      src="https://www.googletagmanager.com/ns.html?id=GTM-MPJP8GPC"
      height="0"
      width="0"
      style={{ display: "none", visibility: "hidden" }}
    />
  </noscript>
  <a href="#main" className="visually-hidden">Skip to content</a>
  {children}
</body>
    </html>
  );
}
