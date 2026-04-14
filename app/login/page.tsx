import { signIn } from '@/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-[#E8ECF0] p-10 w-full max-w-sm text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl">📚</div>
          <h1 className="text-[22px] font-bold text-[#1A1A2E] tracking-tight">ホンダナ</h1>
          <p className="text-[13px] text-[#6B7280]">社内図書管理システム</p>
        </div>

        <div className="h-px bg-[#E8ECF0]" />

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#E8ECF0] hover:bg-[#F0F4F8] text-[#1A1A2E] font-semibold py-3 px-5 rounded-2xl transition-colors shadow-sm text-[14px]"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Googleでログイン
          </button>
        </form>

        <p className="text-[11px] text-[#9CA3AF]">フロンティアのGoogleアカウントでログインしてください</p>
      </div>
    </div>
  )
}
