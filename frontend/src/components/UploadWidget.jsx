import { useRef, useState } from 'react'
import { api } from '../lib/api.js'

export default function UploadWidget({ onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const doc = await api.uploadDocument(file)
      onUploaded?.(doc)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="flex items-center justify-center gap-2 border border-dashed border-line rounded-lg py-3 text-xs font-mono text-muted cursor-pointer hover:border-amber hover:text-amber transition-colors">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={uploading}
        />
        {uploading ? (
          <span className="pulse-dot">INGESTING…</span>
        ) : (
          <span>+ UPLOAD PDF / DOCX</span>
        )}
      </label>
      {error && <div className="text-xs text-red-400 mt-1.5">{error}</div>}
    </div>
  )
}
