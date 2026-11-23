/**
 * ── AI-Generated Image Analyzer ─────────────────────────────
 * Uses EXIF metadata inspection to detect AI-generated images.
 *
 * Detection methods:
 *   1. EXIF software field contains known AI tool signatures
 *   2. Images over 4MP with zero camera EXIF data (heuristic fallback)
 *
 * Returns: { isAiGenerated: boolean, reason: string }
 */

const exifr = require('exifr');
const fs    = require('fs');

// Known AI tool signatures found in EXIF Software/Creator fields
const AI_SIGNATURES = [
  'comfyui',
  'stable diffusion',
  'dall-e',
  'dall·e',
  'midjourney',
  'adobe firefly',
  'bing image creator',
  'novelai',
  'automatic1111',
  'invoke ai',
  'invokeai',
  'dreamstudio',
  'leonardo.ai',
  'lexica',
  'craiyon',
  'deep dream',
  'nightcafe',
  'artbreeder',
  'stability ai',
];

/**
 * Analyze an image file for AI-generation indicators
 * @param {string} filePath — absolute path to the image file
 * @returns {Promise<{isAiGenerated: boolean, reason: string}>}
 */
async function analyzeImage(filePath) {
  try {
    // Only analyze image files
    const ext = filePath.toLowerCase();
    if (!ext.match(/\.(jpg|jpeg|png|gif|webp|tiff?)$/)) {
      return { isAiGenerated: false, reason: 'Not an image file' };
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { isAiGenerated: false, reason: 'File not found' };
    }

    // Parse EXIF metadata
    let exif = null;
    try {
      exif = await exifr.parse(filePath, {
        // Request all possible metadata segments
        tiff: true,
        xmp:  true,
        icc:  true,
        iptc: true,
        jfif: true,
      });
    } catch (parseErr) {
      // Some images have no EXIF data at all
      exif = null;
    }

    // ── Method 1: Check EXIF Software / Creator fields for AI signatures ──
    if (exif) {
      const fieldsToCheck = [
        exif.Software,
        exif.Creator,
        exif.Artist,
        exif.ImageDescription,
        exif.Description,
        exif.Comment,
        exif.UserComment,
        exif.XPComment,
        exif.XPSubject,
      ].filter(Boolean).map(v => String(v).toLowerCase());

      for (const fieldValue of fieldsToCheck) {
        for (const signature of AI_SIGNATURES) {
          if (fieldValue.includes(signature)) {
            return {
              isAiGenerated: true,
              reason: `EXIF metadata contains AI tool signature: "${signature}"`,
            };
          }
        }
      }

      // Also check for the "parameters" key used by Stable Diffusion / A1111
      if (exif.parameters || exif.Parameters) {
        const params = String(exif.parameters || exif.Parameters).toLowerCase();
        if (params.includes('steps:') || params.includes('sampler:') || params.includes('cfg scale:')) {
          return {
            isAiGenerated: true,
            reason: 'EXIF contains Stable Diffusion generation parameters',
          };
        }
      }
    }

    // ── Method 2: Heuristic — high-res image with no camera data ──────────
    if (exif) {
      const width  = exif.ImageWidth  || exif.ExifImageWidth  || 0;
      const height = exif.ImageHeight || exif.ExifImageHeight || 0;
      const megapixels = (width * height) / 1_000_000;

      const hasCamera = !!(
        exif.Make ||
        exif.Model ||
        exif.LensModel ||
        exif.FocalLength ||
        exif.ExposureTime ||
        exif.FNumber ||
        exif.ISO ||
        exif.ISOSpeedRatings
      );

      if (megapixels > 4 && !hasCamera) {
        return {
          isAiGenerated: true,
          reason: `High resolution image (${megapixels.toFixed(1)}MP) with no camera EXIF data`,
        };
      }
    }

    // ── No camera data and no EXIF at all — inconclusive, don't flag ──────
    return { isAiGenerated: false, reason: 'No AI indicators detected' };

  } catch (err) {
    console.error('Image analysis error:', err.message);
    return { isAiGenerated: false, reason: 'Analysis error — treating as authentic' };
  }
}

/*
 * ══════════════════════════════════════════════════════════════
 * PLUG-IN: External API integration (Sightengine / Hive)
 * ══════════════════════════════════════════════════════════════
 *
 * To use Sightengine API instead of EXIF-only detection:
 *
 *   const axios = require('axios');
 *
 *   async function analyzeWithSightengine(filePath) {
 *     const FormData = require('form-data');
 *     const data = new FormData();
 *     data.append('media', fs.createReadStream(filePath));
 *     data.append('models', 'genai');
 *     data.append('api_user', process.env.SIGHTENGINE_USER);
 *     data.append('api_secret', process.env.SIGHTENGINE_SECRET);
 *
 *     const res = await axios.post(
 *       'https://api.sightengine.com/1.0/check.json',
 *       data,
 *       { headers: data.getHeaders() }
 *     );
 *
 *     const score = res.data?.type?.ai_generated || 0;
 *     return {
 *       isAiGenerated: score > 0.5,
 *       reason: `Sightengine AI score: ${score}`,
 *     };
 *   }
 *
 * To use Hive Moderation API:
 *
 *   async function analyzeWithHive(filePath) {
 *     const FormData = require('form-data');
 *     const data = new FormData();
 *     data.append('media', fs.createReadStream(filePath));
 *
 *     const res = await axios.post(
 *       'https://api.thehive.ai/api/v2/task/sync',
 *       data,
 *       {
 *         headers: {
 *           ...data.getHeaders(),
 *           Authorization: `Token ${process.env.HIVE_API_KEY}`,
 *         },
 *       }
 *     );
 *
 *     const classes = res.data?.status?.[0]?.response?.output?.[0]?.classes || [];
 *     const aiClass = classes.find(c => c.class === 'ai_generated');
 *     return {
 *       isAiGenerated: aiClass ? aiClass.score > 0.5 : false,
 *       reason: `Hive AI score: ${aiClass?.score || 0}`,
 *     };
 *   }
 *
 * ══════════════════════════════════════════════════════════════
 */

module.exports = { analyzeImage };
