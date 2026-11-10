import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Fixed brand taxonomy — matches src/lib/products.ts ProductLine. Founders
// don't manage collections themselves in v1, but products reference one.
export const productLineEnum = pgEnum("product_line", [
  "essential",
  "signature",
  "studio",
  "moda-praia",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "shipped",
  "cancelled",
  "refunded",
]);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: productLineEnum("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  fabric: text("fabric").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id),
  category: text("category").notNull(), // "camiseta" | "moda-praia"
  priceCents: integer("price_cents").notNull(),
  // NCM (Nomenclatura Comum do Mercosul): classificação fiscal exigida em
  // cada item da NF-e. Vazio significa "usar o padrão da categoria" (ver
  // lib/fiscal.ts), para o fundador não precisar preencher peça por peça.
  ncm: text("ncm").notNull().default(""),
  // Medidas da peça embalada, usadas na cotação e na compra da etiqueta.
  // Zero significa "usar o pacote padrão de Admin → Entrega e frete", para o
  // fundador não ter que medir peça por peça antes de abrir a loja. Uma
  // camiseta e um short de praia não cabem na mesma caixa, e a diferença
  // entre o cotado e o real sai do bolso de quem vende.
  weightGrams: integer("weight_grams").notNull().default(0),
  lengthCm: integer("length_cm").notNull().default(0),
  widthCm: integer("width_cm").notNull().default(0),
  heightCm: integer("height_cm").notNull().default(0),
  // Quanto custa UMA peça pronta para vender: a camiseta lisa, a estampa e a
  // embalagem dela. É o que permite saber o lucro de cada venda (o CMV, custo
  // da mercadoria vendida). Zero = ainda não informado, e o painel avisa em
  // vez de mostrar um lucro que não existe.
  custoCents: integer("custo_cents").notNull().default(0),
  fabric: text("fabric").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  // Color grouping: products sharing a colorGroup are the same piece in
  // different colors, shown as selectable swatches on each other's pages.
  colorGroup: text("color_group"),
  colorName: text("color_name").notNull().default(""),
  colorHex: text("color_hex").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  role: text("role"), // "studio" | "lifestyle" | "detail" | "gallery"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    stock: integer("stock").notNull().default(0),
    sku: text("sku").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.productId, table.size)]
);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: integer("order_number").generatedAlwaysAsIdentity().unique(),
  status: orderStatusEnum("status").notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  // CPF (ou CNPJ) do destinatário, só dígitos. Exigido pela NF-e modelo 55,
  // que é o que vale para venda de produto. Sem isso não há nota, então é
  // coletado no checkout. Pedidos antigos ficam vazios.
  customerDocument: text("customer_document").notNull().default(""),
  shippingAddress: jsonb("shipping_address").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull().default(0),
  // Coupon discount applied at checkout (0 = none). couponCode is a snapshot
  // of the code used, so a later coupon edit/delete doesn't rewrite history.
  discountCents: integer("discount_cents").notNull().default(0),
  couponCode: text("coupon_code"),
  totalCents: integer("total_cents").notNull(),
  // Carrier tracking code, set when the order is marked shipped.
  trackingCode: text("tracking_code"),
  // ── Melhor Envio ─────────────────────────────────────────────────────
  // Qual serviço o CLIENTE escolheu no checkout. Sem isso não dá para
  // comprar a etiqueta depois: o Melhor Envio precisa saber se é PAC, SEDEX
  // ou Jadlog, e cobrar outro serviço muda o preço que já foi pago.
  meServiceId: integer("me_service_id"),
  meServiceName: text("me_service_name"),
  meCompany: text("me_company"),
  // O envio dentro do Melhor Envio, do carrinho até a entrega.
  meOrderId: text("me_order_id"),
  // cart | paid | generated | posted | delivered | canceled
  meStatus: text("me_status"),
  // O que a etiqueta custou de verdade, contra o shippingCents que o cliente
  // pagou. Guardar os dois é o que mostra se o frete deu lucro ou prejuízo
  // naquela venda, em vez de só aparecer no fim do mês.
  meLabelCostCents: integer("me_label_cost_cents"),
  meLabelUrl: text("me_label_url"),
  meLabeledAt: timestamp("me_labeled_at", { withTimezone: true }),
  // When a cart-recovery email was last sent for this (still pending) order —
  // stops us from spamming the same abandoned checkout.
  recoveryEmailSentAt: timestamp("recovery_email_sent_at", { withTimezone: true }),
  // Quando a equipe foi avisada de que este pedido de alto valor empacou.
  // Guardado por pedido para o alerta nunca sair duas vezes, por mais que o
  // cron rode de hora em hora.
  recoveryAlertSentAt: timestamp("recovery_alert_sent_at", { withTimezone: true }),
  mpPreferenceId: text("mp_preference_id"),
  mpPaymentId: text("mp_payment_id"),
  mpStatus: text("mp_status"),
  paymentMethod: text("payment_method"),
  // ── O que o Mercado Pago diz sobre o dinheiro deste pedido ───────────
  // Lido da API deles (webhook e sincronização), nunca digitado: é o que
  // deixa o caixa da empresa certo sem ninguém lançar venda à mão.
  // Taxa cobrada da loja (processamento, parcelamento quando é da loja).
  mpFeeCents: integer("mp_fee_cents"),
  // O que de fato cai na conta: valor pago menos a taxa.
  mpNetCents: integer("mp_net_cents"),
  // Estorno ao cliente. Sem isso uma venda devolvida continuaria contando
  // como receita.
  mpRefundedCents: integer("mp_refunded_cents").notNull().default(0),
  // Quando o dinheiro fica disponível para saque. Até lá ele é da empresa,
  // mas ainda não dá para usar.
  mpReleaseDate: timestamp("mp_release_date", { withTimezone: true }),
  mpSyncedAt: timestamp("mp_synced_at", { withTimezone: true }),
  // Custo do envelope de envio deste pedido, no dia da venda (insumos do
  // tipo "embalagem do pedido"). Entra no resultado do mês, não no caixa.
  embalagemCents: integer("embalagem_cents").notNull().default(0),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productVariantId: uuid("product_variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  // Snapshot at purchase time — never recomputed from a live join, so a
  // later price edit doesn't retroactively change an old order's total.
  productName: text("product_name").notNull(),
  size: text("size").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  // Custo da peça NO DIA DA VENDA, copiado do produto. Pelo mesmo motivo do
  // preço acima: se o custo da camiseta subir no mês que vem, o lucro das
  // vendas antigas não pode mudar sozinho. Nulo em pedido anterior a este
  // campo; aí a conta usa o custo atual do produto e avisa.
  unitCostCents: integer("unit_cost_cents"),
});

