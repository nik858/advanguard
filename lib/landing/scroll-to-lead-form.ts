/**
 * Smooth-scrolls the page to the lead email input and focuses it. Used by
 * every CTA outside the order form so a click incites the user to enter
 * their email. No-op safely if the input is not in the DOM yet (SSR / edit mode).
 */
export function scrollToLeadForm(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("lead-email-input");
  if (!el) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Wait for the smooth scroll to settle before focusing — focus immediately
  // can cancel the scroll on some browsers.
  setTimeout(() => el.focus({ preventScroll: true }), 350);
}
