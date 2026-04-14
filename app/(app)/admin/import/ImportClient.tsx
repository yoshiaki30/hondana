'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type ImportResult = {
  title?: string
  name?: string
  email?: string
  status: 'registered' | 'skipped' | 'error'
  reason?: string
}

type Summary = { registered: number; skipped: number; errors: number }

// ----- CSVテンプレート定義 -----
const BOOK_CSV_TEMPLATE = `title,author,publisher,isbn,asin,total_copies,tags,cover_url
リーダーシップの本,著者名,出版社名,978-4-XXXXX,XXXXXXXXXX,1,ビジネス|リーダー,
Clean Code,Robert C. Martin,Prentice Hall,978-0-13-235088-4,0132350882,2,技術|プログラミング,
`

const USER_CSV_TEMPLATE = `name,email,role
山田 太郎,taro.yamada@example.com,member
佐藤 花子,hanako.sato@example.com,admin
`

const BOOK_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1MkyLAKynCwRaCoN21YuuHGitFiLlqOeQgG2yQAIE6zg/edit'
const USER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_Dyt6LQCTN5Qdo870EBWrLFuE4XrX9vfIu7Fat_qMqc/edit'

function downloadCSV(content: string, filename: string) {
  const bom = '\uFEFF' // Excel対応BOM
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function UploadSection({
  title,
  icon,
  description,
  templateFilename,
  templateContent,
  endpoint,
  sheetUrl,
  onDone,
}: {
  title: string
  icon: string
  description: string
  templateFilename: string
  templateContent: string
  endpoint: string
  sheetUrl?: string
  onDone: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('CSVファイルを選択してください')
      return
    }
    setUploading(true)
    setError('')
    setResults(null)
    setSummary(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results)
      setSummary(data.summary)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8ECF0] shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[20px]">{icon}</span>
          <div>
            <p className="text-[14px] font-bold text-[#1A1A2E]">{title}</p>
            <p className="text-[12px] text-[#9CA3AF]">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#34A853] bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              📊 スプシで編集
            </a>
          )}
          <button
            onClick={() => downloadCSV(templateContent, templateFilename)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D2E3FC] px-3 py-1.5 rounded-xl transition-colors"
          >
            📥 CSVテンプレDL
          </button>
        </div>
      </div>

      {/* ドロップゾーン */}
      <div
        className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors ${
          dragging ? 'border-[#1A73E8] bg-[#E8F0FE]' : 'border-[#D1D5DB] hover:border-[#1A73E8] hover:bg-[#F8FAFC]'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        <span className="text-[28px] mb-2">{uploading ? '⏳' : '📂'}</span>
        <p className="text-[13px] font-semibold text-[#6B7280]">
          {uploading ? 'アップロード中...' : 'CSVをここにドロップ、またはクリックして選択'}
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">CSV形式 (.csv) のみ対応</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#EA4335] rounded-xl px-4 py-2.5 text-[13px]">
          {error}
        </div>
      )}

      {/* サマリー */}
      {summary && (
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-[#34A853]">{summary.registered}</p>
            <p className="text-[11px] text-[#34A853] font-medium">登録済み</p>
          </div>
          <div className="flex-1 bg-[#F0F4F8] border border-[#E8ECF0] rounded-xl px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-[#6B7280]">{summary.skipped}</p>
            <p className="text-[11px] text-[#6B7280] font-medium">スキップ</p>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-[#EA4335]">{summary.errors}</p>
            <p className="text-[11px] text-[#EA4335] font-medium">エラー</p>
          </div>
        </div>
      )}

      {/* 結果詳細 */}
      {results && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 text-[12px] ${
              r.status === 'registered' ? 'bg-green-50'
              : r.status === 'skipped' ? 'bg-[#F0F4F8]'
              : 'bg-red-50'
            }`}>
              <span className="font-medium text-[#1A1A2E] truncate max-w-[60%]">
                {r.title ?? r.name ?? r.email ?? '(不明)'}
              </span>
              <span className={`font-semibold flex-shrink-0 ${
                r.status === 'registered' ? 'text-[#34A853]'
                : r.status === 'skipped' ? 'text-[#6B7280]'
                : 'text-[#EA4335]'
              }`}>
                {r.status === 'registered' ? '✅ 登録'
                 : r.status === 'skipped' ? `⏭ スキップ${r.reason ? `（${r.reason}）` : ''}`
                 : `❌ エラー${r.reason ? `（${r.reason}）` : ''}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ImportClient() {
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#1A73E8] hover:bg-[#E8F0FE] rounded-xl transition-colors text-[18px] font-bold"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#1A1A2E]">📥 一括インポート</span>
      </div>

      {/* 説明 */}
      <div className="bg-[#E8F0FE] border border-[#1A73E8]/20 rounded-2xl px-4 py-3 text-[12px] text-[#1A73E8] space-y-1">
        <p>① テンプレートCSVをダウンロードして Googleスプレッドシートで編集</p>
        <p>② 「ファイル → ダウンロード → CSV」でエクスポート</p>
        <p>③ CSVをここにアップロード — 既登録のデータは自動スキップされます</p>
      </div>

      <UploadSection
        title="本の一括登録"
        icon="📚"
        description="title, author, publisher, isbn, asin, total_copies, tags（|区切り）, cover_url"
        templateFilename="hondana_books_template.csv"
        templateContent={BOOK_CSV_TEMPLATE}
        endpoint="/api/admin/import/books"
        sheetUrl={BOOK_SHEET_URL}
        onDone={() => router.refresh()}
      />

      <UploadSection
        title="ユーザーの一括登録"
        icon="👥"
        description="name, email, role（admin または member）"
        templateFilename="hondana_users_template.csv"
        templateContent={USER_CSV_TEMPLATE}
        endpoint="/api/admin/import/users"
        sheetUrl={USER_SHEET_URL}
        onDone={() => router.refresh()}
      />
    </div>
  )
}
