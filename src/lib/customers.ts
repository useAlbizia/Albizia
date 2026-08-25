import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { orders } from "./db/schema";

export type CustomerSummary = {
  email: string;
  name: string;
  phone: string;
  ordersCount: number;
  paidCount: number;
  totalSpentCents: number;
  lastOrderAt: Date;
};

// Customers don't have their own table — they're derived from the orders they
// placed, keyed by lower(email). name/phone come from their most recent order.
export async function getCustomers(): Promise<CustomerSummary[]> {
  const result = await db.execute(sql`
    select
      lower(customer_email) as email,
      (array_agg(customer_name order by created_at desc))[1] as name,
      (array_agg(customer_phone order by created_at desc))[1] as phone,
      count(*)::int as orders_count,
      count(*) filter (where status in ('paid','shipped'))::int as paid_count,
      coalesce(sum(total_cents) filter (where status in ('paid','shipped')), 0)::int as total_spent,
      max(created_at) as last_order_at
    from orders
    group by lower(customer_email)
    order by total_spent desc, last_order_at desc
  `);

  const rows = result as unknown as Array<{
    email: string;
    name: string;
    phone: string;
    orders_count: number;
    paid_count: number;
    total_spent: number;
    last_order_at: string;
  }>;

  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    phone: r.phone,
    ordersCount: r.orders_count,
    paidCount: r.paid_count,
    totalSpentCents: r.total_spent,
    lastOrderAt: new Date(r.last_order_at),
  }));
}

export type CustomerDetail = {
  email: string;
  name: string;
  phone: string;
  totalSpentCents: number;
  paidCount: number;
  orders: {
    id: string;
    orderNumber: number;
    status: string;
    totalCents: number;
    createdAt: Date;
  }[];
};

export async function getCustomer(email: string): Promise<CustomerDetail | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;

  const rows = await db.query.orders.findMany({
    where: eq(sql`lower(${orders.customerEmail})`, clean),
    orderBy: [desc(orders.createdAt)],
    columns: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
    },
  });
  if (rows.length === 0) return null;

  const paid = rows.filter((o) => o.status === "paid" || o.status === "shipped");
  return {
    email: clean,
    name: rows[0].customerName,
    phone: rows[0].customerPhone,
    totalSpentCents: paid.reduce((s, o) => s + o.totalCents, 0),
    paidCount: paid.length,
    orders: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
    })),
  };
}
