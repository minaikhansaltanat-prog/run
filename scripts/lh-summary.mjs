// Сводка из JSON-отчета Lighthouse: node scripts/lh-summary.mjs docs/lighthouse/*.json
import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  const c = j.categories;
  const a = j.audits;
  const score = (k) => Math.round((c[k]?.score ?? 0) * 100);
  console.log(
    `${f.split(/[\/]/).pop().padEnd(22)} perf ${score("performance")}  a11y ${score("accessibility")}  bp ${score("best-practices")}  seo ${score("seo")}  | LCP ${a["largest-contentful-paint"].displayValue}  CLS ${a["cumulative-layout-shift"].displayValue}  TBT ${a["total-blocking-time"].displayValue}  FCP ${a["first-contentful-paint"].displayValue}`,
  );
  for (const k of Object.keys(c)) {
    for (const ref of c[k].auditRefs) {
      const au = a[ref.id];
      if (au.score !== null && au.score < 0.9 && ref.weight > 0 && au.scoreDisplayMode !== "informative")
        console.log(`    - [${k}] ${ref.id}: ${au.score} ${au.displayValue ?? ""}`);
    }
  }
}
