import { headers } from "next/headers";
import contentJson from "@/content/content.json";
import { migrateContent, findSection, mediaUrl } from "@/types/content";
import { JsonLd } from "./_sections/JsonLd";
import { Header } from "./_sections/Header";
import { Footer } from "./_sections/Footer";
import { SectionBody } from "./_sections/SectionBody";
import { EditorProvider } from "./_editor/EditorProvider";
import { LandingTree } from "./_editor/LandingTree";

export default async function Home() {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = migrateContent(contentJson);

  const hero = findSection(c, "hero");
  const faq = findSection(c, "faq");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.meta.productName,
    brand: { "@type": "Brand", name: c.meta.brand },
    description: c.meta.description,
    image: mediaUrl(c.meta.ogImage),
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "456" },
    offers: {
      "@type": "Offer",
      price: (hero?.data.order.priceNow ?? "").replace(/[^\d.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: c.meta.canonical,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faq?.data.faq.items ?? []).map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };

  if (editMode) {
    return (
      <>
        <JsonLd data={productJsonLd} />
        <JsonLd data={faqJsonLd} />
        <EditorProvider initial={c}>
          <LandingTree />
        </EditorProvider>
      </>
    );
  }

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Header content={c.header} />
      <main id="main">
        {c.sections
          .filter((s) => !s.hidden)
          .map((s) => (
            <SectionBody key={s.id} section={s} />
          ))}
      </main>
      <Footer content={c.footer} header={c.header} />
    </>
  );
}
