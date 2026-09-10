import UploadWidget from './UploadWidget.jsx'

const STATUS_STYLES = {
  processing: 'text-amber',
  ready: 'text-cyan',
  failed: 'text-red-400',
}

export default function Sidebar({
  documents, sessions, activeSessionId, activeDocumentId,
  onUploaded, onSelectSession, onNewChat, onDeleteSession,
  onDeleteDocument, onSelectDocumentFilter, user, onLogout,
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-line bg-panel flex flex-col h-screen">
      <div className="p-4 border-b border-line">
        <div className="font-display text-lg font-semibold text-text">Contextual</div>
        <div className="text-xs font-mono text-muted mt-0.5">{user?.username}</div>
      </div>

      <div className="p-4 border-b border-line space-y-3">
        <UploadWidget onUploaded={onUploaded} />
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <button
            onClick={() => onSelectDocumentFilter(null)}
            className={`w-full text-left text-xs font-mono px-2 py-1.5 rounded-md transition-colors ${
              !activeDocumentId ? 'bg-panel-2 text-amber' : 'text-muted hover:text-text'
            }`}
          >
            ALL DOCUMENTS
          </button>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                activeDocumentId === doc.id ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
              }`}
              onClick={() => onSelectDocumentFilter(doc.id)}
              title={doc.status === 'failed' && doc.error_message ? `Failed: ${doc.error_message}` : doc.filename}
            >
              <span className="truncate flex-1">{doc.filename}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`font-mono text-[10px] ${STATUS_STYLES[doc.status] || 'text-muted'}`}>
                  {doc.status}
                </span>
                {onDeleteDocument && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id) }}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 text-xs px-0.5"
                    title="Delete document"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <button
          onClick={onNewChat}
          className="w-full text-left text-xs font-mono text-ink bg-amber rounded-md px-3 py-2 mb-3 hover:brightness-110 transition"
        >
          + NEW CHAT
        </button>
        <div className="text-xs font-mono text-muted mb-2 tracking-wider">RECENT SESSIONS</div>
        <div className="space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center justify-between gap-1 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                activeSessionId === s.id ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'
              }`}
              onClick={() => onSelectSession(s.id)}
            >
              <span className="truncate">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-xs text-muted italic">No chats yet</div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-line">
        <button onClick={onLogout} className="text-xs font-mono text-muted hover:text-red-400 transition-colors">
          SIGN OUT
        </button>
      </div>
    </aside>
  )
}
