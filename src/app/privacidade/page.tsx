import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/settings";
import { LegalPageView } from "@/components/LegalPageView";

export async function generateMetadata() {
  const page = await getLegalPage("privacidade");
  return { title: page ? `${page.title} · ALBIZIA` : "ALBIZIA" };
}

export default async function PrivacidadePage() {
  const page = await getLegalPage("privacidade");
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
