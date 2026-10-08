"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { Banner } from "@/lib/banners";
import { BrandSlide } from "@/components/BrandSlide";

const alignMap: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

type Slide = { kind: "banner"; banner: Banner } | { kind: "marca" };

// Quanto o dedo precisa andar, ou com que velocidade, para trocar de slide.
// Menos que isso é toque, ou rolagem da página que escorregou para o lado.
const LIMIAR_PX = 60;
const LIMIAR_VELOCIDADE = 400;
const INTERVALO_MS = 6000;

// Entra pelo lado de onde o dedo veio e sai pelo outro, como no celular se
// espera. Um fade, como era antes, não conversa com o gesto de arrastar.
const variantes = {
  entra: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  centro: { x: "0%" },
  sai: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%" }),
};

export function HeroBanners({
  banners,
  brandSlide,
}: {
  banners: Banner[];
  /** Onde a árvore entra entre as campanhas; null = não entra. */
  brandSlide: "first" | "last" | null;
}) {
  const slides: Slide[] = banners.map((banner) => ({ kind: "banner", banner }));
  if (brandSlide === "first") slides.unshift({ kind: "marca" });
  if (brandSlide === "last") slides.push({ kind: "marca" });
  // Sem campanha nenhuma, a árvore é o topo da home de qualquer jeito: uma
  // home sem nada em cima é pior que a marca sozinha.
  if (slides.length === 0) slides.push({ kind: "marca" });

  const count = slides.length;
  const [[i, dir], setPos] = useState<[number, number]>([0, 1]);
  const [pausado, setPausado] = useState(false);
  const arrastou = useRef(false);

  const ir = useCallback(
    (passo: number) => setPos(([atual]) => [(atual + passo + count) % count, passo]),
    [count],
  );

  // Troca sozinha, mas para enquanto a pessoa está com o dedo ou o mouse em
  // cima: ninguém gosta do slide fugindo no meio da leitura. O efeito
  // reinicia a cada troca, então depois de um gesto manual o relógio zera.
  useEffect(() => {
    if (count <= 1 || pausado) return;
    const t = setTimeout(() => ir(1), INTERVALO_MS);
    return () => clearTimeout(t);
  }, [count, pausado, i, ir]);

  function soltou(_: unknown, info: PanInfo) {
    setPausado(false);
    const longe = Math.abs(info.offset.x) > LIMIAR_PX;
    const rapido = Math.abs(info.velocity.x) > LIMIAR_VELOCIDADE;
    if (!longe && !rapido) return;
    arrastou.current = true;
    ir(info.offset.x < 0 ? 1 : -1);
  }

  const s = slides[Math.min(i, count - 1)];
  const naMarca = s.kind === "marca";

  return (
    <section
      className="relative h-[68vh] min-h-[420px] w-full overflow-hidden bg-surface-soft"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carrossel"
    >
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={s.kind === "banner" ? s.banner.id : "marca"}
          custom={dir}
          variants={variantes}
          initial="entra"
          animate="centro"
          exit="sai"
          transition={{ x: { type: "tween", duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
          drag={count > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          // O elástico é o que dá a sensação de "passa levemente": o slide
          // acompanha o dedo um pouco e volta se o gesto não foi decidido.
          dragElastic={0.25}
          onDragStart={() => setPausado(true)}
          onDragEnd={soltou}
          // Um arrasto que terminou em cima de um link não pode virar clique
          // e levar a pessoa para outra página sem ela querer.
          onClickCapture={(e) => {
            if (arrastou.current) {
              e.preventDefault();
              e.stopPropagation();
              arrastou.current = false;
            }
          }}
          className="absolute inset-0 touch-pan-y"
        >
          {s.kind === "marca" ? (
            <BrandSlide />
          ) : (
            <>
              <Image
                src={s.banner.imageUrl}
                alt={s.banner.title || "ALBIZIA"}
                fill
                priority={i === 0}
                sizes="100vw"
                draggable={false}
                className="pointer-events-none select-none object-cover"
              />
              {(s.banner.title || s.banner.subtitle || s.banner.ctaLabel) && (
                <div
                  className={`absolute inset-0 flex flex-col justify-center gap-4 bg-black/25 px-8 sm:px-16 ${alignMap[s.banner.align] ?? alignMap.center}`}
                >
                  {s.banner.subtitle && (
                    <span className="text-[11px] uppercase tracking-[0.3em] text-white/80">
                      {s.banner.subtitle}
                    </span>
                  )}
                  {s.banner.title && (
                    <h2 className="max-w-xl text-3xl font-light uppercase tracking-[0.1em] text-white sm:text-5xl">
                      {s.banner.title}
                    </h2>
                  )}
                  {s.banner.ctaLabel && s.banner.ctaHref && (
                    <Link
                      href={s.banner.ctaHref}
                      draggable={false}
                      className="mt-2 inline-block border border-white px-8 py-3 text-[13px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
                    >
                      {s.banner.ctaLabel}
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          {/* Os controles mudam de cor no slide da marca: branco some sobre o
              fundo claro do dia. */}
          <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2">
            {slides.map((sl, idx) => (
              <button
                key={sl.kind === "banner" ? sl.banner.id : "marca"}
                onClick={() => setPos(([atual]) => [idx, idx >= atual ? 1 : -1])}
                aria-label={`Slide ${idx + 1} de ${count}`}
                aria-current={idx === i}
                className={`h-1.5 rounded-full transition-all ${
                  naMarca
                    ? idx === i
                      ? "w-6 bg-content"
                      : "w-1.5 bg-content/30 hover:bg-content/60"
                    : idx === i
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
          {/* No celular as setas somem: lá o gesto é arrastar, e seta em
              cima da foto só atrapalha. */}
          <button
            onClick={() => ir(-1)}
            aria-label="Anterior"
            className={`absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 p-2 transition-colors sm:block ${naMarca ? "text-content/50 hover:text-content" : "text-white/70 hover:text-white"}`}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            onClick={() => ir(1)}
            aria-label="Próximo"
            className={`absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 p-2 transition-colors sm:block ${naMarca ? "text-content/50 hover:text-content" : "text-white/70 hover:text-white"}`}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
    </section>
  );
}
