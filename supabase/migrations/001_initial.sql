-- ホンダナ (HonDana) 初期マイグレーション

-- profiles テーブル
create table if not exists profiles (
  user_id    text primary key,
  role       text not null default 'member',  -- 'admin' | 'member'
  name       text,
  email      text,
  avatar     text,
  created_at timestamptz default now()
);

-- books テーブル
create table if not exists books (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  author       text,
  isbn         text,
  asin         text,
  publisher    text,
  published_at date,
  description  text,
  cover_url    text,         -- 書影URL
  spine_color  text,         -- 書影なし時の背表紙背景色（例: #4F46E5）
  total_copies int not null default 1,  -- 所有冊数
  created_at   timestamptz default now(),
  created_by   text
);

-- tags テーブル（カテゴリ兼用）
create table if not exists tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- book_tags 中間テーブル
create table if not exists book_tags (
  book_id uuid not null references books(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

-- loans テーブル
create table if not exists loans (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id),
  user_id     text not null,
  borrowed_at timestamptz not null default now(),
  due_date    date not null,        -- 返却予定日（貸出日 + 1ヶ月）
  returned_at timestamptz,          -- 返却日時（null = 貸出中）
  created_at  timestamptz default now()
);

-- comments テーブル
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id),
  user_id     text not null,
  loan_id     uuid references loans(id),
  body        text not null,
  rating      int check (rating between 1 and 5),  -- 任意の5段階評価
  created_at  timestamptz default now()
);

-- RLS 有効化
alter table profiles  enable row level security;
alter table books     enable row level security;
alter table tags      enable row level security;
alter table book_tags enable row level security;
alter table loans     enable row level security;
alter table comments  enable row level security;

-- RLS ポリシー（service_role は全アクセス可）
create policy "service_role full access" on profiles  for all to service_role using (true) with check (true);
create policy "service_role full access" on books     for all to service_role using (true) with check (true);
create policy "service_role full access" on tags      for all to service_role using (true) with check (true);
create policy "service_role full access" on book_tags for all to service_role using (true) with check (true);
create policy "service_role full access" on loans     for all to service_role using (true) with check (true);
create policy "service_role full access" on comments  for all to service_role using (true) with check (true);
