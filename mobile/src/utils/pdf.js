import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { API_BASE_URL } from './constants'
import { getToken } from '../api/client'

export async function downloadStatementPdf(month, filename) {
  const res = await fetch(`${API_BASE_URL}/api/reports/pdf?month=${month}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to download PDF' }))
    throw new Error(err.error || 'Failed to download PDF')
  }

  const blob = await res.blob()
  const base64 = await blobToBase64(blob)

  const localFile = `${FileSystem.cacheDirectory}${filename || 'statement.pdf'}`
  await FileSystem.writeAsStringAsync(localFile, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localFile, { mimeType: 'application/pdf', dialogTitle: 'Statement PDF' })
  }

  return localFile
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read PDF'))
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = String(dataUrl).split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(blob)
  })
}