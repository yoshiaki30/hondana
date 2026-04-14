'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Book, Tag } from '@/types'

type Props = {
  books: Book[]
  tags: Tag[]
}

const SPINE_COLORS = [
  '#1A73E8', '#34A853', '#EA4335', '#FBBC04',
  '#6B2D8B', '#0B5345', '#1B4F72', '#4A235A',
]

function SpineCard({ book }: { book: Book }) {
  const [hovered, setHovered] = useState(false)
  const isUnavailable = book.available_copies === 0
  const defaultColor = SPINE_COLORS[book.title.charCodeAt(0) % SPINE_COLORS.length]
  const bgColor = book.spine_color ?? defaultColor

  return (
    <Link href={`/books/${book.id}`}>
      <div
        className="relative cursor-pointer"
        style={{ width: 64 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 背表紙 */}
        <div
          className={`relative overflow-hidden rounded-sm transition-transform ${isUnavailable ? '' : 'hover:-translate-y-2'}`}
          style={{
            width: 64,
            height: 172,
            boxShadow: '2px 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className={`object-cover ${isUnavailable ? 'brightness-50' : ''}`}
              sizes="64px"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center px-1 ${isUnavailable ? 'opacity-40' : ''}`}
              style={{ backgroundColor: bgColor }}
            >
              <span
                className="text-white text-[11px] font-medium leading-tight"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  maxHeight: '156px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {book.title}
              </span>
            </div>
          )}

          {/* 貸出中オーバーレイ */}
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-white text-[10px] font-bold bg-[#EA4335] px-1 py-0.5 rounded"
                style={{ writingMode: 'vertical-rl' }}
              >
                貸出中
              </span>
            </div>
          )}
        </div>

        {/* ホバーポップアップ */}
        {hovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-white border border-[#E8ECF0] rounded-2xl shadow-xl p-3 text-sm pointer-events-none">
            <p className="font-bold text-[#1A1A2E] text-[13px] line-clamp-2 leading-snug">{book.title}</p>
            {book.author && <p className="text-[#6B7280] text-[12px] mt-1">{book.author}</p>}
            <p className={`mt-1.5 text-[11px] font-semibold ${isUnavailable ? 'text-[#EA4335]' : 'text-[#34A853]'}`}>
              {isUnavailable ? '貸出中' : `貸出可（残${book.available_copies}冊）`}
            </p>
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {book.tags.map((t) => (
                  <span key={t.id} className="bg-[#E8F0FE] text-[#1A73E8] text-[10px] px-1.5 py-0.5 rounded-full font-medium">
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

function ShelfRow({ books }: { books: Book[] }) {
  return (
    <div className="relative mb-6">
      <div className="flex gap-2 items-end px-4 pb-3 min-h-[190px] flex-wrap">
        {books.map((book) => (
          <SpineCard key={book.id} book={book} />
        ))}
      </div>
      {/* 棚板 */}
      <div
        className="h-3 w-full rounded-sm"
        style={{
          background: 'linear-gradient(to bottom, #D1A054, #A87030)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

const BOOKS_PER_ROW = 12

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

  const rows: Book[][] = []
  for (let i = 0; i < filtered.length; i += BOOKS_PER_ROW) {
    rows.push(filtered.slice(i, i + BOOKS_PER_ROW))
  }
  if (rows.length === 0) rows.push([])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      {/* 検索バー */}
      <div className="bg-white rounded-2xl border border-[#E8ECF0] px-4 py-3 flex items-center gap-3 shadow-sm">
        <span className="text-[#6B7280] text-[18px]">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="タイトル・著者・タグで検索..."
          className="flex-1 bg-transparent text-[14px] text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[#6B7280] hover:text-[#1A1A2E] text-[16px]">
            ×
          </button>
        )}
      </div>

      {/* タグフィルター */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              selectedTag === null
                ? 'bg-[#1A73E8] text-white'
                : 'bg-white text-[#6B7280] border border-[#E8ECF0] hover:border-[#1A73E8] hover:text-[#1A73E8]'
            }`}
          >
            すべて
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id === selectedTag ? null : tag.id)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                selectedTag === tag.id
                  ? 'bg-[#1A73E8] text-white'
                  : 'bg-white text-[#6B7280] border border-[#E8ECF0] hover:border-[#1A73E8] hover:text-[#1A73E8]'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* 本棚 */}
      <div
        className="rounded-2xl overflow-hidden border border-[#E8ECF0] shadow-sm"
        style={{
          background: 'linear-gradient(160deg, #F5F0E8 0%, #EDE5D5 100%)',
        }}
      >
        <div className="px-4 pt-5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#6B7280]">
              <p className="text-[16px] font-semibold">本が見つかりません</p>
              <p className="text-[13px] mt-1">検索条件を変えてみてください</p>
            </div>
          ) : (
            rows.map((row, i) => (
              <ShelfRow key={i} books={row} />
            ))
          )}
        </div>
      </div>

      {/* 冊数 */}
      <p className="text-[12px] text-[#9CA3AF] text-right">
        {filtered.length}冊表示 / 全{books.length}冊
      </p>
    </div>
  )
}
