import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/settings";
import { LegalPageView } from "@/components/LegalPageView";

export async function generateMetadata() {
  const page = await getLegalPage("trocas");
  return { title: page ? `${page.title} · ALBIZIA` : "ALBIZIA" };
}

export default async function TrocasPage() {
  const page = await getLegalPage("trocas");
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
