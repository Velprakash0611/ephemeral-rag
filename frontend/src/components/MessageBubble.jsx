export default function MessageBubble({ message, onInspect }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-amber text-ink'
            : 'bg-panel border border-line text-text'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && (
          <div className="mt-2.5 pt-2 border-t border-line/60 flex flex-wrap items-center gap-2">
            {message.document_name && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel-2 border border-line text-muted flex items-center gap-1"
                title="Original file queried during this session. Vector embeddings purged upon session close to preserve free storage."
              >
                📄 {message.document_name}
              </span>
            )}
            {message.tokens_used && message.tokens_used.total_tokens > 0 && (
              <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded bg-panel-2/60">
                ⚡ {message.tokens_used.total_tokens} tokens
              </span>
            )}
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={() => onInspect(message.sources)}
                className="text-[11px] font-mono text-amber hover:underline ml-auto"
              >
                ▸ inspect {message.sources.length} chunk{message.sources.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
