import { getSupabaseAdmin } from '@/lib/supabase'
import type { Book, Tag } from '@/types'
import BookshelfClient from './BookshelfClient'

async function getBooks(): Promise<Book[]> {
  const supabase = getSupabaseAdmin()

  const { data: books, error } = await supabase
    .from('books')
    .select(`
      *,
      book_tags(
        tags(id, name)
      ),
      loans!inner(id, returned_at)
    `)
    .order('created_at', { ascending: false })

  if (error && error.code !== 'PGRST116') {
    // fallback: fetch without inner join
    const { data: booksSimple } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    return (booksSimple ?? []).map((b) => ({ ...b, tags: [], available_copies: b.total_copies, active_loans: [] }))
  }

  // Get all active loans
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('book_id')
    .is('returned_at', null)

  const activeLoanCounts: Record<string, number> = {}
  for (const loan of activeLoans ?? []) {
    activeLoanCounts[loan.book_id] = (activeLoanCounts[loan.book_id] ?? 0) + 1
  }

  // Get all books with tags
  const { data: booksWithTags } = await supabase
    .from('books')
    .select('*, book_tags(tags(id, name))')
    .order('created_at', { ascending: false })

  return (booksWithTags ?? []).map((b) => {
    const tags: Tag[] = (b.book_tags ?? [])
      .map((bt: { tags: Tag | null }) => bt.tags)
      .filter(Boolean) as Tag[]
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
