import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Book, Loan, Comment, Tag } from '@/types'
import BookDetailClient from './BookDetailClient'

type Props = {
  params: Promise<{ id: string }>
}

async function getBook(id: string): Promise<Book | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('books')
    .select('*, book_tags(tags(id, name))')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const tags: Tag[] = (data.book_tags ?? [])
    .map((bt: { tags: Tag | null }) => bt.tags)
    .filter(Boolean) as Tag[]

  // アクティブ貸出数
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('id, user_id, borrowed_at, due_date, returned_at, created_at, book_id')
    .eq('book_id', id)
    .is('returned_at', null)

  // プロファイル情報を取得してuser_name, user_emailを付与
  const loansWithProfiles: Loan[] = []
  for (const loan of activeLoans ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', loan.user_id)
      .single()
    loansWithProfiles.push({
      ...loan,
      user_name: profile?.name ?? loan.user_id,
      user_email: profile?.email ?? '',
    })
  }

  return {
    ...data,
    tags,
    available_copies: Math.max(0, data.total_copies - (activeLoans?.length ?? 0)),
    active_loans: loansWithProfiles,
  }
}

async function getLoanHistory(bookId: string): Promise<Loan[]> {
  const supabase = getSupabaseAdmin()
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('book_id', bookId)
    .order('borrowed_at', { ascending: false })

  const result: Loan[] = []
  for (const loan of loans ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', loan.user_id)
      .single()
    result.push({
      ...loan,
      user_name: profile?.name ?? loan.user_id,
      user_email: profile?.email ?? '',
    })
  }
  return result
}

async function getComments(bookId: string): Promise<Comment[]> {
  const supabase = getSupabaseAdmin()
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })

  const result: Comment[] = []
  for (const comment of comments ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', comment.user_id)
      .single()
    result.push({
      ...comment,
      user_name: profile?.name ?? comment.user_id,
    })
  }
  return result
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const [book, loanHistory, comments] = await Promise.all([
    getBook(id),
    getLoanHistory(id),
    getComments(id),
  ])

  if (!book) notFound()

  const userId = session?.user?.id ?? ''
  const myActiveLoan = book.active_loans?.find((l) => l.user_id === userId)
  const canBorrow = (book.available_copies ?? 0) > 0 && !myActiveLoan

  return (
    <BookDetailClient
      book={book}
      loanHistory={loanHistory}
      comments={comments}
      userId={userId}
      myActiveLoanId={myActiveLoan?.id ?? null}
      canBorrow={canBorrow}
    />
  )
}
