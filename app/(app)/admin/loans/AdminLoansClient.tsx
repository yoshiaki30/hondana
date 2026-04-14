'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EnrichedLoan = {
  id: string
  book_id: string
  user_id: string
  borrowed_at: string
  due_date: string
  book_title: string
  user_name: string
  is_overdue: boolean
}

export default function AdminLoansClient({ loans }: { loans: EnrichedLoan[] }) {
  const router = useRouter()
  const [returning, setReturning] = useState<string | null>(null)

  const handleReturn = async (loanId: string) => {
    setReturning(loanId)
    try {
      await fetch(`/api/loans/${loanId}`, { method: 'PATCH' })
      router.refresh()
    } finally {
      setReturning(null)
    }
  }

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <p className="text-[17px] font-bold text-[#1A1A2E]">📋 貸出管理</p>

      {loans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0] px-5 py-10 text-center text-[#9CA3AF] text-[13px]">
          現在貸出中の本はありません
        </div>
      ) : (
        <div className="space-y-2">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 border shadow-sm ${
                loan.is_overdue
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-[#E8ECF0]'
              }`}
            >
              <div className="space-y-0.5">
                <p className="font-semibold text-[13px] text-[#1A1A2E]">{loan.book_title}</p>
                <p className="text-[11px] text-[#6B7280]">
                  {loan.user_name} • {formatDate(loan.borrowed_at)} 〜 返却期限:{' '}
                  <span className={loan.is_overdue ? 'text-[#EA4335] font-bold' : ''}>
                    {formatDate(loan.due_date)}
                  </span>
                  {loan.is_overdue && ' ⚠️ 期限超過'}
                </p>
              </div>
              <button
                onClick={() => handleReturn(loan.id)}
                disabled={returning === loan.id}
                className="bg-[#F0F4F8] hover:bg-[#E8F0FE] text-[#1A73E8] text-[12px] font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
              >
                {returning === loan.id ? '処理中...' : '返却済みにする'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
