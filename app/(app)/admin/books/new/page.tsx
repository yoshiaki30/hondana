'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type BookPreview = {
  asin: string
  cover_url: string
  title: string
  author: string
  publisher: string
  description: string
  isbn: string
}

export default function NewBookPage() {
  const router = useRouter()
  const [amazonUrl, setAmazonUrl] = useState('')
  const [preview, setPreview] = useState<BookPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [totalCopies, setTotalCopies] = useState(1)
  const [saving, setSaving] = useState(false)

  const fetchBookInfo = async () => {
    if (!amazonUrl.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/amazon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: amazonUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '書籍情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleSubmit = async () => {
    if (!preview?.title.trim()) { setError('タイトルは必須です'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preview, total_copies: totalCopies, tags }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A73E8] hover:bg-[#E8F0FE] rounded-xl transition-colors text-[18px] font-bold"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#1A1A2E]">📚 本を登録する</span>
      </div>

      {/* Amazon URL */}
      <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5 space-y-3">
        <p className="text-[13px] font-semibold text-[#6B7280]">AmazonのURLから書籍情報を自動取得</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={amazonUrl}
            onChange={(e) => setAmazonUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchBookInfo()}
            placeholder="https://www.amazon.co.jp/dp/..."
            className="flex-1 border border-[#E8ECF0] rounded-xl px-3 py-2.5 text-[13px] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
          />
          <button
            onClick={fetchBookInfo}
            disabled={loading || !amazonUrl.trim()}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? '取得中...' : '情報を取得'}
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF]">
          URLを貼り付けてボタンを押すとタイトル・著者・書影を自動入力します
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#EA4335] rounded-xl px-4 py-3 text-[13px]">
          {error}
        </div>
      )}

      {/* プレビュー＋編集フォーム */}
      {preview && (
        <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5 space-y-4">
          <div className="flex gap-4">
            {/* 書影プレビュー */}
            {preview.cover_url && (
              <div className="flex-shrink-0">
                <div className="relative w-20 h-28 rounded-lg shadow overflow-hidden">
                  <Image
                    src={preview.cover_url}
                    alt={preview.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">タイトル *</label>
                <input
                  value={preview.title}
                  onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                  className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">著者</label>
                <input
                  value={preview.author}
                  onChange={(e) => setPreview({ ...preview, author: e.target.value })}
                  className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">出版社</label>
                <input
                  value={preview.publisher}
                  onChange={(e) => setPreview({ ...preview, publisher: e.target.value })}
                  className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">あらすじ</label>
            <textarea
              value={preview.description}
              onChange={(e) => setPreview({ ...preview, description: e.target.value })}
              rows={3}
              className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] resize-none"
            />
          </div>

          {/* 所有冊数 */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">所有冊数</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTotalCopies(Math.max(1, totalCopies - 1))}
                className="w-8 h-8 bg-[#F0F4F8] hover:bg-[#E8ECF0] rounded-xl text-[#1A1A2E] font-bold transition-colors"
              >
                −
              </button>
              <span className="text-[16px] font-bold text-[#1A1A2E] w-6 text-center">{totalCopies}</span>
              <button
                type="button"
                onClick={() => setTotalCopies(totalCopies + 1)}
                className="w-8 h-8 bg-[#F0F4F8] hover:bg-[#E8ECF0] rounded-xl text-[#1A1A2E] font-bold transition-colors"
              >
                ＋
              </button>
              <span className="text-[12px] text-[#9CA3AF]">冊</span>
            </div>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1.5">タグ</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#E8F0FE] text-[#1A73E8] text-[12px] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-[#EA4335] transition-colors">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="タグを入力（Enter で追加）"
                className="flex-1 border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-[#F0F4F8] hover:bg-[#E8ECF0] text-[#6B7280] px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors"
              >
                追加
              </button>
            </div>
          </div>

          <div className="h-px bg-[#E8ECF0]" />

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-50 transition-colors"
          >
            {saving ? '登録中...' : '📚 登録する'}
          </button>
        </div>
      )}
    </div>
  )
}
