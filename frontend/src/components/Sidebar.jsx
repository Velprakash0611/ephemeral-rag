import UploadWidget from './UploadWidget.jsx'
import { LogoIcon, FolderIcon, FileTextIcon, MessageSquareIcon, PlusIcon, CloseIcon } from './Icons.jsx'

export default function Sidebar({
  documents, sessions, activeSessionId, activeDocumentId,
  onUploaded, onSelectSession, onNewChat, onDeleteSession,
  onDeleteDocument, onSelectDocumentFilter, user, onLogout,
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b0f19] flex flex-col h-screen transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
            <LogoIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
              Ephemeral RAG
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
              {user?.username || 'Guest Session'}
            </div>
          </div>
        </div>
        {user?.role && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            user.role === 'admin'
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : user.role === 'guest'
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
          }`}>
            {user.role}
          </span>
        )}
      </div>

      {/* Document Section */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 space-y-3">
        <UploadWidget onUploaded={onUploaded} />

        <div className="space-y-1 max-h-44 overflow-y-auto">
          <div className="flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Documents</span>
            <span>{documents.length}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectDocumentFilter(null)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              !activeDocumentId
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FolderIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="truncate">All Documents</span>
          </button>

          {documents.map((doc) => {
            const isSelected = activeDocumentId === doc.id
            const isReady = doc.status === 'ready'
            const isFailed = doc.status === 'failed'

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocumentFilter(doc.id)}
                title={isFailed && doc.error_message ? `Error: ${doc.error_message}` : doc.filename}
                className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <FileTextIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{doc.filename}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isReady
                        ? 'bg-emerald-500'
                        : isFailed
                        ? 'bg-red-500'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                    title={`Status: ${doc.status}`}
                  />
                  {onDeleteDocument && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs p-0.5 rounded transition cursor-pointer"
                      title="Delete document"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sessions Section */}
      <div className="p-3.5 flex-1 overflow-y-auto space-y-2">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition duration-150 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New Conversation</span>
        </button>

        <div className="pt-2">
          <div className="px-1.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recent Chats
          </div>
          <div className="space-y-1 mt-1">
            {sessions.map((s) => {
              const isActive = activeSessionId === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquareIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.title || 'Conversation'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs p-0.5 rounded transition cursor-pointer shrink-0"
                    title="Delete session"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
            {sessions.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-slate-600 italic px-2 py-2">
                No chats yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / User Sign Out */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center uppercase shrink-0">
            {user?.username ? user.username[0] : 'G'}
          </div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
            {user?.username || 'Guest'}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-1 rounded transition cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
