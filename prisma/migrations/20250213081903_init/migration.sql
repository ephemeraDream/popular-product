-- CreateTable
CREATE TABLE "Product_Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "images" TEXT,
    "publish" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