// Singleton row (id = 1) holding brand/company/contact data shown in the
// footer and used as sender identity. Edited from /admin/conteudo.
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name").notNull().default(""),
  cnpj: text("cnpj").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  address: text("address").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  tiktok: text("tiktok").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  // Top announcement bar (e.g. "Frete grátis acima de R$X"), toggleable.
  announcementText: text("announcement_text").notNull().default(""),
  announcementActive: boolean("announcement_active").notNull().default(false),
  // Shipping config (swappable strategy — see lib/shipping.ts). Flat national
  // rate in cents; free above the threshold (0 threshold = no free shipping;
  // 0 flat = always free).
  shippingFlatCents: integer("shipping_flat_cents").notNull().default(0),
  freeShippingThresholdCents: integer("free_shipping_threshold_cents").notNull().default(0),
  // Shipping method: "flat" (admin rate above) or "melhor_envio" (live rates
  // by CEP). meToken is a secret — it is read ONLY server-side and is never
  // included in the client-facing getSiteSettings().
  shippingMethod: text("shipping_method").notNull().default("flat"),
  meToken: text("me_token").notNull().default(""),
  meFromCep: text("me_from_cep").notNull().default(""),
  meWeightGrams: integer("me_weight_grams").notNull().default(300),
  meLengthCm: integer("me_length_cm").notNull().default(20),
  meWidthCm: integer("me_width_cm").notNull().default(20),
  meHeightCm: integer("me_height_cm").notNull().default(4),
  // "production" | "sandbox". O sandbox do Melhor Envio é outro mundo: outra
  // conta, outro cadastro, outro token, e nada atravessa de um para o outro.
  // Por isso são dois campos de token, e não um só que troca de valor: a
  // pessoa testa e volta para produção sem ter perdido o token bom.
  meEnvironment: text("me_environment").notNull().default("production"),
  // Quais serviços do Melhor Envio aparecem no checkout, como ids separados
  // por vírgula (1 = PAC, 2 = SEDEX, 17 = Mini Envios). A cotação sem filtro
  // devolve 10 opções, demais para o cliente, e algumas a loja não consegue
  // cumprir: Jadlog, LATAM, Azul e Buslog EXIGEM nota fiscal, e com
  // declaração de conteúdo a etiqueta seria recusada depois do cliente pagar.
  meServices: text("me_services").notNull().default("1,2,17"),
  meTokenSandbox: text("me_token_sandbox").notNull().default(""),
  // Remetente completo. A cotação precisa só do CEP, mas a COMPRA da etiqueta
  // exige nome, documento e endereço inteiro de quem envia. Sem isso o botão
  // de gerar etiqueta não tem o que mandar.
  meFromName: text("me_from_name").notNull().default(""),
  meFromDocument: text("me_from_document").notNull().default(""),
  meFromPhone: text("me_from_phone").notNull().default(""),
  meFromEmail: text("me_from_email").notNull().default(""),
  meFromAddress: text("me_from_address").notNull().default(""),
  meFromNumber: text("me_from_number").notNull().default(""),
  meFromComplement: text("me_from_complement").notNull().default(""),
  meFromDistrict: text("me_from_district").notNull().default(""),
  meFromCity: text("me_from_city").notNull().default(""),
  meFromState: text("me_from_state").notNull().default(""),
  // Mercado Pago (Checkout Transparente). mpAccessToken is a SECRET, read ONLY
  // server-side and never returned to the browser. mpPublicKey is meant to be
  // public — the Payment Brick needs it in the client to tokenize the card, so
  // the card number never touches our server.
  // Preenchidos pelo OAuth (ou colados à mão, no caminho alternativo).
  mpPublicKey: text("mp_public_key").notNull().default(""),
  mpAccessToken: text("mp_access_token").notNull().default(""),
  // ── Conexão por OAuth ──────────────────────────────────────────────
  // Dados da APLICAÇÃO, que vive na conta de quem desenvolve. Configurados
  // uma vez e não mudam mais.
  mpClientId: text("mp_client_id").notNull().default(""),
  mpClientSecret: text("mp_client_secret").notNull().default(""),
  // Dados da CONTA CONECTADA, que é quem recebe o dinheiro. Vêm da
  // autorização e são renovados sozinhos antes de vencer.
  mpRefreshToken: text("mp_refresh_token").notNull().default(""),
  mpUserId: text("mp_user_id").notNull().default(""),
  mpConnectedAt: timestamp("mp_connected_at", { withTimezone: true }),
  mpExpiresAt: timestamp("mp_expires_at", { withTimezone: true }),
  // Recuperação de venda. Um checkout parado é dinheiro na mesa: passado
  // recoveryMinutes sem pagar ele entra na fila, e acima de
  // recoveryHighValueCents dispara alerta para alguém ligar para o cliente.
  recoveryMinutes: integer("recovery_minutes").notNull().default(60),
  recoveryHighValueCents: integer("recovery_high_value_cents").notNull().default(50000),
  recoveryAlertEmail: text("recovery_alert_email").notNull().default(""),
  // UF de onde a loja despacha. Define o CFOP da nota: venda dentro do
  // estado usa 5102, para fora usa 6102. Sem isso a exportação não
  // conseguiria preencher esse campo sozinha.
  storeUf: text("store_uf").notNull().default(""),
  // ── Home: abertura e slide da marca ──────────────────────────────────
  // A árvore desenhando na primeira visita, uma vez por visitante, e depois
  // como um slide do banner. Os dois são chave no painel porque são decisão
  // de marca, não de código.
  introEnabled: boolean("intro_enabled").notNull().default(true),
  brandSlideEnabled: boolean("brand_slide_enabled").notNull().default(true),
  // "first" | "last": onde o slide da árvore entra entre as campanhas.
  brandSlidePosition: text("brand_slide_position").notNull().default("last"),
  // A variant at or below this stock count is flagged "low" on the dashboard
  // and in the daily low-stock alert email.
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Discount coupons applied at checkout. type "percent" → value is 1–100;
// type "fixed" → value is a discount in cents. usedCount increments only when
// an order that used the code is actually PAID (see the MP webhook).
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // stored uppercase
  type: text("type").notNull(), // percent | fixed
  value: integer("value").notNull(),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Customer product reviews. Created as "pending" and only shown on the
