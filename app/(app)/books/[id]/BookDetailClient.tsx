'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Book, Loan, Comment } from '@/types'
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
        <button key={i} type="button" onClick={() => onChange(i)} className="text-[20px] leading-none">
          <span className={i <= value ? 'text-yellow-400' : 'text-[#D1D5DB]'}>★</span>
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="text-[13px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'text-yellow-400' : 'text-[#D1D5DB]'}>★</span>
      ))}
    </span>
  )
}

export default function BookDetailClient({ book, loanHistory, comments, myActiveLoanId, canBorrow }: Props) {
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
      const res = await fetch(`/api/loans/${myActiveLoanId}`, { method: 'PATCH' })
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
  const SPINE_COLORS = ['#1A73E8', '#34A853', '#EA4335', '#FBBC04', '#6B2D8B', '#0B5345', '#1B4F72']
  const defaultColor = SPINE_COLORS[book.title.charCodeAt(0) % SPINE_COLORS.length]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* 戻るリンク */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#1A73E8] transition-colors"
      >
        ‹ 本棚に戻る
      </Link>

      {/* 書籍カード */}
      <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5">
        <div className="flex gap-5">
          {/* 書影 */}
          <div className="flex-shrink-0">
            {book.cover_url ? (
              <div className="relative w-28 h-40 rounded-lg shadow-md overflow-hidden">
                <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="112px" />
              </div>
            ) : (
              <div
                className="w-28 h-40 rounded-lg shadow-md flex items-center justify-center px-2"
                style={{ backgroundColor: book.spine_color ?? defaultColor }}
              >
                <span
                  className="text-white text-[11px] text-center font-medium leading-tight"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {book.title}
                </span>
              </div>
            )}
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">{book.title}</h1>
            {book.author && <p className="text-[14px] text-[#6B7280]">{book.author}</p>}
            {book.publisher && <p className="text-[12px] text-[#9CA3AF]">{book.publisher}</p>}

            {/* タグ */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {book.tags.map((t) => (
                  <span key={t.id} className="bg-[#E8F0FE] text-[#1A73E8] text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* 貸出状態バッジ */}
            <div className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full ${
              isUnavailable ? 'bg-red-50 text-[#EA4335]' : 'bg-green-50 text-[#34A853]'
            }`}>
              <span>{isUnavailable ? '🔴' : '🟢'}</span>
              {isUnavailable
                ? `貸出中（残0冊 / 全${book.total_copies}冊）`
                : `貸出可（残${book.available_copies}冊 / 全${book.total_copies}冊）`}
            </div>

            {/* 貸出中メンバー */}
            {book.active_loans && book.active_loans.length > 0 && (
              <div className="text-[12px] text-[#6B7280] space-y-0.5">
                {book.active_loans.map((loan) => (
                  <p key={loan.id}>
                    📖 {loan.user_name} — {new Date(loan.due_date).toLocaleDateString('ja-JP')} まで
                  </p>
                ))}
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-2 pt-1">
              {canBorrow && (
                <button
                  onClick={handleBorrow}
                  disabled={borrowing}
                  className="bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {borrowing ? '処理中...' : '📖 借りる'}
                </button>
              )}
              {myActiveLoanId && (
                <button
                  onClick={handleReturn}
                  disabled={returning}
                  className="bg-[#34A853] hover:bg-[#2D9249] text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {returning ? '処理中...' : '✅ 返却する'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* あらすじ */}
        {book.description && (
          <div className="mt-5 pt-4 border-t border-[#E8ECF0]">
            <p className="text-[12px] font-semibold text-[#6B7280] mb-1.5">あらすじ</p>
            <p className="text-[13px] text-[#4B5563] leading-relaxed whitespace-pre-line">{book.description}</p>
          </div>
        )}
      </div>

      {/* 貸出履歴 */}
      <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5">
        <p className="text-[14px] font-bold text-[#1A1A2E] mb-4">貸出履歴</p>
        {loanHistory.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">貸出履歴はありません</p>
        ) : (
          <div className="space-y-2">
            {loanHistory.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0 text-[12px]">
                <span className="font-medium text-[#1A1A2E]">{loan.user_name}</span>
                <span className="text-[#6B7280]">
                  {new Date(loan.borrowed_at).toLocaleDateString('ja-JP')} 〜{' '}
                  {loan.returned_at
                    ? new Date(loan.returned_at).toLocaleDateString('ja-JP')
                    : <span className="text-[#EA4335] font-semibold">返却待ち</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* コメント */}
      <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5">
        <p className="text-[14px] font-bold text-[#1A1A2E] mb-4">コメント・感想</p>

        {/* 投稿フォーム */}
        <form onSubmit={handleComment} className="bg-[#F0F4F8] rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">評価</p>
            <StarRating value={commentRating} onChange={setCommentRating} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">コメント</p>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              className="w-full border border-[#E8ECF0] rounded-xl px-3 py-2 text-[13px] text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8] resize-none"
              placeholder="感想・メモを書いてみましょう..."
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment || !commentBody.trim()}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {submittingComment ? '投稿中...' : '投稿する'}
          </button>
        </form>

        {/* コメント一覧 */}
        {comments.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">まだコメントはありません</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b border-[#F3F4F6] pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#1A1A2E]">{comment.user_name}</span>
                  {comment.rating && <StarDisplay value={comment.rating} />}
                  <span className="text-[11px] text-[#9CA3AF] ml-auto">
                    {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="text-[13px] text-[#4B5563] whitespace-pre-line">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
