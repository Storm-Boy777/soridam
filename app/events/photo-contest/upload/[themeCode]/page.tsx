import { notFound } from 'next/navigation'
import PhotoContestThemeUploadClient from './PhotoContestThemeUploadClient'
import type { ThemeCode } from '@/lib/api/photo-contest'

const VALID_THEME_CODES = new Set(['bamboo', 'jump', 'angel', 'star', 'smart_city'])

interface ThemeUploadPageProps {
  params: Promise<{
    themeCode: string
  }>
}

export default async function ThemeUploadPage({ params }: ThemeUploadPageProps) {
  const { themeCode } = await params

  if (!VALID_THEME_CODES.has(themeCode)) {
    notFound()
  }

  return <PhotoContestThemeUploadClient themeCode={themeCode as ThemeCode} />
}
