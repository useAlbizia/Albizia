"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "./review-actions";

const initial: ReviewState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function ReviewForm({
  productId,
  defaultName = "",
}: {
  productId: string;
  defaultName?: string;
}) {
  const action = submitReview.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok) {
    return (
      <p className="text-sm text-content/60">
        Obrigado! Sua avaliação foi enviada e aparecerá após aprovação.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            aria-checked={rating === n}
            role="radio"
            className={`text-2xl leading-none transition-colors ${
              (hover || rating) >= n ? "text-content" : "text-content/25"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <input name="authorName" defaultValue={defaultName} placeholder="Seu nome" required className={input} />
      <textarea
        name="comment"
        placeholder="Conte o que achou da peça (opcional)"
        rows={4}
        className={input}
      />

      {state.error && <p className="text-[13px] text-content/70">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="mt-1 self-start border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
      >
        {pending ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
