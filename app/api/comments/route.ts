import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// POST /api/comments
// body: { bookId: string, loanId?: string, body: string, rating?: number }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, loanId, body, rating } = await req.json()

  if (!bookId || !body?.trim()) {
    return NextResponse.json({ error: 'bookId と body は必須です' }, { status: 400 })
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'rating は 1〜5 の値です' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      book_id: bookId,
      user_id: session.user.id,
      loan_id: loanId ?? null,
      body: body.trim(),
      rating: rating ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('コメント投稿エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
