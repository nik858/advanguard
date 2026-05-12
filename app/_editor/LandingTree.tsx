"use client";
import { useEditor } from "./EditorProvider";
import { Header } from "../_sections/Header";
import { Headline } from "../_sections/Headline";
import { Hero } from "../_sections/Hero";
import { LogoStrip } from "../_sections/LogoStrip";
import { OnlySystem } from "../_sections/OnlySystem";
import { Demo } from "../_sections/Demo";
import { Testimonials } from "../_sections/Testimonials";
import { Stack } from "../_sections/Stack";
import { GuaranteeSection } from "../_sections/GuaranteeSection";
import { FAQ } from "../_sections/FAQ";
import { Footer } from "../_sections/Footer";
import { PublishBar } from "./PublishBar";

export function LandingTree() {
  const { state } = useEditor();
  const c = state.draft;
  return (
    <>
      <PublishBar />
      <Header content={c.header} edit />
      <main id="main">
        <Headline content={c.headline} edit />
        <Hero hero={c.hero} order={c.order} edit />
        <LogoStrip content={c.authority} edit />
        <OnlySystem content={c.onlySystem} edit />
        <Demo content={c.demo} edit />
        <Testimonials content={c.testimonials} edit />
        <Stack content={c.stack} edit />
        <GuaranteeSection content={c.guarantee} edit />
        <FAQ content={c.faq} edit />
      </main>
      <Footer content={c.footer} header={c.header} edit />
    </>
  );
}
