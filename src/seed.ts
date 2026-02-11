import { db, type SaleItem } from "./db";

export async function seedIfEmpty(): Promise<void> {
  const count = await db.product_groups.count();
  const hasProducts = await db.products.count();
  const hasCustomers = await db.customers.count();
  const hasComandas = await db.comandas.count();
  const seedGroups = [
    { id: 1, name: "Bebidas" },
    { id: 2, name: "Doces" },
    { id: 3, name: "Snacks" },
    { id: 4, name: "Outros" }
  ];

  const seedSubgroups = [
    { id: 101, groupId: 1, name: "Cervejas" },
    { id: 102, groupId: 1, name: "Vinhos" },
    { id: 103, groupId: 1, name: "Cachaças" },
    { id: 104, groupId: 1, name: "Água" },
    { id: 105, groupId: 1, name: "Refri" },
    { id: 106, groupId: 1, name: "Suco" }
  ];

  const seedProducts = [
    { externalId: "WTR-500", name: "Água mineral 500ml", groupId: 1, subgroupId: 104, unitPrice: 2.5, sellsFractioned: false, active: true },
    { externalId: "WTR-1500", name: "Água mineral 1,5L", groupId: 1, subgroupId: 104, unitPrice: 5.0, sellsFractioned: false, active: true },
    { externalId: "WTR-500-SP", name: "Água com gás 500ml", groupId: 1, subgroupId: 104, unitPrice: 3.5, sellsFractioned: false, active: true },
    { externalId: "COKE-350", name: "Coca-Cola lata 350ml", groupId: 1, subgroupId: 105, unitPrice: 5.0, sellsFractioned: false, active: true },
    { externalId: "GUA-350", name: "Guaraná lata 350ml", groupId: 1, subgroupId: 105, unitPrice: 4.5, sellsFractioned: false, active: true },
    { externalId: "FAN-350", name: "Fanta lata 350ml", groupId: 1, subgroupId: 105, unitPrice: 4.5, sellsFractioned: false, active: true },
    { externalId: "REF-600", name: "Refrigerante 600ml (retornável)", groupId: 1, subgroupId: 105, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "REF-2L", name: "Refrigerante 2L", groupId: 1, subgroupId: 105, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "SUC-200", name: "Suco caixinha 200ml", groupId: 1, subgroupId: 106, unitPrice: 3.5, sellsFractioned: false, active: true },
    { externalId: "SUC-1L", name: "Suco garrafa 1L", groupId: 1, subgroupId: 106, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "SUC-NAT-LAR", name: "Suco natural copo (laranja)", groupId: 1, subgroupId: 106, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "SUC-NAT-LIM", name: "Suco natural copo (limão)", groupId: 1, subgroupId: 106, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "ENE-250", name: "Energético lata 250ml (genérico)", groupId: 1, subgroupId: 105, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "ISO-500", name: "Isotônico 500ml", groupId: 1, subgroupId: 105, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "BEER-350", name: "Cerveja lata 350ml (pilsen)", groupId: 1, subgroupId: 101, unitPrice: 5.5, sellsFractioned: false, active: true },
    { externalId: "BEER-LN-330", name: "Cerveja long neck 330ml", groupId: 1, subgroupId: 101, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "BEER-600", name: "Cerveja 600ml", groupId: 1, subgroupId: 101, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "BEER-473", name: "Cerveja lata 473ml", groupId: 1, subgroupId: 101, unitPrice: 8.5, sellsFractioned: false, active: true },
    { externalId: "BEER-NA", name: "Cerveja sem álcool (lata)", groupId: 1, subgroupId: 101, unitPrice: 7.5, sellsFractioned: false, active: true },
    { externalId: "CHOPP-300", name: "Chopp 300ml", groupId: 1, subgroupId: 101, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "CHOPP-500", name: "Chopp 500ml", groupId: 1, subgroupId: 101, unitPrice: 15.0, sellsFractioned: false, active: true },
    { externalId: "VINHO-TACA", name: "Vinho de mesa (taça)", groupId: 1, subgroupId: 102, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "VINHO-SUAVE-750", name: "Vinho suave garrafa (750ml)", groupId: 1, subgroupId: 102, unitPrice: 28.0, sellsFractioned: false, active: true },
    { externalId: "VINHO-SECO-750", name: "Vinho seco garrafa (750ml)", groupId: 1, subgroupId: 102, unitPrice: 35.0, sellsFractioned: false, active: true },
    { externalId: "SANGRIA-COPO", name: "Sangria (copo)", groupId: 1, subgroupId: 102, unitPrice: 14.0, sellsFractioned: false, active: true },
    { externalId: "CACH-DOSE", name: "Cachaça dose", groupId: 1, subgroupId: 103, unitPrice: 4.0, sellsFractioned: true, active: true },
    { externalId: "CACH-DOSE-ART", name: "Cachaça dose (artesanal)", groupId: 1, subgroupId: 103, unitPrice: 6.0, sellsFractioned: true, active: true },
    { externalId: "CACH-1L", name: "Cachaça garrafa 1L", groupId: 1, subgroupId: 103, unitPrice: 20.0, sellsFractioned: false, active: true },
    { externalId: "VOD-DOSE", name: "Vodka dose", groupId: 1, subgroupId: 103, unitPrice: 8.0, sellsFractioned: true, active: true },
    { externalId: "VOD-900", name: "Vodka garrafa 900ml", groupId: 1, subgroupId: 103, unitPrice: 45.0, sellsFractioned: false, active: true },
    { externalId: "CONH-DOSE", name: "Conhaque dose", groupId: 1, subgroupId: 103, unitPrice: 8.0, sellsFractioned: true, active: true },
    { externalId: "RUM-DOSE", name: "Rum dose", groupId: 1, subgroupId: 103, unitPrice: 10.0, sellsFractioned: true, active: true },
    { externalId: "WHISKY-DOSE", name: "Whisky dose (básico)", groupId: 1, subgroupId: 103, unitPrice: 14.0, sellsFractioned: true, active: true },
    { externalId: "CAIPI-LIM", name: "Caipirinha (limão)", groupId: 1, subgroupId: 103, unitPrice: 14.0, sellsFractioned: false, active: true },
    { externalId: "CAIPI-MAR", name: "Caipirinha (maracujá)", groupId: 1, subgroupId: 103, unitPrice: 16.0, sellsFractioned: false, active: true },
    { externalId: "CAIPIVODKA-LIM", name: "Caipivodka (limão)", groupId: 1, subgroupId: 103, unitPrice: 18.0, sellsFractioned: false, active: true },
    { externalId: "CUBA-RUM", name: "Cuba (rum + refri)", groupId: 1, subgroupId: 103, unitPrice: 18.0, sellsFractioned: false, active: true },
    { externalId: "BALA-UN", name: "Bala unidade", groupId: 2, subgroupId: null, unitPrice: 0.1, sellsFractioned: true, active: true },
    { externalId: "BALA-PCT", name: "Bala (pacotinho)", groupId: 2, subgroupId: null, unitPrice: 2.0, sellsFractioned: false, active: true },
    { externalId: "CHIC-UN", name: "Chiclete unidade", groupId: 2, subgroupId: null, unitPrice: 0.25, sellsFractioned: true, active: true },
    { externalId: "CHIC-CART", name: "Chiclete (cartela)", groupId: 2, subgroupId: null, unitPrice: 2.5, sellsFractioned: false, active: true },
    { externalId: "PIRULITO", name: "Pirulito", groupId: 2, subgroupId: null, unitPrice: 0.5, sellsFractioned: true, active: true },
    { externalId: "PACOCA", name: "Paçoca", groupId: 2, subgroupId: null, unitPrice: 1.5, sellsFractioned: false, active: true },
    { externalId: "PE-DE-MOLEQUE", name: "Pé-de-moleque", groupId: 2, subgroupId: null, unitPrice: 1.5, sellsFractioned: false, active: true },
    { externalId: "DOCE-LEITE", name: "Doce de leite (barra)", groupId: 2, subgroupId: null, unitPrice: 3.0, sellsFractioned: false, active: true },
    { externalId: "CHOC-PQ", name: "Chocolate pequeno", groupId: 2, subgroupId: null, unitPrice: 4.0, sellsFractioned: false, active: true },
    { externalId: "CHOC-GR", name: "Chocolate grande", groupId: 2, subgroupId: null, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "BISC-RECH", name: "Biscoito recheado", groupId: 2, subgroupId: null, unitPrice: 3.5, sellsFractioned: false, active: true },
    { externalId: "BISC-SIMP", name: "Biscoito simples (água e sal)", groupId: 2, subgroupId: null, unitPrice: 3.0, sellsFractioned: false, active: true },
    { externalId: "BOLO-FATIA", name: "Bolo fatia", groupId: 2, subgroupId: null, unitPrice: 6.0, sellsFractioned: false, active: true },
    { externalId: "PUDIM", name: "Pudim (fatia)", groupId: 2, subgroupId: null, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "SORV-PICO", name: "Sorvete picolé", groupId: 2, subgroupId: null, unitPrice: 5.0, sellsFractioned: false, active: true },
    { externalId: "SORV-POTE", name: "Sorvete pote pequeno", groupId: 2, subgroupId: null, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "AMENDOIM-PQ", name: "Amendoim (pacote pequeno)", groupId: 3, subgroupId: null, unitPrice: 2.0, sellsFractioned: false, active: true },
    { externalId: "AMENDOIM-POR", name: "Amendoim (porção)", groupId: 3, subgroupId: null, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "TORRADA-POR", name: "Torrada/petisco (porção)", groupId: 3, subgroupId: null, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "BAT-CHIPS", name: "Batata chips", groupId: 3, subgroupId: null, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "SALG-PCT", name: "Salgadinho (pacote)", groupId: 3, subgroupId: null, unitPrice: 6.0, sellsFractioned: false, active: true },
    { externalId: "PIPOCA-PCT", name: "Pipoca (pacote)", groupId: 3, subgroupId: null, unitPrice: 4.0, sellsFractioned: false, active: true },
    { externalId: "BISC-SALG", name: "Biscoito salgado (pacote)", groupId: 3, subgroupId: null, unitPrice: 4.0, sellsFractioned: false, active: true },
    { externalId: "CASTANHA-POR", name: "Castanha/caju (porção)", groupId: 3, subgroupId: null, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "AZEITONA-POR", name: "Azeitona (porção)", groupId: 3, subgroupId: null, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "OVINHO-POR", name: "Ovinho de codorna (porção)", groupId: 3, subgroupId: null, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "TORRESMO-POR", name: "Torresmo (porção)", groupId: 3, subgroupId: null, unitPrice: 18.0, sellsFractioned: false, active: true },
    { externalId: "BAT-FRITA", name: "Batata frita (porção)", groupId: 3, subgroupId: null, unitPrice: 20.0, sellsFractioned: false, active: true },
    { externalId: "FRANGO-POR", name: "Frango a passarinho (porção)", groupId: 3, subgroupId: null, unitPrice: 28.0, sellsFractioned: false, active: true },
    { externalId: "CALAB-POR", name: "Calabresa acebolada (porção)", groupId: 3, subgroupId: null, unitPrice: 22.0, sellsFractioned: false, active: true },
    { externalId: "LING-POR", name: "Linguiça (porção)", groupId: 3, subgroupId: null, unitPrice: 22.0, sellsFractioned: false, active: true },
    { externalId: "QUEIJO-POR", name: "Queijo coalho (porção)", groupId: 3, subgroupId: null, unitPrice: 18.0, sellsFractioned: false, active: true },
    { externalId: "PEIXE-POR", name: "Isca de peixe (porção)", groupId: 3, subgroupId: null, unitPrice: 30.0, sellsFractioned: false, active: true },
    { externalId: "PASTEL-UN", name: "Pastel unidade", groupId: 3, subgroupId: null, unitPrice: 8.0, sellsFractioned: false, active: true },
    { externalId: "COXINHA-UN", name: "Coxinha unidade", groupId: 3, subgroupId: null, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "ESFIHA-UN", name: "Esfiha unidade", groupId: 3, subgroupId: null, unitPrice: 7.0, sellsFractioned: false, active: true },
    { externalId: "PAO-ALHO", name: "Pão de alho unidade", groupId: 3, subgroupId: null, unitPrice: 6.0, sellsFractioned: false, active: true },
    { externalId: "SAND-SIMP", name: "Sanduíche simples (presunto/queijo)", groupId: 3, subgroupId: null, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "MISTO", name: "Misto quente", groupId: 3, subgroupId: null, unitPrice: 14.0, sellsFractioned: false, active: true },
    { externalId: "HAMB-SIMP", name: "Hambúrguer simples", groupId: 3, subgroupId: null, unitPrice: 18.0, sellsFractioned: false, active: true },
    { externalId: "HAMB-COMP", name: "Hambúrguer completo", groupId: 3, subgroupId: null, unitPrice: 25.0, sellsFractioned: false, active: true },
    { externalId: "ESP-CARNE", name: "Espetinho (carne)", groupId: 3, subgroupId: null, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "ESP-FRANGO", name: "Espetinho (frango)", groupId: 3, subgroupId: null, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "ESP-LING", name: "Espetinho (linguiça)", groupId: 3, subgroupId: null, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "ESP-COR", name: "Espetinho (coração)", groupId: 3, subgroupId: null, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "CIG-MACO", name: "Cigarro maço (popular)", groupId: 4, subgroupId: null, unitPrice: 12.0, sellsFractioned: false, active: true },
    { externalId: "CIG-UN", name: "Cigarro unidade (avulso)", groupId: 4, subgroupId: null, unitPrice: 1.0, sellsFractioned: true, active: true },
    { externalId: "ISQ-DESC", name: "Isqueiro descartável", groupId: 4, subgroupId: null, unitPrice: 4.0, sellsFractioned: false, active: true },
    { externalId: "FOSFORO", name: "Fósforo (caixinha)", groupId: 4, subgroupId: null, unitPrice: 2.0, sellsFractioned: false, active: true },
    { externalId: "GELO-PQ", name: "Gelo (saco pequeno)", groupId: 4, subgroupId: null, unitPrice: 6.0, sellsFractioned: false, active: true },
    { externalId: "GELO-GR", name: "Gelo (saco grande)", groupId: 4, subgroupId: null, unitPrice: 10.0, sellsFractioned: false, active: true },
    { externalId: "CARVAO", name: "Carvão (pacote)", groupId: 4, subgroupId: null, unitPrice: 20.0, sellsFractioned: false, active: true },
    { externalId: "COPINHO", name: "Copinho descartável (unid.)", groupId: 4, subgroupId: null, unitPrice: 0.2, sellsFractioned: true, active: true },
    { externalId: "GUARDANAPO", name: "Guardanapo (pacotinho)", groupId: 4, subgroupId: null, unitPrice: 2.5, sellsFractioned: false, active: true },
    { externalId: "SALG-GRANEL", name: "Salgadinho a granel (saquinho)", groupId: 4, subgroupId: null, unitPrice: 3.0, sellsFractioned: false, active: true },
    { externalId: "PICOLE", name: "Picolé (freezer, genérico)", groupId: 4, subgroupId: null, unitPrice: 5.0, sellsFractioned: false, active: true },
    { externalId: "CARREG-CEL", name: "Carregamento de celular (serviço)", groupId: 4, subgroupId: null, unitPrice: 3.0, sellsFractioned: false, active: true },
    { externalId: "BANHEIRO", name: "Uso de banheiro (quando cobrado)", groupId: 4, subgroupId: null, unitPrice: 2.0, sellsFractioned: false, active: true },
    { externalId: "PIP-500", name: "Água tônica 350ml", groupId: 1, subgroupId: 105, unitPrice: 6.0, sellsFractioned: false, active: true },
    { externalId: "MAT-300", name: "Mate gelado 300ml", groupId: 1, subgroupId: 106, unitPrice: 6.5, sellsFractioned: false, active: true },
    { externalId: "CHOPP-IPA", name: "Chopp IPA 300ml", groupId: 1, subgroupId: 101, unitPrice: 13.0, sellsFractioned: false, active: true },
    { externalId: "GIN-TON", name: "Gin tônica (copo)", groupId: 1, subgroupId: 103, unitPrice: 22.0, sellsFractioned: false, active: true },
    { externalId: "MOSC-MULE", name: "Moscow mule", groupId: 1, subgroupId: 103, unitPrice: 20.0, sellsFractioned: false, active: true },
    { externalId: "ESP-QUEIJO", name: "Espetinho (queijo)", groupId: 3, subgroupId: null, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "ESP-PANC", name: "Espetinho (panceta)", groupId: 3, subgroupId: null, unitPrice: 11.0, sellsFractioned: false, active: true },
    { externalId: "PASTEL-QUEIJO", name: "Pastel de queijo", groupId: 3, subgroupId: null, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "PASTEL-CARNE", name: "Pastel de carne", groupId: 3, subgroupId: null, unitPrice: 9.0, sellsFractioned: false, active: true },
    { externalId: "TRUFAS", name: "Trufa unidade", groupId: 2, subgroupId: null, unitPrice: 3.5, sellsFractioned: true, active: true },
    { externalId: "BROWNIE", name: "Brownie (fatia)", groupId: 2, subgroupId: null, unitPrice: 7.5, sellsFractioned: false, active: true }
  ];

  const seedCustomers = [
    { name: "Vagner L.", phone: "(11) 98888-1111", notes: "Cliente recorrente", favorite: true }
  ];

  const rankingCategories = [
    {
      name: "Cervejas",
      products: [
        { name: "Skol lata 350ml", estimatedPrice: 5.5 },
        { name: "Brahma lata 350ml", estimatedPrice: 5.5 },
        { name: "Antarctica lata 350ml", estimatedPrice: 5.5 },
        { name: "Itaipava lata 350ml", estimatedPrice: 5.0 },
        { name: "Heineken long neck 330ml", estimatedPrice: 8.0 }
      ]
    },
    {
      name: "Destilados",
      products: [
        { name: "Dose de cachaça comum", estimatedPrice: 4.0 },
        { name: "Conhaque Dreher dose", estimatedPrice: 8.0 },
        { name: "Vodka dose", estimatedPrice: 8.0 },
        { name: "Whisky Red Label dose", estimatedPrice: 14.0 },
        { name: "Corote sabores", estimatedPrice: 6.0 }
      ]
    },
    {
      name: "Não alcoólicos",
      products: [
        { name: "Coca-Cola lata 350ml", estimatedPrice: 5.0 },
        { name: "Guaraná lata 350ml", estimatedPrice: 4.5 },
        { name: "Água mineral 500ml", estimatedPrice: 2.5 },
        { name: "Água com gás 500ml", estimatedPrice: 3.5 },
        { name: "Suco caixinha 200ml", estimatedPrice: 3.5 }
      ]
    },
    {
      name: "Snacks salgados",
      products: [
        { name: "Amendoim porção", estimatedPrice: 8.0 },
        { name: "Batata frita porção", estimatedPrice: 20.0 },
        { name: "Calabresa acebolada", estimatedPrice: 22.0 },
        { name: "Frango a passarinho", estimatedPrice: 28.0 },
        { name: "Torresmo porção", estimatedPrice: 18.0 }
      ]
    },
    {
      name: "Salgados rápidos",
      products: [
        { name: "Pastel unidade", estimatedPrice: 8.0 },
        { name: "Coxinha unidade", estimatedPrice: 7.0 },
        { name: "Espetinho de carne", estimatedPrice: 10.0 },
        { name: "Espetinho de frango", estimatedPrice: 9.0 },
        { name: "Hambúrguer simples", estimatedPrice: 18.0 }
      ]
    },
    {
      name: "Doces de balcão",
      products: [
        { name: "Bala unidade", estimatedPrice: 0.1 },
        { name: "Chiclete unidade", estimatedPrice: 0.25 },
        { name: "Paçoca", estimatedPrice: 1.5 },
        { name: "Chocolate pequeno", estimatedPrice: 4.0 },
        { name: "Picolé", estimatedPrice: 5.0 }
      ]
    },
    {
      name: "Extras de conveniência",
      products: [
        { name: "Cigarro unidade", estimatedPrice: 1.0 },
        { name: "Cigarro maço", estimatedPrice: 12.0 },
        { name: "Isqueiro descartável", estimatedPrice: 4.0 },
        { name: "Gelo saco pequeno", estimatedPrice: 6.0 },
        { name: "Carregamento de celular", estimatedPrice: 3.0 }
      ]
    }
  ];

  const productImages = [
    {
      externalId: "REF-2L",
      imageUrl: "https://images.openfoodfacts.org/images/products/789/284/080/0000/front_pt.3.400.jpg"
    },
    {
      externalId: "SUC-1L",
      imageUrl: "https://images.openfoodfacts.org/images/products/789/896/571/6325/front_pt.3.400.jpg"
    },
    {
      externalId: "PACOCA",
      imageUrl: "https://images.openfoodfacts.org/images/products/560/074/109/7137/front_en.3.400.jpg"
    },
    {
      externalId: "DOCE-LEITE",
      imageUrl: "https://images.openfoodfacts.org/images/products/789/777/330/0245/front_pt.3.400.jpg"
    }
  ];

  await db.transaction(
    "rw",
    [db.product_groups, db.product_subgroups, db.products, db.customers, db.comandas, db.sales, db.sale_items, db.payments],
    async () => {
      const groups = await db.product_groups.toArray();
      if (groups.length === 0) {
        await db.product_groups.bulkAdd(seedGroups);
      }

    const subs = await db.product_subgroups.toArray();
    if (subs.length === 0) {
      await db.product_subgroups.bulkAdd(seedSubgroups);
    }

    const productsCount = await db.products.count();
    if (productsCount === 0) {
      await db.products.bulkAdd(seedProducts);
    }

    const groupsByName = new Map((await db.product_groups.toArray()).map((g) => [g.name, g.id ?? 0]));
    const subsByName = new Map((await db.product_subgroups.toArray()).map((s) => [s.name, s.id ?? 0]));

    const resolveGroup = (categoryName: string) => {
      if (categoryName === "Cervejas") return groupsByName.get("Bebidas") ?? 0;
      if (categoryName === "Destilados") return groupsByName.get("Bebidas") ?? 0;
      if (categoryName === "Não alcoólicos") return groupsByName.get("Bebidas") ?? 0;
      if (categoryName === "Doces de balcão") return groupsByName.get("Doces") ?? 0;
      if (categoryName === "Extras de conveniência") return groupsByName.get("Outros") ?? 0;
      return groupsByName.get("Snacks") ?? 0;
    };

    const resolveSubgroup = (categoryName: string, productName: string) => {
      if (categoryName === "Cervejas") return subsByName.get("Cervejas") ?? null;
      if (categoryName === "Destilados") return subsByName.get("Cachaças") ?? null;
      if (categoryName === "Não alcoólicos") {
        if (productName.toLowerCase().includes("suco")) return subsByName.get("Suco") ?? null;
        if (productName.toLowerCase().includes("água")) return subsByName.get("Água") ?? null;
        return subsByName.get("Refri") ?? null;
      }
      return null;
    };

    for (const category of rankingCategories) {
      for (const product of category.products) {
        const groupId = resolveGroup(category.name);
        const subgroupId = resolveSubgroup(category.name, product.name);
        const existing = await db.products.where("name").equals(product.name).first();
        if (existing?.id) {
          await db.products.update(existing.id, {
            groupId,
            subgroupId,
            unitPrice: product.estimatedPrice,
            sellsFractioned: product.name.toLowerCase().includes("dose") || product.name.toLowerCase().includes("unidade"),
            active: true,
            favorite: true,
            externalId: existing.externalId ?? `RANK-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
          });
        } else {
          await db.products.add({
            externalId: `RANK-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            name: product.name,
            groupId,
            subgroupId,
            unitPrice: product.estimatedPrice,
            sellsFractioned: product.name.toLowerCase().includes("dose") || product.name.toLowerCase().includes("unidade"),
            active: true,
            favorite: true
          });
        }
      }
    }

    for (const entry of productImages) {
      const existing = await db.products.where("externalId").equals(entry.externalId).first();
      if (existing?.id && existing.imageUrl !== entry.imageUrl) {
        await db.products.update(existing.id, { imageUrl: entry.imageUrl });
      }
    }

    const customersCount = await db.customers.count();
    if (customersCount === 0) {
      await db.customers.bulkAdd(seedCustomers);
    }

    const comandasCount = await db.comandas.count();
    if (comandasCount === 0) {
      const customers = await db.customers.toArray();
      const products = await db.products.toArray();
      const byName = new Map(products.map((p) => [p.name, p]));

      const pick = (name: string) => byName.get(name);
      const now = new Date();
      const isoMinutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

      const openComandaId = await db.comandas.add({
        customerId: customers[0]?.id ?? null,
        openedAt: isoMinutesAgo(120),
        closedAt: null,
        status: "OPEN",
        notes: "Mesa 4"
      });

      const closedComandaId = await db.comandas.add({
        customerId: customers[1]?.id ?? null,
        openedAt: isoMinutesAgo(300),
        closedAt: isoMinutesAgo(60),
        status: "CLOSED",
        notes: "Pago no PIX"
      });

      const createSale = async (comandaId: number, createdAt: string, items: { name: string; quantity: number }[]) => {
        const saleId = await db.sales.add({
          comandaId,
          createdAt,
          paymentMethod: "CASH"
        });
        const saleItems: SaleItem[] = items
          .map((item) => {
            const product = pick(item.name);
            if (!product?.id) return null;
            const unitPrice = product.unitPrice;
            return {
              saleId,
              productId: product.id,
              quantity: item.quantity,
              unitPriceAtTime: unitPrice,
              subtotal: unitPrice * item.quantity
            };
          })
          .filter((item): item is SaleItem => item !== null);
        if (saleItems.length > 0) {
          await db.sale_items.bulkAdd(saleItems);
        }
        return saleItems.reduce((sum, item) => sum + (item?.subtotal ?? 0), 0);
      };

      const openTotal = await createSale(openComandaId, isoMinutesAgo(90), [
        { name: "Cerveja lata 350ml (pilsen)", quantity: 3 },
        { name: "Pastel unidade", quantity: 2 }
      ]);
      await createSale(openComandaId, isoMinutesAgo(40), [
        { name: "Cachaça dose", quantity: 2 },
        { name: "Coca-Cola lata 350ml", quantity: 1 }
      ]);

      if (openTotal > 0) {
        await db.payments.add({
          comandaId: openComandaId,
          createdAt: isoMinutesAgo(30),
          method: "PIX",
          amount: Math.max(0, openTotal * 0.4),
          notes: "Pagamento parcial"
        });
      }

      const closedTotal = await createSale(closedComandaId, isoMinutesAgo(200), [
        { name: "Chopp 300ml", quantity: 2 },
        { name: "Calabresa acebolada (porção)", quantity: 1 }
      ]);

      if (closedTotal > 0) {
        await db.payments.add({
          comandaId: closedComandaId,
          createdAt: isoMinutesAgo(80),
          method: "CASH",
          amount: closedTotal,
          notes: "Quitado"
        });
      }
    }
  });

}
