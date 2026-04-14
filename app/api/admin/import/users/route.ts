import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// CSVテンプレートのカラム定義
// name,email,role
// role は "admin" または "member"（省略時 member）

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

  // 既存メールアドレス一覧
  const { data: existingProfiles } = await supabase.from('profiles').select('email')
  const existingEmails = new Set((existingProfiles ?? []).filter((p: { email: string | null }) => p.email).map((p: { email: string }) => p.email.toLowerCase()))

  const results: { name: string; email: string; status: 'registered' | 'skipped' | 'error'; reason?: string }[] = []

  for (const line of rows) {
    if (!line.trim()) continue
    const cols = parseCSVLine(line)
    const [name = '', email = '', roleRaw = ''] = cols

    const emailTrimmed = email.trim().toLowerCase()
    const nameTrimmed = name.trim()

    if (!emailTrimmed) {
      results.push({ name: nameTrimmed || '(空)', email: '', status: 'error', reason: 'メールアドレスが空です' })
      continue
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      results.push({ name: nameTrimmed, email: emailTrimmed, status: 'error', reason: 'メールアドレスの形式が不正です' })
      continue
    }

    // 既登録チェック
    if (existingEmails.has(emailTrimmed)) {
      results.push({ name: nameTrimmed, email: emailTrimmed, status: 'skipped', reason: '既に登録済み' })
      continue
    }

    const role = ['admin', 'member'].includes(roleRaw.trim()) ? roleRaw.trim() : 'member'

    try {
      const { error } = await supabase.from('profiles').insert({
        user_id: emailTrimmed, // ログイン前はemail をuser_id として仮登録
        email: emailTrimmed,
        name: nameTrimmed || emailTrimmed.split('@')[0],
        role,
      })
      if (error) throw new Error(error.message)

      existingEmails.add(emailTrimmed)
      results.push({ name: nameTrimmed, email: emailTrimmed, status: 'registered' })
    } catch (e: unknown) {
      results.push({ name: nameTrimmed, email: emailTrimmed, status: 'error', reason: e instanceof Error ? e.message : '登録エラー' })
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
