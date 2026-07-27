"use client";
import { useEditor } from "./EditorProvider";
import { ToastProvider } from "../_components/Toast";
import { Header } from "../_sections/Header";
import { Footer } from "../_sections/Footer";
import { SectionBody } from "../_sections/SectionBody";
import { PremiumSectionBody } from "../premium/_components/PremiumSectionBody";
import { SectionContextProvider } from "./SectionContext";
import { SectionHoverFrame } from "./SectionHoverFrame";
import { StructurePanel } from "./StructurePanel";
import { PublishBar } from "./PublishBar";
import { RenderContextProvider } from "./RenderContext";

export function LandingTree() {
  const { state, variant } = useEditor();
  const c = state.draft;
  // Preview mode renders the page exactly as a visitor sees it: no editor
  // chrome (Add buttons, delete X's, resize toolbars, section hover frames)
  // and every section receives edit={false} so the inline editors are inert.
  const editing = !state.previewMode;
  // The premium page swaps the hero so the operator edits (and previews) the
  // real paid order card rather than the free lead form.
  const Body = variant === "premium" ? PremiumSectionBody : SectionBody;
  return (
    <ToastProvider>
      <PublishBar />
      <StructurePanel />
      <RenderContextProvider value={{ hiddenFields: c.hiddenFields ?? [], imageSizes: c.imageSizes ?? {}, edit: editing }}>
        <Header content={c.header} edit={editing} />
        <main id="main">
          {c.sections.map((s, i) => {
            // Preview hides sections marked `hidden` so the page matches what
            // visitors see; edit mode keeps them so the operator can still
            // toggle visibility from the structure panel.
            if (!editing && s.hidden) return null;
            return (
              <SectionContextProvider key={s.id} value={{ basePath: `sections.${i}.data`, sectionId: s.id }}>
                {editing ? (
                  <SectionHoverFrame type={s.type}>
                    <Body section={s} edit />
                  </SectionHoverFrame>
                ) : (
                  <Body section={s} edit={false} />
                )}
              </SectionContextProvider>
            );
          })}
        </main>
        <Footer content={c.footer} header={c.header} edit={editing} />
      </RenderContextProvider>
    </ToastProvider>
  );
}
