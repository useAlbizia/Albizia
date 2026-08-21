import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/settings";
import { LegalPageView } from "@/components/LegalPageView";

export async function generateMetadata() {
  const page = await getLegalPage("termos");
  return { title: page ? `${page.title} — ALBIZIA` : "ALBIZIA" };
}

export default async function TermosPage() {
  const page = await getLegalPage("termos");
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
