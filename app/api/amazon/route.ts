import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// Amazon URL から書籍情報を取得する API
// POST /api/amazon
// body: { url: string }

function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/ASIN\/([A-Z0-9]{10})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await req.json()
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const asin = extractAsin(url)
  if (!asin) {
    return NextResponse.json({ error: 'ASIN を URL から抽出できませんでした' }, { status: 400 })
  }

  // Amazon の公開書影URL（認証不要）
  const coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`

  // Google Books API で書誌情報取得（ISBN = ASIN でない場合もあるがまず試みる）
  let bookInfo: {
    title?: string
    author?: string
    publisher?: string
    description?: string
    isbn?: string
  } = {}

  try {
    // ASIN をそのまま ISBN として検索（10桁の場合は ISBN-10 の可能性あり）
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${asin}&maxResults=1`,
      { next: { revalidate: 3600 } }
    )
    const gbData = await gbRes.json()

    if (gbData.items && gbData.items.length > 0) {
      const vol = gbData.items[0].volumeInfo
      bookInfo = {
        title: vol.title,
        author: vol.authors?.join(', '),
        publisher: vol.publisher,
        description: vol.description,
        isbn: vol.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_13')?.identifier
          ?? vol.industryIdentifiers?.find((i: { type: string }) => i.type === 'ISBN_10')?.identifier,
      }
    }
  } catch {
    // Google Books API 失敗時は書影と ASIN だけ返す
  }

  return NextResponse.json({
    asin,
    cover_url: coverUrl,
    title: bookInfo.title ?? '',
    author: bookInfo.author ?? '',
    publisher: bookInfo.publisher ?? '',
    description: bookInfo.description ?? '',
    isbn: bookInfo.isbn ?? '',
  })
}
