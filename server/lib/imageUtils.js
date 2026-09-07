import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const MAX_WIDTH = 600
const MAX_HEIGHT = 400
const JPEG_QUALITY = 80

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export async function resizeAndSaveImage(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase()
  const baseName = path.basename(originalName, ext).replace(/[^a-z0-9-_]/gi, '_').slice(0, 50)
  const timestamp = Date.now()
  const outName = `${baseName}_${timestamp}.jpg`
  const outPath = path.join(UPLOAD_DIR, outName)

  await sharp(buffer)
    .rotate()
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toFile(outPath)

  return { path: outPath, filename: outName }
}

export function deleteImage(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // ignore cleanup errors
  }
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB