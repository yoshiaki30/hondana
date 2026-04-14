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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">📋 貸出管理</h1>

      {loans.length === 0 ? (
        <p className="text-gray-500 text-sm">現在貸出中の本はありません</p>
      ) : (
        <div className="space-y-2">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                loan.is_overdue
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="space-y-0.5">
                <p className="font-semibold text-sm">{loan.book_title}</p>
                <p className="text-xs text-gray-500">
                  {loan.user_name} • {formatDate(loan.borrowed_at)} 〜 返却期限:{' '}
                  <span className={loan.is_overdue ? 'text-red-600 font-bold' : ''}>
                    {formatDate(loan.due_date)}
                  </span>
                  {loan.is_overdue && ' ⚠️ 期限超過'}
                </p>
              </div>
              <button
                onClick={() => handleReturn(loan.id)}
                disabled={returning === loan.id}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
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
