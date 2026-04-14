'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Book, Tag } from '@/types'
import { Search } from 'lucide-react'

type Props = {
  books: Book[]
  tags: Tag[]
}

const SPINE_COLORS = [
  '#8B4513', '#2C5F2E', '#1B4F72', '#6B2D8B',
  '#C0392B', '#1A5276', '#4A235A', '#0B5345',
]

function SpineCard({ book }: { book: Book }) {
  const [hovered, setHovered] = useState(false)
  const isUnavailable = book.available_copies === 0

  const defaultColor = SPINE_COLORS[
    book.title.charCodeAt(0) % SPINE_COLORS.length
  ]
  const bgColor = book.spine_color ?? defaultColor

  return (
    <Link href={`/books/${book.id}`}>
      <div
        className="relative cursor-pointer"
        style={{ width: 72 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 背表紙 */}
        <div
          className="relative overflow-hidden rounded-sm shadow-md transition-transform hover:-translate-y-2"
          style={{ width: 72, height: 180 }}
        >
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="72px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center px-1"
              style={{ backgroundColor: bgColor }}
            >
              <span
                className="text-white text-xs font-medium leading-tight break-all"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  maxHeight: '160px',
                  overflow: 'hidden',
                }}
              >
                {book.title}
              </span>
            </div>
          )}

          {/* 貸出中オーバーレイ */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span
                className="text-white text-xs font-bold bg-red-600 px-1 py-0.5 rounded"
                style={{ writingMode: 'vertical-rl' }}
              >
                貸出中
              </span>
            </div>
          )}
        </div>

        {/* ホバーポップアップ */}
        {hovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-white border border-amber-200 rounded-lg shadow-xl p-3 text-sm pointer-events-none">
            <p className="font-bold text-gray-800 line-clamp-2">{book.title}</p>
            {book.author && <p className="text-gray-500 mt-1">{book.author}</p>}
            <p className={`mt-1 text-xs font-medium ${isUnavailable ? 'text-red-600' : 'text-green-600'}`}>
              {isUnavailable ? '貸出中' : `貸出可（残${book.available_copies}冊）`}
            </p>
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {book.tags.map((t) => (
                  <span key={t.id} className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

// 本棚の1段
function ShelfRow({ books }: { books: Book[] }) {
  return (
    <div className="relative mb-8">
      {/* 本のコンテナ */}
      <div className="flex gap-2 items-end px-4 pb-3 min-h-[200px]">
        {books.map((book) => (
          <SpineCard key={book.id} book={book} />
        ))}
      </div>
      {/* 棚板 */}
      <div
        className="h-4 w-full rounded-sm shadow-lg"
        style={{
          background: 'linear-gradient(to bottom, #8B6914, #6B4F0C)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}

const BOOKS_PER_ROW = 10

export default function BookshelfClient({ books, tags }: Props) {
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const filtered = books.filter((book) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      book.title.toLowerCase().includes(q) ||
      (book.author ?? '').toLowerCase().includes(q) ||
      (book.tags ?? []).some((t) => t.name.toLowerCase().includes(q))
    const matchTag =
      !selectedTag ||
      (book.tags ?? []).some((t) => t.id === selectedTag)
    return matchSearch && matchTag
  })

  // 本棚の段に分割
  const rows: Book[][] = []
  for (let i = 0; i < filtered.length; i += BOOKS_PER_ROW) {
    rows.push(filtered.slice(i, i + BOOKS_PER_ROW))
  }
  if (rows.length === 0) rows.push([])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 検索・フィルター */}
      <div className="mb-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・著者・タグで検索..."
            className="w-full pl-9 pr-4 py-2 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedTag === null
                ? 'bg-amber-700 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            全て
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id === selectedTag ? null : tag.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTag === tag.id
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* 本棚 */}
      <div
        className="bg-amber-100 rounded-xl p-6 shadow-inner"
        style={{
          background: 'linear-gradient(to bottom, #fef3c7, #fde68a)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-amber-600">
            <p className="text-lg">本が見つかりません</p>
            <p className="text-sm mt-1">検索条件を変更してみてください</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <ShelfRow key={i} books={row} />
          ))
        )}
      </div>

      <p className="text-sm text-amber-600 mt-4 text-right">
        {filtered.length}冊 / 全{books.length}冊
      </p>
    </div>
  )
}
