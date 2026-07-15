-- Prevent two concurrent "publish new pricing" actions from ever leaving two PriceList rows
-- active for the same code. This can't be expressed as a plain @@unique in schema.prisma
-- (partial/WHERE-clause unique indexes aren't part of the Prisma schema DSL), so it's added
-- here directly. Without this, a concurrent publish race can produce two active price lists
-- for the same code, and resolveLineItemPricing()'s `findFirst` (no orderBy) would then pick
-- between them non-deterministically -- two customers quoted minutes apart on the same SKU
-- could silently get different prices.
CREATE UNIQUE INDEX "PriceList_one_active_per_code" ON "PriceList" ("code") WHERE "isActive" = true;
