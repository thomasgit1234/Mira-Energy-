-- CreateTable
CREATE TABLE "_EfaOccupants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EfaOccupants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EfaOccupants_B_index" ON "_EfaOccupants"("B");

-- AddForeignKey
ALTER TABLE "_EfaOccupants" ADD CONSTRAINT "_EfaOccupants_A_fkey" FOREIGN KEY ("A") REFERENCES "EFA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EfaOccupants" ADD CONSTRAINT "_EfaOccupants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

