/**
 * Small, deterministic development seed. Idempotent: existing rows are left untouched, so it can
 * be re-run safely. Fixed UUIDv7 ids make the seeded products easy to reference in docs and demos.
 * The large performance dataset is a separate generator (Week 3).
 */
import { createPrismaClient } from '../src/client.js';

interface SeedProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly priceCents: number;
  readonly stock: number;
}

const PRODUCTS: readonly SeedProduct[] = [
  {
    id: '0199d1e2-7b3a-7000-8000-000000000001',
    sku: 'SNEAKER-RED-42',
    name: 'Limited Edition Sneaker',
    priceCents: 12_999,
    stock: 100,
  },
  {
    id: '0199d1e2-7b3a-7000-8000-000000000002',
    sku: 'HOODIE-BLK-M',
    name: 'Launch Hoodie',
    priceCents: 5_999,
    stock: 250,
  },
  {
    id: '0199d1e2-7b3a-7000-8000-000000000003',
    sku: 'CAP-WHT-OS',
    name: 'Flash Sale Cap',
    priceCents: 1_999,
    stock: 10,
  },
  {
    id: '0199d1e2-7b3a-7000-8000-000000000004',
    sku: 'CONSOLE-PRO-1TB',
    name: 'Game Console Pro',
    priceCents: 49_999,
    stock: 5,
  },
  {
    id: '0199d1e2-7b3a-7000-8000-000000000005',
    sku: 'MUG-LOGO',
    name: 'Logo Mug',
    priceCents: 1_299,
    stock: 0,
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
  }
  const prisma = createPrismaClient({ connectionString, maxConnections: 2 });

  try {
    for (const product of PRODUCTS) {
      await prisma.$transaction(async (tx) => {
        await tx.product.upsert({
          where: { id: product.id },
          update: {},
          create: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            priceCents: product.priceCents,
            currency: 'USD',
          },
        });
        await tx.inventory.upsert({
          where: { productId: product.id },
          update: {},
          create: {
            productId: product.id,
            totalQuantity: product.stock,
            availableQuantity: product.stock,
          },
        });
      });
    }
    console.log(`Seeded ${PRODUCTS.length} products.`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
