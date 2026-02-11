-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
