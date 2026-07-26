"use client";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { EditRich } from "@/app/_editor/EditRich";
import { Erasable } from "@/app/_editor/Erasable";
import { useRenderContext } from "@/app/_editor/RenderContext";
import { useStableFieldKey } from "@/app/_editor/SectionContext";

/**
 * The two hero body blocks with the optional media slot between them.
 *
 * Live page WITHOUT media: the blocks are merged back into a single
 * pre-wrap paragraph, so the copy reads exactly like before the split —
 * no double paragraph margins, no gap where the media would sit.
 * Editor, or live WITH media: the blocks render separately with the media
 * slot in between.
 */
export function HeroCopyBlocks({
  body,
  body2,
  edit,
  mediaPresent,
  mediaSlot,
}: {
  body: string;
  body2: string;
  edit: boolean;
  mediaPresent: boolean;
  mediaSlot: ReactNode;
}) {
  const { hiddenFields } = useRenderContext();
  const bodyHidden = hiddenFields.includes(useStableFieldKey("hero.sectionBody"));
  const body2Hidden = hiddenFields.includes(useStableFieldKey("hero.sectionBody2"));

  if (!edit && !mediaPresent) {
    const parts: string[] = [];
    if (!bodyHidden && body.trim()) parts.push(body.replace(/\n+$/, ""));
    if (!body2Hidden && body2.trim()) parts.push(body2.replace(/\n+$/, ""));
    if (parts.length === 0) return null;
    return (
      <Reveal delay={120}>
        <p className="ac-hero__what-body">
          <EditRich edit={false} path="hero.sectionBody" multiline>{parts.join("\n\n")}</EditRich>
        </p>
      </Reveal>
    );
  }

  return (
    <>
      <Erasable path="hero.sectionBody" label="section body">
        <Reveal delay={120}>
          <p className="ac-hero__what-body">
            <EditRich edit={edit} path="hero.sectionBody" multiline>{body}</EditRich>
          </p>
        </Reveal>
      </Erasable>
      {mediaSlot}
      {(edit || body2.trim()) && (
        <Erasable path="hero.sectionBody2" label="section body (below media)">
          <Reveal delay={160}>
            <p className="ac-hero__what-body">
              <EditRich edit={edit} path="hero.sectionBody2" multiline>{body2}</EditRich>
            </p>
          </Reveal>
        </Erasable>
      )}
    </>
  );
}
