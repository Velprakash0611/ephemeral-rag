function ScoreBar({ label, value, colorVar, max = 1 }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
        <span className="w-8 shrink-0">{label}</span>
        <span className="italic">n/a</span>
      </div>
    )
  }
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-8 shrink-0 text-muted">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: colorVar }}
        />
      </div>
      <span className="w-10 text-right shrink-0" style={{ color: colorVar }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export default function RetrievalDebugPanel({ sources, open, onClose }) {
  if (!open) return null

  return (
    <aside className="w-96 shrink-0 border-l border-line bg-panel h-screen overflow-y-auto">
      <div className="p-4 border-b border-line flex items-center justify-between sticky top-0 bg-panel z-10">
        <div>
          <div className="font-mono text-xs tracking-[0.2em] text-amber uppercase">retrieval trace</div>
          <div className="text-xs text-muted mt-0.5">
            {sources?.length || 0} chunks reranked to top-{sources?.length || 0}
          </div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-text text-sm">✕</button>
      </div>

      <div className="p-4 space-y-3">
        {(!sources || sources.length === 0) && (
          <div className="text-xs text-muted italic">No retrieval data for this message.</div>
        )}
        {sources?.map((s, idx) => (
          <div key={s.chunk_id || idx} className="border border-line rounded-lg p-3 bg-panel-2/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-amber">#{idx + 1}</span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                {s.page_number != null && <span>p.{s.page_number}</span>}
                {s.element_type && (
                  <span className="px-1.5 py-0.5 rounded bg-panel border border-line uppercase">
                    {s.element_type}
                  </span>
                )}
              </div>
            </div>
            {s.section && (
              <div className="text-[11px] text-muted mb-1.5 truncate" title={s.section}>
                §&nbsp;{s.section}
              </div>
            )}
            <p className="text-xs text-text/80 leading-relaxed mb-3 line-clamp-3">{s.preview}</p>
            <div className="space-y-1.5">
              <ScoreBar label="BM25" value={s.bm25_score} colorVar="var(--color-violet)" max={10} />
              <ScoreBar label="VEC" value={s.vector_score} colorVar="var(--color-cyan)" max={1} />
              {s.rrf_score !== undefined && (
                <ScoreBar label="RRF" value={s.rrf_score} colorVar="var(--color-muted)" max={0.035} />
              )}
              <ScoreBar label="RRK" value={s.rerank_score} colorVar="var(--color-amber)" max={5} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
