import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// CSVテンプレートのカラム定義
// title,author,publisher,isbn,asin,total_copies,tags,cover_url
// ※ tags はカンマの代わりに「|」区切り（例: 技術|Python|入門）

// POST /api/admin/import/books
// multipart/form-data: csv file
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return NextResponse.json({ error: 'データ行がありません' }, { status: 400 })

  // ヘッダー行をスキップ
  const rows = lines.slice(1)

  // 既存書籍のタイトル一覧を取得（重複除外用）
  const { data: existingBooks } = await supabase.from('books').select('title, asin, isbn')
  const existingTitles = new Set((existingBooks ?? []).map((b: { title: string }) => b.title.trim()))
  const existingAsins = new Set((existingBooks ?? []).filter((b: { asin: string | null }) => b.asin).map((b: { asin: string }) => b.asin.trim()))
  const existingIsbns = new Set((existingBooks ?? []).filter((b: { isbn: string | null }) => b.isbn).map((b: { isbn: string }) => b.isbn.trim()))

  const results: { title: string; status: 'registered' | 'skipped' | 'error'; reason?: string }[] = []

  for (const line of rows) {
    if (!line.trim()) continue
    const cols = parseCSVLine(line)
    const [title = '', author = '', publisher = '', isbn = '', asin = '', total_copies_str = '1', tagsStr = '', cover_url = ''] = cols

    if (!title.trim()) {
      results.push({ title: '(空)', status: 'error', reason: 'タイトルが空です' })
      continue
    }

    // 重複チェック（タイトル / ASIN / ISBN）
    if (existingTitles.has(title.trim())) {
      results.push({ title, status: 'skipped', reason: '同じタイトルが既に登録済み' })
      continue
    }
    if (asin.trim() && existingAsins.has(asin.trim())) {
      results.push({ title, status: 'skipped', reason: '同じASINが既に登録済み' })
      continue
    }
    if (isbn.trim() && existingIsbns.has(isbn.trim())) {
      results.push({ title, status: 'skipped', reason: '同じISBNが既に登録済み' })
      continue
    }

    const total_copies = Math.max(1, parseInt(total_copies_str.trim()) || 1)

    try {
      const { data: book, error } = await supabase
        .from('books')
        .insert({
          title: title.trim(),
          author: author.trim() || null,
          publisher: publisher.trim() || null,
          isbn: isbn.trim() || null,
          asin: asin.trim() || null,
          total_copies,
          cover_url: cover_url.trim() || null,
          created_by: session.user.id,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      // タグ処理（| 区切り）
      const tagNames = tagsStr.split('|').map((t) => t.trim()).filter(Boolean)
      for (const tagName of tagNames) {
        let tagId: string | null = null
        const { data: existing } = await supabase.from('tags').select('id').eq('name', tagName).single()
        if (existing) {
          tagId = existing.id
        } else {
          const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single()
          tagId = newTag?.id ?? null
        }
        if (tagId) await supabase.from('book_tags').insert({ book_id: book.id, tag_id: tagId })
      }

      existingTitles.add(title.trim())
      if (asin.trim()) existingAsins.add(asin.trim())
      if (isbn.trim()) existingIsbns.add(isbn.trim())

      results.push({ title, status: 'registered' })
    } catch (e: unknown) {
      results.push({ title, status: 'error', reason: e instanceof Error ? e.message : '登録エラー' })
    }
  }

  const registered = results.filter((r) => r.status === 'registered').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const errors = results.filter((r) => r.status === 'error').length

  return NextResponse.json({ results, summary: { registered, skipped, errors } })
}

// 簡易CSVパーサー（ダブルクォート対応）
function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      cols.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur)
  return cols
}
