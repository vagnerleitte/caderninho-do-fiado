# Caderninho do Boteco (v0)

PWA simples para cadastro offline de produtos e clientes usando IndexedDB.

## Rodando localmente

```bash
npm install
npm run dev
```

## O que está incluído
- PWA instalável e offline-first
- Produtos com grupos/subgrupos
- Clientes com busca por nome
- Comandas com vendas e pagamentos parciais
- Persistência local via IndexedDB (Dexie)

## O que NÃO está incluído (ainda)
- Integrações externas

## Estrutura principal
- `src/db.ts`: schema Dexie e tipos
- `src/seed.ts`: seed inicial de grupos/subgrupos
- `src/main.tsx`: roda `seedIfEmpty` antes de renderizar
- `src/App.tsx`: UI MUI + CRUD
- `vite.config.ts`: configuração do `vite-plugin-pwa`
- `public/pwa-192.png` e `public/pwa-512.png`: ícones
