interface Props {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Anterior
      </button>
      <span className="text-sm text-zinc-500">
        Página{' '}
        <span className="font-semibold text-zinc-300">{page}</span>
        {' '}de{' '}
        <span className="font-semibold text-zinc-300">{totalPages}</span>
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próxima →
      </button>
    </div>
  )
}
