import Dexie, { type Table } from "dexie";

export type ProductGroup = {
  id?: number;
  name: string;
};

export type ProductSubgroup = {
  id?: number;
  groupId: number;
  name: string;
};

export type Product = {
  id?: number;
  name: string;
  groupId: number;
  subgroupId?: number | null;
  unitPrice: number;
  sellsFractioned: boolean;
  active: boolean;
};

export type Customer = {
  id?: number;
  name: string;
  phone?: string;
  notes?: string;
  favorite?: boolean;
};

export type ComandaStatus = "OPEN" | "CLOSED";

export type Comanda = {
  id?: number;
  customerId: number | null;
  openedAt: string;
  closedAt?: string | null;
  status: ComandaStatus;
  notes?: string;
  vipFiado?: boolean;
  creditLimit?: number | null;
  dueDay?: string | null;
};

export type SalePaymentMethod = "PIX" | "CASH" | "CARD";

export type Sale = {
  id?: number;
  comandaId: number;
  createdAt: string;
  paymentMethod: SalePaymentMethod;
  notes?: string;
};

export type SaleItem = {
  id?: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPriceAtTime: number;
  subtotal: number;
};

export type PaymentMethod = "PIX" | "CASH" | "CARD";

export type Payment = {
  id?: number;
  comandaId: number;
  createdAt: string;
  method: PaymentMethod;
  amount: number;
  notes?: string;
};

class BotecoDB extends Dexie {
  product_groups!: Table<ProductGroup, number>;
  product_subgroups!: Table<ProductSubgroup, number>;
  products!: Table<Product, number>;
  customers!: Table<Customer, number>;
  comandas!: Table<Comanda, number>;
  sales!: Table<Sale, number>;
  sale_items!: Table<SaleItem, number>;
  payments!: Table<Payment, number>;

  constructor() {
    super("caderninho_boteco");
    this.version(1).stores({
      product_groups: "++id, name",
      product_subgroups: "++id, groupId, name",
      products: "++id, name, groupId, subgroupId, active",
      customers: "++id, name, phone"
    });
    this.version(2).stores({
      product_groups: "++id, name",
      product_subgroups: "++id, groupId, name",
      products: "++id, name, groupId, subgroupId, active",
      customers: "++id, name, phone",
      comandas: "++id, customerId, status, openedAt",
      sales: "++id, comandaId, createdAt",
      sale_items: "++id, saleId, productId",
      payments: "++id, comandaId, createdAt"
    });
    this.version(3)
      .stores({
      product_groups: "++id, name",
      product_subgroups: "++id, groupId, name",
      products: "++id, name, groupId, subgroupId, active",
      customers: "++id, name, phone, favorite",
      comandas: "++id, customerId, status, openedAt",
      sales: "++id, comandaId, createdAt",
      sale_items: "++id, saleId, productId",
      payments: "++id, comandaId, createdAt"
      })
      .upgrade(async (tx) => {
        const comandasTable = tx.table<Comanda, number>("comandas");
        const salesTable = tx.table<Sale, number>("sales");
        const paymentsTable = tx.table<Payment, number>("payments");
        const saleItemsTable = tx.table<SaleItem, number>("sale_items");

        const orphanComandas = await comandasTable.where("customerId").equals(null).toArray();
        const orphanComandaIds = orphanComandas.map((c) => c.id).filter((id): id is number => Boolean(id));
        if (orphanComandaIds.length === 0) return;

        const orphanSales = await salesTable.where("comandaId").anyOf(orphanComandaIds).toArray();
        const orphanSaleIds = orphanSales.map((s) => s.id).filter((id): id is number => Boolean(id));

        await paymentsTable.where("comandaId").anyOf(orphanComandaIds).delete();
        if (orphanSaleIds.length > 0) {
          await saleItemsTable.where("saleId").anyOf(orphanSaleIds).delete();
          await salesTable.where("id").anyOf(orphanSaleIds).delete();
        }
        await comandasTable.where("id").anyOf(orphanComandaIds).delete();
      });
  }
}

export const db = new BotecoDB();
