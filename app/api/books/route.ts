import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data: books, error } = await supabase
    .from('books')
    .select('*, book_tags(tags(id, name))')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // アクティブ貸出数を付与
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('book_id')
    .is('returned_at', null)

  const activeLoanCounts: Record<string, number> = {}
  for (const loan of activeLoans ?? []) {
    activeLoanCounts[loan.book_id] = (activeLoanCounts[loan.book_id] ?? 0) + 1
  }

  const result = (books ?? []).map((b) => {
    const tags = (b.book_tags ?? [])
      .map((bt: { tags: { id: string; name: string } | null }) => bt.tags)
      .filter(Boolean)
    return {
      ...b,
      tags,
      available_copies: Math.max(0, b.total_copies - (activeLoanCounts[b.id] ?? 0)),
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { title, author, isbn, asin, publisher, published_at, description, cover_url, spine_color, total_copies, tags } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      title,
      author: author ?? null,
      isbn: isbn ?? null,
      asin: asin ?? null,
      publisher: publisher ?? null,
      published_at: published_at ?? null,
      description: description ?? null,
      cover_url: cover_url ?? null,
      spine_color: spine_color ?? null,
      total_copies: total_copies ?? 1,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (bookError) {
    console.error('[books POST] insert error:', bookError)
    return NextResponse.json({ error: '書籍登録に失敗しました' }, { status: 500 })
  }

  // タグの処理
  if (tags && Array.isArray(tags) && tags.length > 0) {
    for (const tagName of tags) {
      // 既存タグを探すか新規作成
      let tagId: string | null = null

      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single()

      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single()
        tagId = newTag?.id ?? null
      }

      if (tagId) {
        await supabase.from('book_tags').insert({ book_id: book.id, tag_id: tagId })
      }
    }
  }

  return NextResponse.json({ book }, { status: 201 })
}
