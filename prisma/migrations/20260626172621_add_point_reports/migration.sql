-- CreateTable
CREATE TABLE "PointReport" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointReport_pointId_idx" ON "PointReport"("pointId");

-- CreateIndex
CREATE INDEX "PointReport_createdAt_idx" ON "PointReport"("createdAt");

-- AddForeignKey
ALTER TABLE "PointReport" ADD CONSTRAINT "PointReport_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
