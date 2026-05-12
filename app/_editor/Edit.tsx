"use client";
import type { ElementType, ReactNode } from "react";
import { EditableText } from "./EditableText";

export function Edit({
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
  if (!edit) return <>{children}</>;
  return <EditableText path={path} as={as} className={className} multiline={multiline}>{children}</EditableText>;
}
