import Link from "next/link";
import { ComecarTour } from "./ComecarTour";

export const metadata = { title: "Manual · Painel ALBIZIA" };

// O manual do painel, para quem chega e para quem esquece. Cada tarefa é um
// bloco que abre e fecha, para caber no celular sem virar um rolo de texto.

function Tarefa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="group border border-content/12 px-5 py-4 open:border-content/25">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm">
        {titulo}
        <span className="text-content/40 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed text-content/70">{children}</div>
    </details>
  );
}

function Passos({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ol className="ml-5 flex list-decimal flex-col gap-1.5">
      {itens.map((i, n) => (
        <li key={n}>{i}</li>
      ))}
    </ol>
  );
}

const link = "underline underline-offset-4";

export default function ManualPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Manual do painel</h1>
        <p className="max-w-2xl text-[13px] leading-relaxed text-content/55">
          O tour mostra as telas principais em dois minutos. Depois, use este manual como consulta:
          cada tarefa abre com o passo a passo.
        </p>
        <div className="mt-5">
          <ComecarTour />
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/60">Acesso</p>

        <Tarefa titulo="Como entrar no painel">
          <Passos
            itens={[
              <>
                Abra <strong>usealbizia.com.br/admin</strong>.
              </>,
              "Digite o e-mail e a senha. Quem entra pela primeira vez recebe uma senha provisória e o painel pede para trocar por uma sua antes de continuar.",
              <>
                Esqueceu a senha? Na tela de entrada, clique em <strong>Esqueci a senha</strong> e siga o
                e-mail da ALBIZIA que chega.
              </>,
            ]}
          />
          <p>
            Sócio novo ou funcionário: um administrador abre{" "}
            <Link href="/admin/usuarios" className={link}>
              Usuários
            </Link>
            , digita o e-mail em <strong>Criar acesso</strong> e manda a senha provisória que aparece. Ela
            só é mostrada uma vez.
          </p>
        </Tarefa>

        <Tarefa titulo="Instalar como aplicativo no celular">
          <p>
            O painel funciona como aplicativo, sem loja: fica com ícone na tela inicial e abre em tela
            cheia.
          </p>
          <p className="mt-1 font-medium text-content">iPhone</p>
          <Passos
            itens={[
              "Abra usealbizia.com.br/admin no Safari (tem que ser o Safari).",
              "Toque no botão de compartilhar, o quadrado com a seta para cima.",
              "Role e toque em Adicionar à Tela de Início, depois em Adicionar.",
            ]}
          />
          <p className="mt-1 font-medium text-content">Android</p>
          <Passos
            itens={[
              "Abra usealbizia.com.br/admin no Chrome.",
              "Toque nos três pontos no canto de cima.",
              "Toque em Instalar app (ou Adicionar à tela inicial).",
            ]}
          />
          <p className="mt-1 font-medium text-content">Computador</p>
          <Passos itens={["No Chrome ou no Edge, clique no ícone de instalar que aparece na barra de endereço."]} />
        </Tarefa>

        <Tarefa titulo="Segurança: o que nunca fazer">
          <Passos
            itens={[
              "Nunca passe sua senha para ninguém, nem para outro sócio. Cada um tem o próprio acesso, e tudo que é feito fica registrado em nome de quem fez, em Auditoria.",
              "Em computador emprestado, saia do painel no fim (botão Sair, embaixo do menu).",
              "Se perder o celular, troque a senha pelo Esqueci a senha em outro aparelho.",
              "A ALBIZIA nunca pede senha por mensagem. Desconfie de qualquer pedido assim.",
            ]}
          />
        </Tarefa>
      </section>

      <section className="flex flex-col gap-2">
        <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/60">Dinheiro da empresa</p>

        <Tarefa titulo="Lançar um gasto ou uma entrada">
          <Passos
            itens={[
              <>
                Abra{" "}
                <Link href="/admin/lancamentos" className={link}>
                  Lançamentos
                </Link>{" "}
                e toque em <strong>Novo lançamento</strong>.
              </>,
              "Escolha o que aconteceu: comprei ou paguei algo, coloquei dinheiro na empresa, ou entrou dinheiro fora do site.",
              "Digite o valor, o que foi e quando.",
              "Escolha quem pagou, em quê e como. No fim aparece uma frase com tudo: confira e toque em Lançar.",
            ]}
          />
          <p>
            Compra de peça lisa, DTF, etiqueta, tag ou embalagem em lote vai em <strong>Estoque e insumos</strong>. Ela
            tira dinheiro do caixa, mas só vira custo quando a peça é vendida.
          </p>
        </Tarefa>

        <Tarefa titulo="Aprovar o lançamento de outro sócio">
          <p>
            Todo lançamento feito por um sócio chega por e-mail para os outros e só entra nas contas depois que todos
            aprovam. Em Lançamentos, os que esperam o seu voto aparecem no topo, com <strong>Aprovar</strong> e{" "}
            <strong>Contestar</strong>. Ao contestar, escreva o motivo: quem lançou recebe o aviso por e-mail.
          </p>
          <p>Cada lançamento mostra quem lançou e quem já aprovou.</p>
        </Tarefa>

        <Tarefa titulo="Compra parcelada no cartão">
          <Passos
            itens={[
              "Lance UMA vez só, como Comprei ou paguei algo, com o valor TOTAL da compra.",
              "Escolha Cartão de crédito e ajuste as parcelas. A data é a da primeira parcela.",
              "O painel cria uma parcela por mês. As que já venceram entram como pagas; cada parcela futura passa a contar sozinha no dia do vencimento. Ninguém precisa lançar nem marcar nada todo mês.",
            ]}
          />
        </Tarefa>

        <Tarefa titulo="Só alguns sócios pagaram (exemplo: a prensa)">
          <p>
            Quando a compra foi dividida só entre alguns sócios, em &quot;Quem pagou?&quot; escolha{" "}
            <strong>Só alguns sócios</strong> e marque quem pagou. Cada parcela é dividida em partes iguais só entre os
            marcados, e o painel mostra quanto cada um paga.
          </p>
          <p>
            Quem não pagou não lança nada. A conta se equilibra sozinha: a parte justa de todos sobe, mas o capital só
            sobe para quem pagou. Se um sócio tinha colocado mais dinheiro antes, a vantagem dele diminui
            automaticamente. É assim que o que ele já investiu &quot;abate&quot; a parte dele.
          </p>
        </Tarefa>

        <Tarefa titulo="Notificações no celular">
          <p>
            Com o aplicativo instalado, aparece no topo o convite <strong>Ligar notificações</strong>. Ligado, o celular
            avisa na hora quando um sócio lança algo para você aprovar, e o ícone do app mostra quantos faltam. No
            iPhone, ligue abrindo pelo ícone instalado, não pelo Safari.
          </p>
        </Tarefa>

        <Tarefa titulo="Sócio colocou dinheiro, devolver, dividir lucro">
          <p>
            <strong>Sócio colocou dinheiro</strong>: um Pix ou depósito de um sócio na conta da empresa.{" "}
            <strong>Devolver a um sócio</strong>: a empresa devolvendo o que ele colocou a mais.{" "}
            <strong>Dividir lucro</strong>: a parte do lucro paga a um sócio. Os três ficam em Lançamentos e
            sempre pedem o nome do sócio.
          </p>
          <p>
            Para saber quem colocou mais e o acerto exato para equilibrar, abra{" "}
            <Link href="/admin/socios" className={link}>
              Sócios e caixa
            </Link>
            .
          </p>
        </Tarefa>

        <Tarefa titulo="O que entra sozinho, sem lançar">
          <p>
            Venda do site, taxa do Mercado Pago, estorno a cliente e etiqueta comprada pelo painel entram
            sozinhos, lidos do Mercado Pago e do Melhor Envio. Eles aparecem em Lançamentos com a marca
            "automático" e não dá para excluir: para corrigir, corrige-se o pedido.
          </p>
        </Tarefa>

        <Tarefa titulo="Fechar o mês">
          <p>
            Abra{" "}
            <Link href="/admin/fechamento" className={link}>
              Fechamento do mês
            </Link>
            . Ele mostra se o mês deu lucro, o caixa do começo ao fim, a meta e quanto é preciso vender para
            não ter prejuízo. Se aparecer um aviso de peça sem custo, preencha a ficha técnica do produto
            indicado: sem ela o lucro aparece maior do que é.
          </p>
        </Tarefa>
      </section>

      <section className="flex flex-col gap-2">
        <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/60">Produtos e custos</p>

        <Tarefa titulo="Cadastrar um insumo">
          <Passos
            itens={[
              <>
                Abra{" "}
                <Link href="/admin/insumos" className={link}>
                  Insumos
                </Link>
                .
              </>,
              "Dê um nome (por exemplo, Peruana manga over lisa preta), escolha o tipo e a unidade.",
              "Digite o que pagou pelo lote e quantos vieram: R$ 1.500,00 por 50. O custo de uma unidade aparece na hora.",
              "Quando o fornecedor mudar o preço, atualize aqui. Todo modelo que usa o insumo muda junto.",
            ]}
          />
          <p>
            O envelope de envio é do tipo <strong>Embalagem do pedido</strong>: ele conta uma vez por pedido,
            não por peça.
          </p>
        </Tarefa>

        <Tarefa titulo="Montar a ficha técnica de um modelo">
          <Passos
            itens={[
              <>
                Em{" "}
                <Link href="/admin/produtos" className={link}>
                  Produtos
                </Link>
                , abra o modelo.
              </>,
              "Em Ficha técnica, adicione cada insumo com a quantidade que vai em UMA peça: 1 peruana, 0,25 m de DTF, 1 etiqueta.",
              "O custo da peça aparece embaixo e passa a ser usado no lucro de cada venda.",
              "Outra cor do mesmo modelo? Use Copiar a ficha de outro produto.",
            ]}
          />
        </Tarefa>
      </section>

      <section className="flex flex-col gap-2">
        <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/60">Pedidos</p>

        <Tarefa titulo="Pedido pago: etiqueta e envio">
          <Passos
            itens={[
              <>
                Em{" "}
                <Link href="/admin/pedidos" className={link}>
                  Pedidos
                </Link>
                , os pagos sem etiqueta aparecem com "emitir".
              </>,
              "Abra o pedido e clique em Preparar etiqueta. Não cobra nada: só confere com o Melhor Envio e mostra o preço.",
              "Clique em Comprar e gerar. O valor sai da carteira do Melhor Envio e o PDF da etiqueta fica pronto para imprimir.",
              "Cole o código de rastreio e clique em Marcar enviado e avisar. O cliente recebe o e-mail com o botão de rastrear.",
            ]}
          />
        </Tarefa>

        <Tarefa titulo="Cliente digitou o e-mail errado">
          <Passos
            itens={[
              "Peça o número do pedido, o nome ou o telefone.",
              "Ache o pedido pela busca em Pedidos e abra.",
              "Corrija o e-mail do cliente e deixe marcado reenviar a confirmação.",
            ]}
          />
        </Tarefa>
      </section>
    </div>
  );
}
