// Aparece NA HORA em que alguém toca num link do painel, enquanto a próxima
// tela carrega. Sem isto, uma tela que demora dois segundos parecia um toque
// que "não fez nada" (o caso dos pedidos que pareciam não abrir).
export default function Carregando() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-content/20 border-t-content" aria-hidden="true" />
      <p className="text-[13px] uppercase tracking-[0.2em] text-content/70">Abrindo...</p>
    </div>
  );
}
