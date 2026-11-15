/** True when a key press is meant for the canvas, not for a field, a panel or a button elsewhere. */
export function canvasKeyTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t || t === document.body || t === document.documentElement) return true;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    return false;
  return (
    Boolean(t.closest(".react-flow")) &&
    !t.closest(
      ".react-flow__controls, .react-flow__minimap, .react-flow__panel",
    )
  );
}
