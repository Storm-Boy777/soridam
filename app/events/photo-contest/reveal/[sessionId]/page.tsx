import PhotoContestRevealClient from './PhotoContestRevealClient'

interface PhotoContestRevealPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function PhotoContestRevealPage({ params }: PhotoContestRevealPageProps) {
  const { sessionId } = await params
  return <PhotoContestRevealClient sessionId={sessionId} />
}
