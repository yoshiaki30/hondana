'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleSubmit = async () => {
    if (!preview?.title) {
      setError('タイトルは必須です')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preview,
          total_copies: totalCopies,
          tags,
        }),
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">📚 本を登録する</h1>

      {/* Amazon URL 入力 */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Amazon URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={amazonUrl}
            onChange={(e) => setAmazonUrl(e.target.value)}
            placeholder="https://www.amazon.co.jp/dp/..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={fetchBookInfo}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '取得中...' : '情報を取得'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* プレビュー・手動編集フォーム */}
      {preview && (
        <div className="space-y-4 border border-gray-200 rounded-xl p-5 bg-gray-50">
          <div className="flex gap-4">
            {preview.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.cover_url}
                alt={preview.title}
                className="w-24 h-auto object-contain rounded shadow"
              />
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">タイトル *</label>
                <input
                  value={preview.title}
                  onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">著者</label>
                <input
                  value={preview.author}
                  onChange={(e) => setPreview({ ...preview, author: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">出版社</label>
                <input
                  value={preview.publisher}
                  onChange={(e) => setPreview({ ...preview, publisher: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">あらすじ</label>
            <textarea
              value={preview.description}
              onChange={(e) => setPreview({ ...preview, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* 所有冊数 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">所有冊数</label>
            <input
              type="number"
              min={1}
              value={totalCopies}
              onChange={(e) => setTotalCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* タグ */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">タグ</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="タグを入力 (Enter で追加)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={addTag}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                追加
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? '登録中...' : '📚 登録する'}
          </button>
        </div>
      )}
    </div>
  )
}
