'use client'

import dynamic from 'next/dynamic'

const PhotoContestClient = dynamic(
  () => import('./PhotoContestClient'),
  { ssr: false }
)

export default function PhotoContestPage() {
  return <PhotoContestClient />
}