// storefront once an admin approves them (moderation guards against spam and
// abuse). rating is 1–5.
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Home hero banners (carousel), managed in the admin. When any are active they
// replace the animated-symbol hero on the home page.
export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaHref: text("cta_href").notNull().default(""),
  align: text("align").notNull().default("center"), // left | center | right
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Configurable storefront navigation (mega-menu). Each menu_items row is a
// top-level entry in the header; its menu_links are the sub-links shown in the
// drop panel, grouped into columns by columnTitle. An optional featured image
// gives the Reserva-style visual block on the right of the panel.
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  href: text("href"), // the top entry may link somewhere itself (optional)
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  featuredImageUrl: text("featured_image_url"),
  featuredHref: text("featured_href"),
  featuredLabel: text("featured_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuLinks = pgTable("menu_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  columnTitle: text("column_title").notNull().default(""), // groups links into columns
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  links: many(menuLinks),
}));

export const menuLinksRelations = relations(menuLinks, ({ one }) => ({
  item: one(menuItems, { fields: [menuLinks.menuItemId], references: [menuItems.id] }),
}));

// Append-only trail of admin actions — who (which founder) changed what and
// when. Written from server actions; never edited or deleted from the app.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(), // e.g. order.status, product.update, coupon.create
  entity: text("entity"),
  entityId: text("entity_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Editable legal/informational pages (Termos, Privacidade, Trocas). Body is
// plain text with blank-line paragraphs; rendered on public /[slug] routes.
export const legalPages = pgTable("legal_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // termos | privacidade | trocas
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Newsletter subscribers captured on the storefront.
export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("active"), // active | unsubscribed
  source: text("source").notNull().default("site"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

// Email marketing campaigns sent from the admin.
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// First-party, cookie-light analytics. One flat event stream powering the
// admin dashboard: page views, product views, cart adds, checkout starts,
// and orders. sessionId is a random anonymous id (no PII).
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // page_view | product_view | add_to_cart | checkout_start | order_created | order_paid
  path: text("path"),
  productSlug: text("product_slug"),
  // sessionId = one visit (per-tab, sessionStorage). visitorId = the same
  // person across visits (persistent, localStorage) → unique/returning visitors.
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  device: text("device"), // mobile | tablet | desktop
  browser: text("browser"), // Chrome, Safari, Firefox, ...
  os: text("os"), // Android, iOS, Windows, macOS, ...
  country: text("country"),
  region: text("region"),
  city: text("city"),
  referrer: text("referrer"), // where the visit came from (host only)
  valueCents: integer("value_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  collection: one(collections, {
    fields: [products.collectionId],
    references: [collections.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [orderItems.productVariantId],
    references: [productVariants.id],
  }),
}));

