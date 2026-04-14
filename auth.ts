import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

// サインイン時はservice roleでRLSバイパス（関数化してビルド時初期化を防ぐ）
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      // 既存プロフィールかチェック
      const { data: existingProfile } = await getSupabaseAdmin()
        .from('profiles')
        .select('user_id')
        .eq('email', user.email)
        .single()

      if (existingProfile) {
        // 既存ユーザー: name と avatar のみ更新（roleは変えない）
        const { error } = await getSupabaseAdmin()
          .from('profiles')
          .update({
            name: user.name ?? user.email.split('@')[0],
            avatar: user.image ?? null,
          })
          .eq('email', user.email)
        if (error) console.error('[signIn] Supabase update error:', error)
      } else {
        // 新規ユーザー: 初回登録（role=member）
        const { error } = await getSupabaseAdmin().from('profiles').insert({
          user_id: user.id ?? user.email,
          email: user.email,
          name: user.name ?? user.email.split('@')[0],
          role: 'member',
          avatar: user.image ?? null,
        })
        if (error) console.error('[signIn] Supabase insert error:', error)
      }

      return true
    },

    async jwt({ token, trigger }) {
      const shouldFetch = token.email
      if (shouldFetch && token.email) {
        const { data: profile } = await getSupabaseAdmin()
          .from('profiles')
          .select('user_id, role, avatar')
          .eq('email', token.email)
          .single()

        if (profile) {
          token.userId = profile.user_id
          token.role = profile.role
          token.picture = profile.avatar ?? token.picture
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as 'member' | 'admin'
        if (token.picture) session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
