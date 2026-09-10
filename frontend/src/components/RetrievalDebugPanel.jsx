import { CloseIcon } from './Icons.jsx'

function ScoreBar({ label, value, colorClass, max = 1 }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
        <span className="w-10 shrink-0">{label}</span>
        <span className="italic">n/a</span>
      </div>
    )
  }
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-10 shrink-0 font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right shrink-0 font-medium text-slate-700 dark:text-slate-300">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export default function RetrievalDebugPanel({ sources, open, onClose }) {
  if (!open) return null

  return (
    <aside className="w-96 shrink-0 border-l border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b0f19] h-screen overflow-y-auto flex flex-col transition-colors duration-200 z-20 shadow-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0b0f19] backdrop-blur-sm z-10">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Retrieval Trace
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {sources?.length || 0} chunks fused & reranked
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
          title="Close panel"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {(!sources || sources.length === 0) && (
          <div className="text-xs text-slate-400 italic text-center py-6">
            No retrieval trace recorded for this message.
          </div>
        )}

        {sources?.map((s, idx) => (
          <div
            key={s.chunk_id || idx}
            className="border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 bg-slate-50/70 dark:bg-slate-900/60 shadow-xs space-y-2.5 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                Chunk #{idx + 1}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {s.page_number != null && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">
                    Page {s.page_number}
                  </span>
                )}
                {s.element_type && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 uppercase font-mono">
                    {s.element_type}
                  </span>
                )}
              </div>
            </div>

            {s.section && (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={s.section}>
                § {s.section}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
              {s.preview}
            </p>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
              <ScoreBar label="BM25" value={s.bm25_score} colorClass="bg-purple-500" max={10} />
              <ScoreBar label="Vector" value={s.vector_score} colorClass="bg-teal-500" max={1} />
              {s.rrf_score !== undefined && (
                <ScoreBar label="RRF" value={s.rrf_score} colorClass="bg-indigo-500" max={0.035} />
              )}
              <ScoreBar label="Rerank" value={s.rerank_score} colorClass="bg-amber-500" max={5} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
