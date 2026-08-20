import { Symbol } from "./logo/Symbol";

type ProductPlaceholderProps = {
  name: string;
  className?: string;
  tone?: "cream" | "taupe" | "graphite";
};

const TONE_BG: Record<string, string> = {
  cream: "bg-surface-soft",
  taupe: "bg-taupe/30",
  graphite: "bg-graphite/15",
};

// Stand-in artwork until the AI-generated product mockups (see
// mockup-prompts.md) are produced and dropped into /public/products.
export function ProductPlaceholder({ name, className, tone = "cream" }: ProductPlaceholderProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${TONE_BG[tone]} ${className ?? ""}`}
    >
      <Symbol className="h-1/4 w-1/4 opacity-20" />
      <span className="absolute bottom-4 left-4 right-4 text-[11px] uppercase tracking-[0.2em] text-content/40">
        {name}
      </span>
    </div>
  );
}
