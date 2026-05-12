import { headers } from "next/headers";
import contentJson from "@/content/content.json";
import { ContentSchema, mediaUrl } from "@/types/content";
import { JsonLd } from "./_sections/JsonLd";
import { Header } from "./_sections/Header";
import { Headline } from "./_sections/Headline";
import { Hero } from "./_sections/Hero";
import { LogoStrip } from "./_sections/LogoStrip";
import { OnlySystem } from "./_sections/OnlySystem";
import { Demo } from "./_sections/Demo";
import { Testimonials } from "./_sections/Testimonials";
import { Stack } from "./_sections/Stack";
import { GuaranteeSection } from "./_sections/GuaranteeSection";
import { FAQ } from "./_sections/FAQ";
import { Footer } from "./_sections/Footer";
import { EditorProvider } from "./_editor/EditorProvider";
import { LandingTree } from "./_editor/LandingTree";

export default async function Home() {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = ContentSchema.parse(contentJson);

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
      price: c.order.priceNow.replace(/[^\d.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: c.meta.canonical,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.items.map((q) => ({
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
        <Headline content={c.headline} />
        <Hero hero={c.hero} order={c.order} />
        <LogoStrip content={c.authority} />
        <OnlySystem content={c.onlySystem} />
        <Demo content={c.demo} />
        <Testimonials content={c.testimonials} />
        <Stack content={c.stack} />
        <GuaranteeSection content={c.guarantee} />
        <FAQ content={c.faq} />
      </main>
      <Footer content={c.footer} header={c.header} />
    </>
  );
}
