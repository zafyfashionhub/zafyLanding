// const { PrismaClient } = require('@prisma/client');
// const fs = require('fs');

// const prisma = new PrismaClient();

// const JSON_FILE = 'B:/DREAM_COMPANY/products_backup(FINAL ALL 49729).json';

// async function main() {
//   console.log('🚀 Starting fresh product seeding...\n');

//   // Step 1: Clear old products (to avoid slug conflicts)
//   await prisma.orderItem.deleteMany({});
//   await prisma.cartItem.deleteMany({});
//   await prisma.order.deleteMany({});
//   await prisma.product.deleteMany({});

//   console.log('🗑️  Old products cleared.');

//   const productsData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

//   let success = 0;
//   let failed = 0;

//   for (const p of productsData) {
//     try {
//       // Make slug 100% unique by adding ID
//       const uniqueSlug = `${p.slug}-${p.id}`;

//       await prisma.product.create({
//         data: {
//           id: BigInt(p.id),
//           title: p.title,
//           slug: uniqueSlug,
//           handle: p.handle,
//           price: p.price,
//           compareAtPrice: p.compareAtPrice || null,
//           discountPercentage: p.discountPercentage || 0,
//           stockQuantity: p.stockQuantity || 0,
//           category: p.category,
//           subCategory: p.subCategory || null,
//           size: p.size || null,
//           color: p.color || null,
//           description: p.description || null,
//           images: p.images || [],
//           tags: p.tags || [],
//           status: p.status || "Out of Stock",
//           vendor: p.vendor || null,
//           isFeatured: p.isFeatured || false,
//           isNewArrival: p.isNewArrival || false,
//           weightGrams: p.weightGrams || 200,
//         },
//       });

//       success++;
//       if (success % 50 === 0) {
//         console.log(`✅ Seeded ${success} products...`);
//       }
//     } catch (err) {
//       console.log(`❌ Failed: ${p.title} (ID: ${p.id}) → ${err.message}`);
//       failed++;
//     }
//   }

//   console.log('\n🎉 Seeding Completed!');
//   console.log(`✅ Successfully seeded: ${success} products`);
//   console.log(`❌ Failed: ${failed} products`);
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seeding error:", e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });


const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const JSON_FILE =
  'B:/DREAM_COMPANY/products_backup(FINAL ALL 49729).json';

// 🔥 BIG batches = MUCH faster
const BATCH_SIZE = 2000;

async function main() {

  console.log('\n🚀 FAST PRODUCT IMPORT STARTED...\n');

  // ─────────────────────────────────────
  // CLEAR OLD DATA
  // ─────────────────────────────────────

  console.log('🗑️ Clearing old data...\n');

  await prisma.orderItem.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('✅ Old data cleared.\n');

  // ─────────────────────────────────────
  // LOAD JSON
  // ─────────────────────────────────────

  console.log('📦 Reading JSON file...\n');

  const raw = fs.readFileSync(
    JSON_FILE,
    'utf-8'
  );

  const productsData = JSON.parse(raw);

  console.log(
    `📊 Total products: ${productsData.length}\n`
  );

  // ─────────────────────────────────────
  // IMPORT IN BATCHES
  // ─────────────────────────────────────

  const totalBatches = Math.ceil(
    productsData.length / BATCH_SIZE
  );

  let inserted = 0;

  const start = Date.now();

  for (
    let i = 0;
    i < productsData.length;
    i += BATCH_SIZE
  ) {

    const batch = productsData
      .slice(i, i + BATCH_SIZE)
      .map((p) => ({

        id: BigInt(p.id),

        title: p.title,

        // keep unique
        slug: `${p.slug}-${p.id}`,

        handle: `${p.handle}-${p.id}`,

        price: Number(p.price),

        compareAtPrice:
          p.compareAtPrice
            ? Number(p.compareAtPrice)
            : null,

        discountPercentage:
          Number(p.discountPercentage || 0),

        stockQuantity:
          Number(p.stockQuantity || 0),

        category:
          p.category || 'General',

        subCategory:
          p.subCategory || null,

        size:
          p.size || null,

        color:
          p.color || null,

        description:
          p.description || null,

        images:
          Array.isArray(p.images)
            ? p.images
            : [],

        tags:
          Array.isArray(p.tags)
            ? p.tags
            : [],

        variants:
          p.variants || null,

        status:
          p.status || 'Out of Stock',

        vendor:
          p.vendor || null,

        isFeatured:
          Boolean(p.isFeatured),

        isNewArrival:
          Boolean(p.isNewArrival),

        averageRating:
          Number(p.averageRating || 0),

        reviewCount:
          Number(p.reviewCount || 0),

        weightGrams:
          Number(p.weightGrams || 200),

        createdAt:
          p.createdAt
            ? new Date(p.createdAt)
            : new Date(),

        updatedAt:
          p.updatedAt
            ? new Date(p.updatedAt)
            : new Date(),
      }));

    // 🚀 ONE query for thousands of rows
    await prisma.product.createMany({
      data: batch,

      skipDuplicates: true,
    });

    inserted += batch.length;

    console.log(
      `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1
      }/${totalBatches} imported | Total: ${inserted}`
    );
  }

  const end = Date.now();

  console.log('\n🎉 IMPORT FINISHED!\n');

  console.log(`✅ Total Imported: ${inserted}`);

  console.log(
    `⏱️ Time Taken: ${(
      (end - start) /
      1000
    ).toFixed(2)} seconds`
  );
}

main()
  .catch((e) => {
    console.error('\n❌ IMPORT ERROR:\n', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });