"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "../_actions";

const OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "shipped", label: "Enviado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
] as const;

export function StatusControl({ orderId, status }: { orderId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value as (typeof OPTIONS)[number]["value"];
          setValue(next);
          startTransition(() => updateOrderStatus(orderId, next));
        }}
        className="border border-content/30 bg-transparent px-4 py-2 text-sm outline-none focus:border-content"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-[11px] text-content/40">salvando...</span>}
    </div>
  );
}
