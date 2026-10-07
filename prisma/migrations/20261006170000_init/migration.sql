-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "rnbId" TEXT,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "climateZone" TEXT NOT NULL,
    "surfaceTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EFA" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "siret" TEXT,
    "role" TEXT NOT NULL,

    CONSTRAINT "EFA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfaceLine" (
    "id" TEXT NOT NULL,
    "efaId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "subCategoryCode" TEXT NOT NULL,
    "surfaceM2" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SurfaceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumption" (
    "id" TEXT NOT NULL,
    "efaId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "energyType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionMonth" (
    "id" TEXT NOT NULL,
    "consumptionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "kwh" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "validated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConsumptionMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceData" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "ReferenceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateZone" (
    "id" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zone" TEXT NOT NULL,

    CONSTRAINT "ClimateZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DjYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "climateZone" TEXT NOT NULL,
    "dju" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DjYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BuildingToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BuildingToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Building_rnbId_key" ON "Building"("rnbId");

-- CreateIndex
CREATE UNIQUE INDEX "Consumption_efaId_year_energyType_key" ON "Consumption"("efaId", "year", "energyType");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumptionMonth_consumptionId_year_month_key" ON "ConsumptionMonth"("consumptionId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceData_type_code_key" ON "ReferenceData"("type", "code");

-- CreateIndex
CREATE INDEX "ClimateZone_postcode_idx" ON "ClimateZone"("postcode");

-- CreateIndex
CREATE UNIQUE INDEX "DjYear_year_climateZone_key" ON "DjYear"("year", "climateZone");

-- CreateIndex
CREATE INDEX "_BuildingToUser_B_index" ON "_BuildingToUser"("B");

-- AddForeignKey
ALTER TABLE "EFA" ADD CONSTRAINT "EFA_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurfaceLine" ADD CONSTRAINT "SurfaceLine_efaId_fkey" FOREIGN KEY ("efaId") REFERENCES "EFA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumption" ADD CONSTRAINT "Consumption_efaId_fkey" FOREIGN KEY ("efaId") REFERENCES "EFA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionMonth" ADD CONSTRAINT "ConsumptionMonth_consumptionId_fkey" FOREIGN KEY ("consumptionId") REFERENCES "Consumption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BuildingToUser" ADD CONSTRAINT "_BuildingToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BuildingToUser" ADD CONSTRAINT "_BuildingToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
