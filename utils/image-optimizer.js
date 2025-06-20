/**
 * Image Optimization Utility for Knockoff Kitchen
 * 
 * This script handles:
 * 1. WebP conversion
 * 2. Image compression
 * 3. Responsive image generation
 * 4. Placeholder generation
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const config = {
  inputDir: path.join(__dirname, '../public/images'),
  outputDir: path.join(__dirname, '../public/images/optimized'),
  placeholderDir: path.join(__dirname, '../public/images/placeholders'),
  webpQuality: 80,
  jpegQuality: 85,
  pngQuality: 85,
  sizes: [320, 640, 1024, 1600], // Responsive image sizes
  placeholderSize: 20 // Super small size for placeholders
};

// Ensure directories exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// Process a single image
async function processImage(imagePath) {
  const filename = path.basename(imagePath);
  const fileExt = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, fileExt);
  
  console.log(`Processing: ${filename}`);

  // Skip if already processed
  if (filename.includes('-optimized') || filename.includes('-placeholder')) {
    console.log(`Skipping already processed image: ${filename}`);
    return;
  }

  try {
    // Load the image with sharp
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Create WebP version
    const webpOutputPath = path.join(config.outputDir, `${baseName}.webp`);
    await image
      .webp({ quality: config.webpQuality })
      .toFile(webpOutputPath);
    console.log(`Created WebP: ${webpOutputPath}`);

    // Create optimized original format version
    const optimizedOutputPath = path.join(config.outputDir, `${baseName}-optimized${fileExt}`);
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
      await image
        .jpeg({ quality: config.jpegQuality, progressive: true })
        .toFile(optimizedOutputPath);
    } else if (fileExt === '.png') {
      await image
        .png({ quality: config.pngQuality, compressionLevel: 9 })
        .toFile(optimizedOutputPath);
    }
    console.log(`Created optimized original: ${optimizedOutputPath}`);

    // Create responsive versions
    for (const size of config.sizes) {
      // Skip sizes larger than original
      if (size > metadata.width) continue;
      
      const responsiveWebpPath = path.join(config.outputDir, `${baseName}-${size}.webp`);
      await image
        .resize(size)
        .webp({ quality: config.webpQuality })
        .toFile(responsiveWebpPath);
      console.log(`Created responsive WebP (${size}px): ${responsiveWebpPath}`);
      
      const responsiveOriginalPath = path.join(config.outputDir, `${baseName}-${size}${fileExt}`);
      if (fileExt === '.jpg' || fileExt === '.jpeg') {
        await image
          .resize(size)
          .jpeg({ quality: config.jpegQuality, progressive: true })
          .toFile(responsiveOriginalPath);
      } else if (fileExt === '.png') {
        await image
          .resize(size)
          .png({ quality: config.pngQuality, compressionLevel: 9 })
          .toFile(responsiveOriginalPath);
      }
      console.log(`Created responsive original (${size}px): ${responsiveOriginalPath}`);
    }

    // Create tiny placeholder for lazy loading
    const placeholderPath = path.join(config.placeholderDir, `${baseName}-placeholder.webp`);
    await image
      .resize(config.placeholderSize)
      .blur(3)
      .webp({ quality: 20 })
      .toFile(placeholderPath);
    console.log(`Created placeholder: ${placeholderPath}`);

  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
  }
}

// Process all images in a directory
async function processDirectory(directory) {
  try {
    const entries = await readdir(directory);
    
    for (const entry of entries) {
      const entryPath = path.join(directory, entry);
      const entryStat = await stat(entryPath);
      
      if (entryStat.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(entryPath);
      } else if (isImageFile(entry)) {
        // Process image files
        await processImage(entryPath);
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${directory}:`, err);
  }
}

// Check if file is an image
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
}

// Main function
async function optimizeImages() {
  console.log('Starting image optimization...');
  
  // Create output directories if they don't exist
  ensureDirectoryExists(config.outputDir);
  ensureDirectoryExists(config.placeholderDir);
  
  // Process all images
  await processDirectory(config.inputDir);
  
  console.log('Image optimization complete!');
}

// Run the optimization if script is executed directly
if (require.main === module) {
  optimizeImages().catch(err => {
    console.error('Image optimization failed:', err);
    process.exit(1);
  });
}

module.exports = { optimizeImages };
