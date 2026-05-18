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
 * If the range sits inside an element of the named `tag` (closest ancestor),
 * unwraps that element — replacing it with its children. Otherwise no-op.
 */
export function unwrapAroundSelection(range: Range, tag: string): void {
  const ancestor = findAncestor(range.commonAncestorContainer, tag);
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
 * that itself lives inside `root`. Used to drive toolbar "active" state.
 */
export function isSelectionWrappedBy(range: Range, tag: string, root: Element): boolean {
  const start = findAncestor(range.startContainer, tag);
  const end = findAncestor(range.endContainer, tag);
  if (!start || !end) return false;
  if (start !== end) return false;
  return root.contains(start);
}

function findAncestor(node: Node, tag: string): Element | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur.nodeType === 1 && (cur as Element).tagName.toLowerCase() === tag) {
      return cur as Element;
    }
    cur = cur.parentNode;
  }
  return null;
}
