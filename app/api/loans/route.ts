import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { notifySlack } from '@/lib/slack'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bookId } = await req.json()
  if (!bookId) {
    return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  // 書籍情報取得
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, total_copies')
    .eq('id', bookId)
    .single()

  if (bookError || !book) {
    return NextResponse.json({ error: '書籍が見つかりません' }, { status: 404 })
  }

  // 現在の貸出数を確認
  const { count: activeCount } = await supabase
    .from('loans')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .is('returned_at', null)

  const availableCopies = book.total_copies - (activeCount ?? 0)
  if (availableCopies <= 0) {
    return NextResponse.json({ error: '貸出可能な冊数がありません' }, { status: 409 })
  }

  // 既に借りているかチェック
  const { data: existingLoan } = await supabase
    .from('loans')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .is('returned_at', null)
    .single()

  if (existingLoan) {
    return NextResponse.json({ error: '既にこの本を借りています' }, { status: 409 })
  }

  // due_date = today + 1ヶ月
  const dueDate = new Date()
  dueDate.setMonth(dueDate.getMonth() + 1)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const { data: loan, error: insertError } = await supabase
    .from('loans')
    .insert({
      book_id: bookId,
      user_id: userId,
      due_date: dueDateStr,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[loans POST] insert error:', insertError)
    return NextResponse.json({ error: '貸出登録に失敗しました' }, { status: 500 })
  }

  // プロフィール取得してSlack通知
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', userId)
    .single()

  const userName = profile?.name ?? session.user.name ?? userId
  await notifySlack(
    `📖 ${userName} が『${book.title}』を借りました（返却期限: ${dueDateStr}）`
  )

  return NextResponse.json({ loan }, { status: 201 })
}
