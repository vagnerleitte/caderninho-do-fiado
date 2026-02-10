import { db } from "./db";

export async function seedIfEmpty(): Promise<void> {
  const count = await db.product_groups.count();
  const hasProducts = await db.products.count();
  if (count > 0 && hasProducts > 0) return;

  await db.transaction("rw", db.product_groups, db.product_subgroups, async () => {
    let bebidasId = await db.product_groups
      .where("name")
      .equals("Bebidas")
      .first()
      .then((g) => g?.id);
    let docesId = await db.product_groups
      .where("name")
      .equals("Doces")
      .first()
      .then((g) => g?.id);
    let snacksId = await db.product_groups
      .where("name")
      .equals("Snacks")
      .first()
      .then((g) => g?.id);
    let outrosId = await db.product_groups
      .where("name")
      .equals("Outros")
      .first()
      .then((g) => g?.id);

    if (!bebidasId) bebidasId = await db.product_groups.add({ name: "Bebidas" });
    if (!docesId) docesId = await db.product_groups.add({ name: "Doces" });
    if (!snacksId) snacksId = await db.product_groups.add({ name: "Snacks" });
    if (!outrosId) outrosId = await db.product_groups.add({ name: "Outros" });

    const subgroups = [
      "Cervejas",
      "Vinhos",
      "Cachaças",
      "Água",
      "Refri",
      "Suco"
    ];

    await db.product_subgroups.bulkAdd(
      subgroups.map((name) => ({ name, groupId: bebidasId }))
    );
  });

  await db.transaction("rw", db.products, db.product_groups, db.product_subgroups, async () => {
    const productsCount = await db.products.count();
    if (productsCount > 0) return;

    const groups = await db.product_groups.toArray();
    const subgroups = await db.product_subgroups.toArray();

    const groupByName = (name: string) => groups.find((g) => g.name === name)?.id ?? 0;
    const subgroupByName = (name: string) => subgroups.find((s) => s.name === name)?.id ?? null;

    const bebidasId = groupByName("Bebidas");
    const docesId = groupByName("Doces");
    const snacksId = groupByName("Snacks");
    const outrosId = groupByName("Outros");

    const seedProducts = [
      { name: "Cerveja Lata", groupId: bebidasId, subgroupId: subgroupByName("Cervejas"), unitPrice: 6.5 },
      { name: "Cerveja Long Neck", groupId: bebidasId, subgroupId: subgroupByName("Cervejas"), unitPrice: 9.5 },
      { name: "Refrigerante Lata", groupId: bebidasId, subgroupId: subgroupByName("Refri"), unitPrice: 5.5 },
      { name: "Água sem gás", groupId: bebidasId, subgroupId: subgroupByName("Água"), unitPrice: 4.0 },
      { name: "Suco Natural", groupId: bebidasId, subgroupId: subgroupByName("Suco"), unitPrice: 8.0 },
      { name: "Cachaça Dose", groupId: bebidasId, subgroupId: subgroupByName("Cachaças"), unitPrice: 7.0 },
      { name: "Chocolate", groupId: docesId, subgroupId: null, unitPrice: 4.5 },
      { name: "Paçoca", groupId: docesId, subgroupId: null, unitPrice: 3.0 },
      { name: "Batata Chips", groupId: snacksId, subgroupId: null, unitPrice: 7.5 },
      { name: "Amendoim", groupId: snacksId, subgroupId: null, unitPrice: 4.0 },
      { name: "Salgadinho", groupId: snacksId, subgroupId: null, unitPrice: 6.0 },
      { name: "Gelo (saco)", groupId: outrosId, subgroupId: null, unitPrice: 5.0 }
    ];

    await db.products.bulkAdd(
      seedProducts.map((product) => ({
        ...product,
        sellsFractioned: false,
        active: true
      }))
    );
  });
}
