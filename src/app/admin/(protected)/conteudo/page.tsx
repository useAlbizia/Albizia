import { getSiteSettings, getLegalPages } from "@/lib/settings";
import { SettingsForm, LegalForm } from "./ContentForms";

export default async function ConteudoPage() {
  const [settings, pages] = await Promise.all([getSiteSettings(), getLegalPages()]);

  return (
    <div className="flex flex-col gap-16">
      <div>
        <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">
          Dados da empresa
        </h1>
        <SettingsForm settings={settings} />
      </div>

      <div>
        <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Páginas legais</h1>
        <div className="flex flex-col gap-12">
          {pages.map((page) => (
            <div key={page.slug}>
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/40">
                /{page.slug}
              </p>
              <LegalForm page={page} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
