import { getSupabaseAdmin } from '@/lib/supabase'
import type { Book, Tag } from '@/types'
import BookshelfClient from './BookshelfClient'

async function getBooks(): Promise<Book[]> {
  const supabase = getSupabaseAdmin()

  // シンプルに2クエリで取得（inner joinなし）
  const [{ data: booksRaw }, { data: activeLoans }] = await Promise.all([
    supabase
      .from('books')
      .select('*, book_tags(tags(id, name))')
      .order('created_at', { ascending: false }),
    supabase
      .from('loans')
      .select('book_id')
      .is('returned_at', null),
  ])

  const activeLoanCounts: Record<string, number> = {}
  for (const loan of activeLoans ?? []) {
    activeLoanCounts[loan.book_id] = (activeLoanCounts[loan.book_id] ?? 0) + 1
  }

  return (booksRaw ?? []).map((b) => {
    // book_tags は [{ tags: { id, name } }] または [{ tags: [{ id, name }] }] のどちらかの形式
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags: Tag[] = (b.book_tags ?? []).flatMap((bt: any) =>
      Array.isArray(bt.tags) ? bt.tags : bt.tags ? [bt.tags] : []
    ).filter(Boolean) as Tag[]
    const loanCount = activeLoanCounts[b.id] ?? 0
    return {
      ...b,
      tags,
      available_copies: Math.max(0, b.total_copies - loanCount),
    }
  })
}

async function getTags(): Promise<Tag[]> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase.from('tags').select('*').order('name')
  return data ?? []
}

export default async function HomePage() {
  const [books, tags] = await Promise.all([getBooks(), getTags()])

  return <BookshelfClient books={books} tags={tags} />
}
