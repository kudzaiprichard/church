-- Phase 0: the four offices (docs/SCOPE.md §4.1).
--
-- Hand-edited. Prisma's generated enum swap casts each row's text straight to
-- the new type, which fails on every 'ADMIN' row because APOSTLE is not a
-- spelling of ADMIN. The cast below maps it explicitly: an administrator under
-- the old two-role model had every power, and APOSTLE is the office that keeps
-- every power, so no one gains or loses access in the move.
--
-- Prisma runs each migration file in its own transaction, so a failure part
-- way through leaves the old type and column untouched.

CREATE TYPE "Role_new" AS ENUM ('APOSTLE', 'MATRON', 'ELDER', 'MEMBER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'APOSTLE'
    ELSE "role"::text
  END
)::"Role_new";

ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
