import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/books/[id] — 書籍詳細（タグ・貸出可能数・アクティブ貸出・コメント含む）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseAdmin()

  // 書籍本体
  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !book) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // タグ
  const { data: bookTagRows } = await supabase
    .from('book_tags')
    .select('tag_id, tags(id, name)')
    .eq('book_id', id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (bookTagRows ?? []).map((r: any) => r.tags).flat().filter(Boolean)

  // アクティブ貸出（返却されていないもの）
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('id, user_id, borrowed_at, due_date')
    .eq('book_id', id)
    .is('returned_at', null)

  // 貸出履歴
  const { data: loanHistory } = await supabase
    .from('loans')
    .select('id, user_id, borrowed_at, due_date, returned_at')
    .eq('book_id', id)
    .order('borrowed_at', { ascending: false })

  // ユーザー名を profiles から取得
  const allUserIds = [...new Set([
    ...(activeLoans ?? []).map((l: { user_id: string }) => l.user_id),
    ...(loanHistory ?? []).map((l: { user_id: string }) => l.user_id),
  ])]

  let profileMap: Record<string, { name: string | null; email: string | null }> = {}
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', allUserIds)
    profileMap = Object.fromEntries(
      (profiles ?? []).map((p: { user_id: string; name: string | null; email: string | null }) => [p.user_id, { name: p.name, email: p.email }])
    )
  }

  // コメント
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('book_id', id)
    .order('created_at', { ascending: false })

  const available_copies = book.total_copies - (activeLoans?.length ?? 0)

  return NextResponse.json({
    ...book,
    tags,
    available_copies: Math.max(0, available_copies),
    active_loans: (activeLoans ?? []).map((l: { user_id: string; id: string; borrowed_at: string; due_date: string }) => ({
      ...l,
      user_name: profileMap[l.user_id]?.name ?? l.user_id,
    })),
    loan_history: (loanHistory ?? []).map((l: { user_id: string; id: string; borrowed_at: string; due_date: string; returned_at: string | null }) => ({
      ...l,
      user_name: profileMap[l.user_id]?.name ?? l.user_id,
    })),
    comments: (comments ?? []).map((c: { user_id: string; id: string; body: string; rating: number | null; created_at: string; loan_id: string | null }) => ({
      ...c,
      user_name: profileMap[c.user_id]?.name ?? c.user_id,
    })),
  })
}
