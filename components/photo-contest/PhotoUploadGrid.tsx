'use client'

import { useRef, useState, type DragEvent } from 'react'

// LocalEntry 타입 — PhotoUploadGrid 내부에서 사용하는 필드만 선언 (인라인 정의)
export interface LocalEntry {
  partNumber: number
  teamName: string
  previewUrl: string | null
  isUploaded: boolean
  isUploading: boolean
}

interface PhotoUploadGridProps {
  entries: LocalEntry[]
  onFileSelect: (partNumber: number, file: File) => void
  onFileRemove: (partNumber: number) => void
  onTeamNameChange: (partNumber: number, name: string) => void
  onPhotoClick?: (partNumber: number) => void
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function PhotoUploadGrid({
  entries,
  onFileSelect,
  onFileRemove,
  onTeamNameChange,
  onPhotoClick,
}: PhotoUploadGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
      {entries.map(entry => (
        <UploadCard
          key={entry.partNumber}
          entry={entry}
          onFileSelect={onFileSelect}
          onFileRemove={onFileRemove}
          onTeamNameChange={onTeamNameChange}
          onPhotoClick={onPhotoClick}
        />
      ))}
    </div>
  )
}

function UploadCard({
  entry,
  onFileSelect,
  onFileRemove,
  onTeamNameChange,
  onPhotoClick,
}: {
  entry: LocalEntry
  onFileSelect: (partNumber: number, file: File) => void
  onFileRemove: (partNumber: number) => void
  onTeamNameChange: (partNumber: number, name: string) => void
  onPhotoClick?: (partNumber: number) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const validateAndSelect = (file: File) => {
    setFileError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('JPG, PNG, WebP만 가능')
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('10MB 이하만 가능')
      return
    }
    onFileSelect(entry.partNumber, file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSelect(file)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-white/70 backdrop-blur border border-white/40 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 파트 번호 + 팀명 */}
      <div className="px-2.5 pt-2.5 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-5 h-5 sm:w-7 sm:h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md sm:rounded-lg flex items-center justify-center text-white text-[10px] sm:text-xs font-bold flex-shrink-0">
            {entry.partNumber}
          </span>
          <input
            type="text"
            value={entry.teamName}
            onChange={e => onTeamNameChange(entry.partNumber, e.target.value)}
            className="flex-1 text-xs sm:text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-400 outline-none py-0.5 sm:py-1 transition-colors truncate min-w-0"
            placeholder="팀/파트명"
          />
        </div>
      </div>

      {/* 사진 영역 */}
      <div className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
        {entry.previewUrl ? (
          <div className="relative group aspect-square sm:aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden">
            <img
              src={entry.previewUrl}
              alt={entry.teamName}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onPhotoClick?.(entry.partNumber)}
            />
            {entry.isUploaded && (
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-green-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                완료
              </div>
            )}
            {entry.isUploading && (
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-blue-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full animate-pulse">
                업로드 중
              </div>
            )}
            {/* 삭제 버튼 - 모바일: 항상 표시 / 데스크톱: 호버 */}
            <button
              onClick={() => onFileRemove(entry.partNumber)}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-black/40 sm:bg-white/90 sm:opacity-0 sm:group-hover:opacity-100 text-white sm:text-gray-700 rounded-full p-1 sm:p-1.5 shadow-lg transition-all"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`aspect-square sm:aspect-[4/3] rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
            }`}
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[10px] sm:text-xs text-gray-400">
              {isDragOver ? '놓으세요' : '클릭/드래그'}
            </p>
          </div>
        )}

        {fileError && (
          <p className="text-[10px] sm:text-xs text-red-500 mt-1">{fileError}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
