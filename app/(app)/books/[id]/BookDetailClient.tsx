'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Book, Loan, Comment } from '@/types'
import { Star, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Props = {
  book: Book
  loanHistory: Loan[]
  comments: Comment[]
  userId: string
  myActiveLoanId: string | null
  canBorrow: boolean
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star
            className={`w-5 h-5 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export default function BookDetailClient({ book, loanHistory, comments, userId, myActiveLoanId, canBorrow }: Props) {
  const router = useRouter()
  const [borrowing, setBorrowing] = useState(false)
  const [returning, setReturning] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentRating, setCommentRating] = useState(0)
  const [submittingComment, setSubmittingComment] = useState(false)

  const handleBorrow = async () => {
    setBorrowing(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '貸出に失敗しました')
        return
      }
      router.refresh()
    } finally {
      setBorrowing(false)
    }
  }

  const handleReturn = async () => {
    if (!myActiveLoanId) return
    setReturning(true)
    try {
      const res = await fetch(`/api/loans/${myActiveLoanId}`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '返却に失敗しました')
        return
      }
      router.refresh()
    } finally {
      setReturning(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          body: commentBody,
          rating: commentRating > 0 ? commentRating : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'コメント投稿に失敗しました')
        return
      }
      setCommentBody('')
      setCommentRating(0)
      router.refresh()
    } finally {
      setSubmittingComment(false)
    }
  }

  const isUnavailable = (book.available_copies ?? 0) === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/" className="flex items-center gap-1 text-amber-700 hover:text-amber-900 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" />
        本棚に戻る
      </Link>

      {/* 書籍情報 */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex gap-6">
          {/* 書影 */}
          <div className="flex-shrink-0">
            {book.cover_url ? (
              <div className="relative w-32 h-48 rounded shadow-md overflow-hidden">
                <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="128px" />
              </div>
            ) : (
              <div
                className="w-32 h-48 rounded shadow-md flex items-center justify-center"
                style={{ backgroundColor: book.spine_color ?? '#8B4513' }}
              >
                <span className="text-white text-sm text-center px-2">{book.title}</span>
              </div>
            )}
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
            {book.author && <p className="text-gray-600 mt-1">{book.author}</p>}
            {book.publisher && <p className="text-sm text-gray-500 mt-1">{book.publisher}</p>}
            {book.published_at && (
              <p className="text-sm text-gray-500">
                出版日: {new Date(book.published_at).toLocaleDateString('ja-JP')}
              </p>
            )}
            {book.isbn && <p className="text-sm text-gray-500">ISBN: {book.isbn}</p>}
            {book.asin && <p className="text-sm text-gray-500">ASIN: {book.asin}</p>}

            {/* タグ */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {book.tags.map((t) => (
                  <span key={t.id} className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* 貸出状態 */}
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
              <p className={`font-medium ${isUnavailable ? 'text-red-600' : 'text-green-600'}`}>
                {isUnavailable
                  ? `貸出中（残0冊 / 全${book.total_copies}冊）`
                  : `貸出可（残${book.available_copies}冊 / 全${book.total_copies}冊）`}
              </p>
              {book.active_loans && book.active_loans.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  {book.active_loans.map((loan) => (
                    <li key={loan.id}>
                      {loan.user_name} — 返却期限: {new Date(loan.due_date).toLocaleDateString('ja-JP')}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* アクションボタン */}
            <div className="mt-4 flex gap-3">
              {canBorrow && (
                <button
                  onClick={handleBorrow}
                  disabled={borrowing}
                  className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {borrowing ? '処理中...' : '📖 借りる'}
                </button>
              )}
              {myActiveLoanId && (
                <button
                  onClick={handleReturn}
                  disabled={returning}
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {returning ? '処理中...' : '✅ 返却する'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* あらすじ */}
        {book.description && (
          <div className="mt-6 border-t pt-4">
            <h2 className="font-bold text-gray-700 mb-2">あらすじ</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
        )}
      </div>

      {/* 貸出履歴 */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">貸出履歴</h2>
        {loanHistory.length === 0 ? (
          <p className="text-sm text-gray-500">貸出履歴はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">借りた人</th>
                  <th className="pb-2 font-medium">借りた日</th>
                  <th className="pb-2 font-medium">返却期限</th>
                  <th className="pb-2 font-medium">返却日</th>
                </tr>
              </thead>
              <tbody>
                {loanHistory.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0">
                    <td className="py-2">{loan.user_name}</td>
                    <td className="py-2">{new Date(loan.borrowed_at).toLocaleDateString('ja-JP')}</td>
                    <td className="py-2">{new Date(loan.due_date).toLocaleDateString('ja-JP')}</td>
                    <td className="py-2">
                      {loan.returned_at
                        ? new Date(loan.returned_at).toLocaleDateString('ja-JP')
                        : <span className="text-red-500">未返却</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* コメント */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-gray-800 mb-4">コメント・感想</h2>

        {/* コメント投稿フォーム */}
        <form onSubmit={handleComment} className="mb-6 p-4 bg-amber-50 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">評価</label>
            <StarRating value={commentRating} onChange={setCommentRating} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="感想や読んだメモを書いてみましょう..."
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment || !commentBody.trim()}
            className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {submittingComment ? '投稿中...' : '投稿する'}
          </button>
        </form>

        {/* コメント一覧 */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">まだコメントはありません</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-800">{comment.user_name}</span>
                  {comment.rating && (
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i <= comment.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
