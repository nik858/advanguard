/**
 * End-to-end DRY RUN of the audit pipeline.
 *
 * Runs every real stage — domain resolution, scraping, PageSpeed, Claude —
 * against a live website, then PRINTS the generated audit email instead of
 * delivering it. `postAuditToGHL` is deliberately NOT imported or called, so
 * no GHL webhook fires and no email is sent.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/test-audit-e2e.ts [email]
 */
import { extractDomain, resolveReachableUrl } from "@/lib/audit/domain";
import { fetchHtml, parseSignals } from "@/lib/audit/scrape";
import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { formatSignalsForPrompt } from "@/lib/audit/signals";
import { generateAuditEmail } from "@/lib/audit/ai";
import type { Lead, Signals } from "@/types/audit";

const EMAIL = process.argv[2] || "contact@theclinique.com";

async function main() {
  console.log("=== AUDIT PIPELINE — END-TO-END DRY RUN ===");
  console.log("(every stage is real; postAuditToGHL is NOT called — no email is sent)\n");

  const domain = extractDomain(EMAIL);
  const lead: Lead = { email: EMAIL, firstName: "", domain };
  console.log(`Lead email : ${EMAIL}`);
  console.log(`Domain     : ${domain}\n`);

  console.log("[1/4] Resolving a reachable URL…");
  const url = await resolveReachableUrl(domain);
  if (!url) {
    console.log(`  → UNREACHABLE. In production, runAudit would send the graceful fallback email.`);
    return;
  }
  console.log(`  → ${url}\n`);

  console.log("[2/4] Fetching HTML…");
  const html = await fetchHtml(url);
  if (!html) {
    console.log(`  → No HTML returned. In production, runAudit would send the fallback email.`);
    return;
  }
  console.log(`  → ${html.length} chars\n`);

  console.log("[3/4] Extracting signals (HTML + PageSpeed in parallel)…");
  const [htmlSignals, pagespeed] = await Promise.all([
    Promise.resolve(parseSignals(html, url)),
    fetchPageSpeed(url),
  ]);
  const signals: Signals = {
    url,
    isHttps: url.startsWith("https://"),
    html: htmlSignals,
    pagespeed,
  };
  console.log("  → signals assembled\n");
  console.log("--- SIGNALS PASSED TO CLAUDE ---");
  console.log(formatSignalsForPrompt(signals));
  console.log("");

  console.log("[4/4] Calling Claude to generate the audit email…");
  const email = await generateAuditEmail(signals, lead);
  console.log("  → done\n");

  console.log("=========================================");
  console.log("        GENERATED AUDIT EMAIL");
  console.log("=========================================");
  console.log(`SUBJECT: ${email.subject}`);
  console.log("-----------------------------------------");
  console.log(email.body);
  console.log("=========================================");
  console.log("\n✓ Pipeline ran end-to-end. postAuditToGHL was NOT called — no email sent.");
}

main().catch((e) => {
  console.error("\n✗ PIPELINE ERROR:", e);
  process.exit(1);
});
