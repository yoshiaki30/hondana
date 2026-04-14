'use client'

import { signOut, useSession } from 'next-auth/react'
import { BookOpen, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function AppHeader() {
  const { data: session } = useSession()

  return (
    <header className="bg-amber-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BookOpen className="w-6 h-6" />
          <span className="text-xl font-bold tracking-wide">ホンダナ</span>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user?.role === 'admin' && (
            <Link
              href="/admin/books/new"
              className="text-sm bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              ＋ 書籍登録
            </Link>
          )}
          {session?.user?.role === 'admin' && (
            <Link
              href="/admin/loans"
              className="text-sm hover:text-amber-200 transition-colors"
            >
              貸出管理
            </Link>
          )}

          {session?.user && (
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-sm font-bold">
                  {session.user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <span className="text-sm hidden sm:block">{session.user.name}</span>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 text-sm hover:text-amber-200 transition-colors"
            title="ログアウト"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">ログアウト</span>
          </button>
        </div>
      </div>
    </header>
  )
}
