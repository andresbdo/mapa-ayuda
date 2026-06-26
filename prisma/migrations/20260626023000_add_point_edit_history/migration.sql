CREATE TABLE "PointEditHistory" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "editorIp" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEditHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PointEditHistory_pointId_idx" ON "PointEditHistory"("pointId");

CREATE INDEX "PointEditHistory_createdAt_idx" ON "PointEditHistory"("createdAt");

ALTER TABLE "PointEditHistory" ADD CONSTRAINT "PointEditHistory_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EditIpBlacklist" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditIpBlacklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EditIpBlacklist_ip_key" ON "EditIpBlacklist"("ip");
