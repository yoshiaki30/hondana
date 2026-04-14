import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// CSVテンプレートのカラム定義
// amazon_url,total_copies,tags
// amazon_url: AmazonのURL（必須）。ASINから書籍情報を自動取得
// total_copies: 所有冊数（省略時 1）
// tags: タグ（|区切り。例: 技術|Python|入門）

function extractAsin(url: string): string | null {
  const patterns = [/\/dp\/([A-Z0-9]{10})/, /\/gp\/product\/([A-Z0-9]{10})/, /\/ASIN\/([A-Z0-9]{10})/]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

async function fetchBookInfo(asin: string): Promise<{
  title: string; author: string; publisher: string; description: string; isbn: string; cover_url: string
}> {
  const cover_url = `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${asin}&maxResults=1`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    if (data.items?.length > 0) {
      const vol = data.items[0].volumeInfo
      return {
        title: vol.title ?? '',
        author: vol.authors?.join(', ') ?? '',
        publisher: vol.publisher ?? '',
        description: vol.description ?? '',
        isbn: vol.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_13')?.identifier
          ?? vol.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_10')?.identifier ?? '',
        cover_url,
      }
    }
  } catch { /* fallback */ }
  return { title: '', author: '', publisher: '', description: '', isbn: '', cover_url }
}

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

  const rows = lines.slice(1)

  // 既存ASIN一覧（重複除外用）
  const { data: existingBooks } = await supabase.from('books').select('asin, isbn')
  const existingAsins = new Set((existingBooks ?? []).filter((b: { asin: string | null }) => b.asin).map((b: { asin: string }) => b.asin.trim()))
  const existingIsbns = new Set((existingBooks ?? []).filter((b: { isbn: string | null }) => b.isbn).map((b: { isbn: string }) => b.isbn.trim()))

  const results: { title: string; status: 'registered' | 'skipped' | 'error'; reason?: string }[] = []

  for (const line of rows) {
    if (!line.trim()) continue
    const cols = parseCSVLine(line)
    const [amazonUrl = '', total_copies_str = '1', tagsStr = ''] = cols

    const urlTrimmed = amazonUrl.trim()
    if (!urlTrimmed) {
      results.push({ title: '(空)', status: 'error', reason: 'Amazon URLが空です' })
      continue
    }

    const asin = extractAsin(urlTrimmed)
    if (!asin) {
      results.push({ title: urlTrimmed, status: 'error', reason: 'URLからASINを抽出できませんでした' })
      continue
    }

    // 重複チェック
    if (existingAsins.has(asin)) {
      results.push({ title: `ASIN: ${asin}`, status: 'skipped', reason: '既に登録済み（ASIN重複）' })
      continue
    }

    // Amazon/Google Books から書籍情報取得
    const info = await fetchBookInfo(asin)

    if (info.isbn && existingIsbns.has(info.isbn)) {
      results.push({ title: info.title || `ASIN: ${asin}`, status: 'skipped', reason: '既に登録済み（ISBN重複）' })
      continue
    }

    const total_copies = Math.max(1, parseInt(total_copies_str.trim()) || 1)
    const title = info.title || `（タイトル不明: ${asin}）`

    try {
      const { data: book, error } = await supabase
        .from('books')
        .insert({
          title,
          author: info.author || null,
          publisher: info.publisher || null,
          isbn: info.isbn || null,
          asin,
          description: info.description || null,
          cover_url: info.cover_url || null,
          total_copies,
          created_by: session.user.id,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)

      // タグ処理
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

      existingAsins.add(asin)
      if (info.isbn) existingIsbns.add(info.isbn)
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
