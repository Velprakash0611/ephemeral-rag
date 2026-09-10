import { useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { AlertCircleIcon } from './Icons.jsx'

export default function UploadWidget({ onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
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

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-200 cursor-pointer text-center select-none ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
            : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-600/70 hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-6 h-6 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">
              Parsing & Embedding…
            </span>
            <span className="text-[10px] text-slate-400">Extracting tables & text</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Upload Document
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Drop PDF / DOCX or click
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                PDF
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                DOCX
              </span>
            </div>
          </div>
        )}
      </label>

      {error && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-red-500 dark:text-red-400 mt-1.5 text-center">
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