// ── Sócios e livro caixa ─────────────────────────────────────────────────
//
// O controle administrativo da empresa: quem colocou quanto, no quê, quando e
// como, e o que a empresa pagou com o próprio dinheiro. A ideia que organiza
// tudo é uma só: cada lançamento diz QUEM tirou dinheiro do bolso. Se foi um
// sócio, aquilo vira capital investido por ele; se foi a empresa, sai do
// caixa. Os saldos (caixa, capital de cada um, equilíbrio entre os três) são
// sempre calculados a partir dos lançamentos, nunca digitados, para nunca
// ficarem em desacordo com a história.

export const socios = pgTable("socios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  // Para ligar o sócio ao login do painel e ao robô de lançamentos.
  email: text("email").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  telegramId: text("telegram_id").notNull().default(""),
  // Participação em cotas, não em porcentagem: três sócios com 1 cota cada
  // são exatamente um terço, sem o 33,33% + 33,33% + 33,33% = 99,99%.
  cotas: integer("cotas").notNull().default(1),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lancamentos = pgTable("lancamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  data: date("data", { mode: "string" }).notNull(),
  // despesa | receita | aporte | devolucao_aporte | distribuicao_lucro
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  categoria: text("categoria").notNull().default(""),
  // Onde foi comprado / de quem: fornecedor, loja, site.
  fornecedor: text("fornecedor").notNull().default(""),
  formaPagamento: text("forma_pagamento").notNull().default(""),
  valorCents: integer("valor_cents").notNull(),
  // pago | previsto. Parcelas futuras nascem "previsto" e viram "pago"
  // quando a fatura é paga, para o caixa não contar dinheiro que não saiu.
  status: text("status").notNull().default("pago"),
  // Parcelamento: todas as parcelas de uma compra dividem o mesmo grupoId.
  grupoId: uuid("grupo_id"),
  parcelaNum: integer("parcela_num"),
  parcelaTotal: integer("parcela_total"),
  // Para aporte, devolução e distribuição: de qual sócio é o dinheiro.
  socioId: uuid("socio_id").references(() => socios.id),
  // painel | telegram | whatsapp
  origem: text("origem").notNull().default("painel"),
  criadoPor: text("criado_por").notNull().default(""),
  observacao: text("observacao").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Quem pagou cada despesa, e quanto. Uma linha com socioId nulo é a empresa
// pagando com o caixa. Uma despesa pode ter vários pagadores: a parcela da
// prensa é dividida entre os três.
export const lancamentoPagadores = pgTable("lancamento_pagadores", {
  id: uuid("id").primaryKey().defaultRandom(),
  lancamentoId: uuid("lancamento_id")
    .notNull()
    .references(() => lancamentos.id, { onDelete: "cascade" }),
  socioId: uuid("socio_id").references(() => socios.id),
  valorCents: integer("valor_cents").notNull(),
});

export const lancamentosRelations = relations(lancamentos, ({ many, one }) => ({
  pagadores: many(lancamentoPagadores),
  socio: one(socios, { fields: [lancamentos.socioId], references: [socios.id] }),
}));

export const lancamentoPagadoresRelations = relations(lancamentoPagadores, ({ one }) => ({
  lancamento: one(lancamentos, {
    fields: [lancamentoPagadores.lancamentoId],
    references: [lancamentos.id],
  }),
  socio: one(socios, { fields: [lancamentoPagadores.socioId], references: [socios.id] }),
}));

// Meta de vendas de cada mês, para o painel comparar o planejado com o
// realizado. Uma linha por mês ("2026-12"); mês sem meta simplesmente não
// mostra comparação.
export const metasMensais = pgTable("metas_mensais", {
  mes: text("mes").primaryKey(),
  vendasCents: integer("vendas_cents").notNull().default(0),
  observacao: text("observacao").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Ficha técnica ────────────────────────────────────────────────────────
//
// Insumos são o que se compra para fazer as peças (peça lisa, DTF,
// autorrelevo, etiqueta, tag, ziplock, envelope). O custo fica guardado como o
// LOTE ("1.000 etiquetas por R$ 35,00"), nunca como um preço unitário
// arredondado: uma etiqueta custa 3,5 centavos, e arredondar insumo por
// insumo erra o custo de toda peça. Ver lib/ficha-calc.ts.

export const insumos = pgTable("insumos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  // peca | estampa | etiqueta | acabamento | embalagem_peca | embalagem_pedido | outro
  tipo: text("tipo").notNull().default("outro"),
  // un | m | cm | g
  unidade: text("unidade").notNull().default("un"),
  loteValorCents: integer("lote_valor_cents").notNull().default(0),
  // Em milésimos: 1.000 etiquetas = 1.000.000; 2,5 m = 2.500.
  loteQuantidadeMil: integer("lote_quantidade_mil").notNull().default(1000),
  fornecedor: text("fornecedor").notNull().default(""),
  // Insumo usado em ficha não se apaga, só se desativa, para o custo das
  // fichas antigas continuar explicável.
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A receita de cada modelo: quanto de cada insumo vai em UMA peça.
export const fichaTecnica = pgTable(
  "ficha_tecnica",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    insumoId: uuid("insumo_id")
      .notNull()
      .references(() => insumos.id),
    // Em milésimos: 1 unidade = 1000; 0,25 m de DTF = 250.
    quantidadeMil: integer("quantidade_mil").notNull(),
  },
  (t) => [unique("ficha_produto_insumo").on(t.productId, t.insumoId)],
);

export const fichaTecnicaRelations = relations(fichaTecnica, ({ one }) => ({
  insumo: one(insumos, { fields: [fichaTecnica.insumoId], references: [insumos.id] }),
  product: one(products, { fields: [fichaTecnica.productId], references: [products.id] }),
}));

// ── Caixa de e-mail do painel (contato@usealbizia.com.br) ───────────────
//
// O Resend recebe o e-mail e avisa o site (webhook); o conteúdo é buscado no
// próprio Resend com a nossa chave e guardado aqui. Respostas e e-mails
// escritos no painel também ficam aqui, para a conversa aparecer inteira.
export const emailMensagens = pgTable("email_mensagens", {
  id: uuid("id").primaryKey().defaultRandom(),
  // "in" = recebido; "out" = enviado pelo painel.
  direcao: text("direcao").notNull(),
  // Id do Resend: impede gravar o mesmo e-mail duas vezes quando o aviso
  // chega repetido (o Resend reenvia de propósito se não confirmamos).
  resendId: text("resend_id").unique(),
  // Para a resposta cair na mesma conversa no Gmail/Outlook de quem escreveu.
  messageId: text("message_id"),
  inReplyTo: text("in_reply_to"),
  deEmail: text("de_email").notNull(),
  deNome: text("de_nome"),
  paraEmail: text("para_email").notNull(),
  assunto: text("assunto").notNull().default(""),
  texto: text("texto"),
  html: text("html"),
  anexos: jsonb("anexos").notNull().default([]),
  lido: boolean("lido").notNull().default(false),
  importante: boolean("importante").notNull().default(false),
  arquivado: boolean("arquivado").notNull().default(false),
  spam: boolean("spam").notNull().default(false),
  // Lixeira: some das pastas, mas dá para restaurar até ser esvaziada.
  excluidoEm: timestamp("excluido_em", { withTimezone: true }),
  enviadoPor: text("enviado_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
