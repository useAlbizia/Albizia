import type { LegalPage } from "@/lib/settings";

// Renders an editable legal/info page. Body is plain text; blank lines
// separate paragraphs (kept deliberately simple so founders can edit it in
// a plain textarea in the admin without learning markup).
export function LegalPageView({ page }: { page: LegalPage }) {
  const paragraphs = page.body.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        {page.title}
      </h1>
      <div className="space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-content/70 whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
