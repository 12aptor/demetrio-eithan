import fs from "fs";
import path from "path";
import sharp from "sharp";

const FOTOS_DIR = path.join(import.meta.dir, "fotos");
const THUMBNAILS_DIR = path.join(FOTOS_DIR, "thumbnails");

// Supported image extensions
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff"]);

async function generateThumbnails() {
    console.log("🔍 Scanning photos directory...");

    // Create thumbnails directory if it doesn't exist
    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
        console.log(`📁 Created thumbnails directory at: ${THUMBNAILS_DIR}`);
    }

    try {
        const files = fs.readdirSync(FOTOS_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return SUPPORTED_EXTENSIONS.has(ext);
        });

        console.log(`📸 Found ${imageFiles.length} images to check.`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const file of imageFiles) {
            const originalPath = path.join(FOTOS_DIR, file);
            const thumbnailPath = path.join(THUMBNAILS_DIR, file);

            // Skip if thumbnail already exists
            if (fs.existsSync(thumbnailPath)) {
                skippedCount++;
                continue;
            }

            console.log(`⚡ Generating thumbnail for: ${file}`);
            await sharp(originalPath)
                .resize({
                    width: 300, // Maximum width of 300px, keeping aspect ratio
                    withoutEnlargement: true // Don't scale up if original is smaller
                })
                .toFile(thumbnailPath);

            createdCount++;
        }

        console.log("\n✅ Thumbnail generation complete!");
        console.log(`   - Created: ${createdCount}`);
        console.log(`   - Skipped (already exist): ${skippedCount}`);

    } catch (error) {
        console.error("❌ Error generating thumbnails:", error);
    }
}

generateThumbnails();
