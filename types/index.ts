export type Role = 'admin' | 'member'

export type Book = {
  id: string
  title: string
  author: string | null
  isbn: string | null
  asin: string | null
  publisher: string | null
  published_at: string | null
  description: string | null
  cover_url: string | null
  spine_color: string | null
  total_copies: number
  created_at: string
  tags?: Tag[]
  available_copies?: number
  active_loans?: Loan[]
}

export type Tag = {
  id: string
  name: string
}

export type Loan = {
  id: string
  book_id: string
  user_id: string
  borrowed_at: string
  due_date: string
  returned_at: string | null
  created_at: string
  user_name?: string
  user_email?: string
  book?: Book
}

export type Comment = {
  id: string
  book_id: string
  user_id: string
  loan_id: string | null
  body: string
  rating: number | null
  created_at: string
  user_name?: string
}

export type Profile = {
  user_id: string
  role: Role
  name: string | null
  email: string | null
  avatar: string | null
}
