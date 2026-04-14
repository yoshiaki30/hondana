'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserProfile = {
  user_id: string
  name: string | null
  email: string | null
  role: string
  avatar: string | null
  created_at: string
}

export default function AdminUsersClient({
  users,
  currentUserId,
}: {
  users: UserProfile[]
  currentUserId: string
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [localUsers, setLocalUsers] = useState(users)

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'ロール変更に失敗しました')
        return
      }
      setLocalUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      )
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A73E8] hover:bg-[#E8F0FE] rounded-xl transition-colors text-[18px] font-bold"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#1A1A2E]">👥 ユーザー管理</span>
      </div>

      {/* ロール説明 */}
      <div className="bg-[#E8F0FE] border border-[#1A73E8]/20 rounded-2xl px-4 py-3 text-[12px] text-[#1A73E8] space-y-0.5">
        <p><span className="font-bold">🟣 管理者（admin）</span>：本の登録・貸出管理・ユーザー管理が可能。本を借りることもできます。</p>
        <p><span className="font-bold">🔵 一般（member）</span>：本を借りることができます。</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm overflow-hidden">
        {localUsers.length === 0 ? (
          <p className="text-center text-[#9CA3AF] text-[13px] py-10">ユーザーがいません</p>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {localUsers.map((user) => (
              <li key={user.user_id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {/* アバター */}
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt={user.name ?? ''}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#E8F0FE] flex items-center justify-center font-bold text-[#1A73E8] text-[14px]">
                      {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A2E]">
                      {user.name ?? '(名前なし)'}
                      {user.user_id === currentUserId && (
                        <span className="ml-1.5 text-[10px] bg-[#F0F4F8] text-[#6B7280] px-1.5 py-0.5 rounded-full">あなた</span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">{user.email}</p>
                  </div>
                </div>

                {/* ロール切り替え */}
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-[#E8F0FE] text-[#1A73E8]'
                  }`}>
                    {user.role === 'admin' ? '管理者' : '一般'}
                  </span>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value as 'admin' | 'member')}
                    disabled={updating === user.user_id}
                    className="text-[12px] border border-[#E8ECF0] rounded-xl px-2 py-1.5 bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] disabled:opacity-50"
                  >
                    <option value="member">一般</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
