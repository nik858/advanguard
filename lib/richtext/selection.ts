/**
 * Wraps the contents of `range` in a new element of `tag` with optional
 * attributes. If the range spans element boundaries, falls back to
 * extractContents() + appendChild() so the wrapping always succeeds.
 */
export function wrapSelection(range: Range, tag: string, attrs?: Record<string, string>): void {
  const doc = range.startContainer.ownerDocument ?? document;
  const el = doc.createElement(tag);
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
  }
  try {
    range.surroundContents(el);
  } catch {
    el.appendChild(range.extractContents());
    range.insertNode(el);
  }
}

/**
 * If the range sits inside an element of the named `tag` (closest ancestor
 * within `root`), unwraps that element — replacing it with its children.
 * The `root` element itself is NEVER unwrapped, even if it matches the tag.
 */
export function unwrapAroundSelection(range: Range, tag: string, root: Element): void {
  const ancestor = findAncestor(range.commonAncestorContainer, tag, root);
  if (!ancestor) return;
  const parent = ancestor.parentNode;
  if (!parent) return;
  while (ancestor.firstChild) {
    parent.insertBefore(ancestor.firstChild, ancestor);
  }
  parent.removeChild(ancestor);
}

/**
 * Returns true if the full range is contained within an element of `tag`
 * that itself lives strictly inside `root` (the host is NEVER counted as
 * a wrapping ancestor of itself).
 */
export function isSelectionWrappedBy(range: Range, tag: string, root: Element): boolean {
  const start = findAncestor(range.startContainer, tag, root);
  const end = findAncestor(range.endContainer, tag, root);
  if (!start || !end) return false;
  return start === end;
}

/**
 * Walks up from `node` looking for the nearest ancestor with the given tag.
 * If `stopAt` is provided, the walk stops BEFORE visiting `stopAt` so the
 * function never returns `stopAt` itself (used to protect the editor host
 * from being unwrapped when the host's tag happens to match).
 */
function findAncestor(node: Node, tag: string, stopAt?: Element): Element | null {
  let cur: Node | null = node;
  while (cur && cur !== stopAt) {
    if (cur.nodeType === 1 && (cur as Element).tagName.toLowerCase() === tag) {
      return cur as Element;
    }
    cur = cur.parentNode;
  }
  return null;
}
