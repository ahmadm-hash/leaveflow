import { prisma } from "../lib/prisma";

export const bootstrapSiteSupervisors = async (): Promise<void> => {
  // Create junction table if it was not migrated yet in the target environment.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "site_supervisors" (
      "id" TEXT NOT NULL,
      "siteId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "site_supervisors_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "site_supervisors_siteId_userId_key" ON "site_supervisors"("siteId", "userId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "site_supervisors_siteId_idx" ON "site_supervisors"("siteId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "site_supervisors_userId_idx" ON "site_supervisors"("userId")`
  );

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'site_supervisors_siteId_fkey'
      ) THEN
        ALTER TABLE "site_supervisors"
        ADD CONSTRAINT "site_supervisors_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'site_supervisors_userId_fkey'
      ) THEN
        ALTER TABLE "site_supervisors"
        ADD CONSTRAINT "site_supervisors_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  const supervisorIdColumn = (await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'sites'
        AND column_name = 'supervisorId'
    ) AS "exists"
  `))[0];

  // Backfill old one-to-one assignments into the junction table if legacy column still exists.
  if (supervisorIdColumn?.exists) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "site_supervisors" ("id", "siteId", "userId", "createdAt")
      SELECT
        ('ss_' || substring(md5(random()::text || clock_timestamp()::text || s."id") from 1 for 24)) AS "id",
        s."id" AS "siteId",
        s."supervisorId" AS "userId",
        CURRENT_TIMESTAMP AS "createdAt"
      FROM "sites" s
      WHERE s."supervisorId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "site_supervisors" ss
        WHERE ss."siteId" = s."id"
          AND ss."userId" = s."supervisorId"
      )
    `);
  }
};
