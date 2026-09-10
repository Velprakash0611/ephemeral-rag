import { LogoIcon, UserIcon, FileTextIcon, ZapIcon, SearchIcon } from './Icons.jsx'

export default function MessageBubble({ message, onInspect }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm shadow-indigo-600/20">
          <LogoIcon className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed transition-colors ${
          isUser
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-sm'
            : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-xs'
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            {message.document_name && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5"
                title="Queried from this document. Embeddings purged on session close to maintain zero database cost."
              >
                <FileTextIcon className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[200px]">{message.document_name}</span>
              </span>
            )}

            {message.tokens_used && message.tokens_used.total_tokens > 0 && (
              <span
                className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/40 dark:border-slate-700/40 flex items-center gap-1"
                title={`Prompt: ${message.tokens_used.prompt_tokens} | Completion: ${message.tokens_used.completion_tokens}`}
              >
                <ZapIcon className="w-3 h-3 text-slate-400" />
                <span>{message.tokens_used.total_tokens} tokens</span>
              </span>
            )}

            {message.sources && message.sources.length > 0 && (
              <button
                type="button"
                onClick={() => onInspect(message.sources)}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer"
              >
                <SearchIcon className="w-3 h-3" />
                <span>Inspect Retrieval</span>
                <span className="text-[10px] px-1 rounded bg-indigo-200/60 dark:bg-indigo-800/60 font-mono">
                  {message.sources.length}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </div>
      )}
    </div>
  )
}
