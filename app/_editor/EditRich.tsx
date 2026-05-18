"use client";
import type { ElementType, ReactNode } from "react";
import { EditableRichText } from "./EditableRichText";

export function EditRich({
  edit,
  path,
  as,
  className,
  multiline,
  children,
}: {
  edit: boolean;
  path: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  children: ReactNode;
}) {
  if (!edit) {
    const Tag = (as ?? "span") as ElementType;
    const html = typeof children === "string" ? children : "";
    return (
      <Tag
        className={className}
        style={{ whiteSpace: multiline ? "pre-line" : undefined }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <EditableRichText path={path} as={as} className={className} multiline={multiline}>
      {children}
    </EditableRichText>
  );
}
