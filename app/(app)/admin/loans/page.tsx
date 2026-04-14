import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import AdminLoansClient from './AdminLoansClient'

export default async function AdminLoansPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const supabase = getSupabaseAdmin()

  // ロール確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  // 貸出中一覧（返却されていないもの）
  const { data: loans } = await supabase
    .from('loans')
    .select('id, book_id, user_id, borrowed_at, due_date')
    .is('returned_at', null)
    .order('due_date', { ascending: true })

  // 書籍情報
  const bookIds = [...new Set((loans ?? []).map((l: { book_id: string }) => l.book_id))]
  const userIds = [...new Set((loans ?? []).map((l: { user_id: string }) => l.user_id))]

  const [{ data: books }, { data: profiles }] = await Promise.all([
    bookIds.length > 0
      ? supabase.from('books').select('id, title, cover_url').in('id', bookIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from('profiles').select('user_id, name, email').in('user_id', userIds)
      : Promise.resolve({ data: [] }),
  ])

  const bookMap = Object.fromEntries((books ?? []).map((b: { id: string; title: string; cover_url: string | null }) => [b.id, b]))
  const profileMap = Object.fromEntries((profiles ?? []).map((p: { user_id: string; name: string | null; email: string | null }) => [p.user_id, p]))

  const enrichedLoans = (loans ?? []).map((l: { id: string; book_id: string; user_id: string; borrowed_at: string; due_date: string }) => ({
    ...l,
    book_title: bookMap[l.book_id]?.title ?? '(不明)',
    user_name: profileMap[l.user_id]?.name ?? profileMap[l.user_id]?.email ?? l.user_id,
    is_overdue: new Date(l.due_date) < new Date(),
  }))

  return <AdminLoansClient loans={enrichedLoans} />
}
