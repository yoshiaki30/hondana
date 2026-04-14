'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

type Props = {
  userName: string
  userImage?: string | null
  role?: string
  backHref?: string
}

function UserMenuDropdown({ userName, userImage }: { userName: string; userImage?: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative flex items-center gap-2.5">
      <span className="text-[14px] text-[#6B7280] hidden sm:inline">{userName}</span>
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus:outline-none rounded-full"
        aria-label="ユーザーメニュー"
      >
        {userImage ? (
          <img
            src={userImage}
            alt={userName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0 hover:ring-2 hover:ring-[#1A73E8] transition"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#E8F0FE] flex items-center justify-center font-bold text-[#1A73E8] flex-shrink-0 hover:ring-2 hover:ring-[#1A73E8] transition">
            {userName?.[0] ?? '?'}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-44 bg-white rounded-2xl shadow-lg border border-[#E8ECF0] py-1 z-50">
          <div className="px-4 py-2.5 border-b border-[#E8ECF0]">
            <p className="text-xs font-semibold text-[#1A1A2E] truncate">{userName}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-b-2xl flex items-center gap-2"
          >
            <span>🚪</span>
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppHeader({ userName, userImage, role, backHref }: Props) {
  return (
    <header className="bg-white border-b border-[#E8ECF0] h-16 px-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2.5">
        {backHref && (
          <Link
            href={backHref}
            className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A73E8] hover:bg-[#E8F0FE] rounded-xl transition-colors text-[18px] font-bold flex-shrink-0"
          >
            ‹
          </Link>
        )}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[20px]">📚</span>
          <span className="text-[17px] font-bold text-[#1A1A2E] tracking-tight">ホンダナ</span>
        </Link>
        {role === 'admin' && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            管理者
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {role === 'admin' && (
          <>
            <Link
              href="/admin/books/new"
              className="text-[13px] font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] px-3 py-1.5 rounded-xl transition-colors hidden sm:inline-flex items-center gap-1"
            >
              ＋ 本を登録
            </Link>
            <Link
              href="/admin/loans"
              className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1A2E] hidden sm:inline"
            >
              貸出管理
            </Link>
            <Link
              href="/admin/users"
              className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1A2E] hidden sm:inline"
            >
              ユーザー管理
            </Link>
            <Link
              href="/admin/import"
              className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1A2E] hidden sm:inline"
            >
              一括インポート
            </Link>
          </>
        )}
        <UserMenuDropdown userName={userName} userImage={userImage} />
      </div>
    </header>
  )
}
