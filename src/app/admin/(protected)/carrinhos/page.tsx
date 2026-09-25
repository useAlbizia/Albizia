import Link from "next/link";
import { listRecoveryQueue, type Urgency } from "@/lib/recovery";
import { brl } from "@/lib/format";
import { RecoveryButton } from "./RecoveryButton";
import { RecoverySettingsForm } from "./RecoverySettingsForm";

export const dynamic = "force-dynamic";

function ageLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Urgência sem cor berrante: uma barra à esquerda e um rótulo. O admin é
// minimalista, e "agora" precisa saltar sem parecer um alarme de incêndio.
const URGENCY: Record<Urgency, { label: string; bar: string; text: string }> = {
  agora: { label: "Ligar agora", bar: "bg-content", text: "text-content" },
  hoje: { label: "Ainda hoje", bar: "bg-content/40", text: "text-content/60" },
  normal: { label: "Sem pressa", bar: "bg-content/15", text: "text-content/40" },
};

export default async function CarrinhosPage() {
  const { queue, settings } = await listRecoveryQueue();

  const urgentes = queue.filter((o) => o.urgency === "agora").length;
  const emJogo = queue.reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">
        Recuperação de venda
      </h1>
      <p className="mb-8 max-w-2xl text-[12px] leading-relaxed text-content/40">
        Checkouts que ficaram parados há mais de {settings.minutes} minutos, em ordem de prioridade.
        Quem está no topo é quem vale ligar primeiro.
      </p>

      {queue.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-x-10 gap-y-3 border-y border-content/10 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-content/40">Parados</p>
            <p className="mt-1 text-lg">{queue.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-content/40">Para ligar agora</p>
            <p className="mt-1 text-lg">{urgentes}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-content/40">Em jogo</p>
            <p className="mt-1 text-lg">{brl(emJogo)}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {queue.map((o) => {
          const u = URGENCY[o.urgency];
          return (
            <div key={o.id} className="flex border border-content/10">
              <div className={`w-1 shrink-0 ${u.bar}`} aria-hidden="true" />
              <div className="flex flex-1 flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`text-[10px] uppercase tracking-[0.18em] ${u.text}`}>
                      {u.label}
                    </span>
                    <Link href={`/admin/pedidos/${o.id}`} className="text-sm hover:underline">
                      #{o.orderNumber}
                    </Link>
                    <span className="text-[11px] text-content/40">há {ageLabel(o.minutesOld)}</span>
                    {o.isHighValue && (
                      <span className="border border-content/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-content/60">
                        Alto valor
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-content/80">{o.customerName}</p>
                  <p className="text-[12px] text-content/40">
                    {o.customerEmail}
                    {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                  </p>

                  <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-content/55">
                    {o.situation}
                  </p>

                  <p className="mt-2 text-[12px] text-content/40">{o.items}</p>

                  {o.recoveryEmailSentAt && (
                    <p className="mt-2 text-[11px] text-content/35">
                      Lembrete por e-mail já enviado.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                  <span className="text-base">{brl(o.totalCents)}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {o.whatsappUrl && (
                      <a
                        href={o.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-content/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors hover:border-content"
                      >
                        WhatsApp
                      </a>
                    )}
                    <RecoveryButton
                      orderId={o.id}
                      sentAt={o.recoveryEmailSentAt ? o.recoveryEmailSentAt.toISOString() : null}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {queue.length === 0 && (
        <p className="py-10 text-center text-sm text-content/50">
          Nenhuma venda parada no momento.
        </p>
      )}

      <div className="mt-12 border-t border-content/10 pt-8">
        <RecoverySettingsForm
          settings={{
            minutes: settings.minutes,
            highValueReais: (settings.highValueCents / 100).toFixed(2),
            alertEmail: settings.alertEmail,
          }}
        />
      </div>
    </div>
  );
}
