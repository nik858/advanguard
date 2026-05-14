"use client";
import { useEditor } from "./EditorProvider";
import { ToastProvider } from "../_components/Toast";
import { Header } from "../_sections/Header";
import { Footer } from "../_sections/Footer";
import { SectionBody } from "../_sections/SectionBody";
import { SectionContextProvider } from "./SectionContext";
import { SectionHoverFrame } from "./SectionHoverFrame";
import { StructurePanel } from "./StructurePanel";
import { PublishBar } from "./PublishBar";

export function LandingTree() {
  const { state } = useEditor();
  const c = state.draft;
  return (
    <ToastProvider>
      <PublishBar />
      <StructurePanel />
      <Header content={c.header} edit />
      <main id="main">
        {c.sections.map((s, i) => (
          <SectionContextProvider key={s.id} value={{ basePath: `sections.${i}.data` }}>
            <SectionHoverFrame type={s.type}>
              <SectionBody section={s} edit />
            </SectionHoverFrame>
          </SectionContextProvider>
        ))}
      </main>
      <Footer content={c.footer} header={c.header} edit />
    </ToastProvider>
  );
}
