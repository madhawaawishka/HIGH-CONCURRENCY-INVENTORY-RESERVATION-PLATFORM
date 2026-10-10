-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "product_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "product_id" UUID NOT NULL,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "audit_logs_aggregate_type_aggregate_id_created_at_idx" ON "audit_logs"("aggregate_type", "aggregate_id", "created_at");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -------------------------------------------------------------------------------------------
-- Hand-written: invariants that Prisma's schema language cannot express (ADR-0003).
-- The database is the last line of defense. If one of these constraints ever fires,
-- the application has a bug, because the domain model should have rejected the change first.
-- -------------------------------------------------------------------------------------------

ALTER TABLE "products"
    ADD CONSTRAINT "products_price_positive" CHECK ("price_cents" > 0),
    ADD CONSTRAINT "products_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT "products_sku_format" CHECK ("sku" ~ '^[A-Z0-9][A-Z0-9-]{2,63}$');

-- Every unit is in exactly one bucket, and no bucket can go negative.
ALTER TABLE "inventory"
    ADD CONSTRAINT "inventory_non_negative" CHECK (
        "available_quantity" >= 0
        AND "reserved_quantity" >= 0
        AND "sold_quantity" >= 0
        AND "version" >= 0
    ),
    ADD CONSTRAINT "inventory_balanced" CHECK (
        "available_quantity" + "reserved_quantity" + "sold_quantity" = "total_quantity"
    );
