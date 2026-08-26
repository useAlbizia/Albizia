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
  // When a cart-recovery email was last sent for this (still pending) order —
  // stops us from spamming the same abandoned checkout.
  recoveryEmailSentAt: timestamp("recovery_email_sent_at", { withTimezone: true }),
  mpPreferenceId: text("mp_preference_id"),
  mpPaymentId: text("mp_payment_id"),
  mpStatus: text("mp_status"),
  paymentMethod: text("payment_method"),
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
  sessionId: text("session_id"),
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
