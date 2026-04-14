import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifySlack } from '@/lib/slack'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const userId = session.user.id
  const isAdmin = session.user.role === 'admin'

  // 貸出情報取得
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id, book_id, returned_at')
    .eq('id', id)
    .single()

  if (loanError || !loan) {
    return NextResponse.json({ error: '貸出が見つかりません' }, { status: 404 })
  }

  if (!isAdmin && loan.user_id !== userId) {
    return NextResponse.json({ error: 'この操作は許可されていません' }, { status: 403 })
  }

  if (loan.returned_at) {
    return NextResponse.json({ error: '既に返却済みです' }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    console.error('[loans PATCH] update error:', updateError)
    return NextResponse.json({ error: '返却処理に失敗しました' }, { status: 500 })
  }

  // 書籍名・ユーザー名を取得してSlack通知
  const { data: book } = await supabase
    .from('books')
    .select('title')
    .eq('id', loan.book_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', loan.user_id)
    .single()

  const userName = profile?.name ?? loan.user_id
  await notifySlack(`✅ ${userName} が『${book?.title ?? '不明'}』を返却しました`)

  return NextResponse.json({ success: true })
}
