ALTER TABLE "subscription_invitations"
  ADD COLUMN "archivedByUserId" TEXT,
  ADD COLUMN "statusBeforeArchive" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByUserId" TEXT;

CREATE INDEX "subscription_invitations_archivedAt_idx"
  ON "subscription_invitations"("archivedAt");

CREATE INDEX "subscription_invitations_deletedAt_idx"
  ON "subscription_invitations"("deletedAt");
