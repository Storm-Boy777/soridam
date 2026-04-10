-- ============================================================
-- 045_support.sql — 소통함 (Support Hub) 테이블
-- support_posts + support_comments + support_votes
-- ============================================================

-- ── 1. support_posts ──
CREATE TABLE support_posts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL
    CHECK (category IN ('bug','suggestion','question','refund','account','other')),
  visibility  TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','private')),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count  INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- category ↔ visibility 일관성 보장
  CONSTRAINT visibility_category_check CHECK (
    (visibility = 'public'  AND category IN ('bug','suggestion','question'))
    OR
    (visibility = 'private' AND category IN ('refund','account','other'))
  )
);

-- profiles FK (PostgREST 임베디드 쿼리용)
ALTER TABLE support_posts ADD CONSTRAINT support_posts_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_support_posts_visibility_created ON support_posts(visibility, created_at DESC);
CREATE INDEX idx_support_posts_user_id ON support_posts(user_id);
CREATE INDEX idx_support_posts_status ON support_posts(status);
CREATE INDEX idx_support_posts_category ON support_posts(category);
CREATE INDEX idx_support_posts_vote_count ON support_posts(vote_count DESC);

-- updated_at 자동 갱신 함수 (moddatetime 대체)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_support_posts_updated_at
  BEFORE UPDATE ON support_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. support_comments ──
CREATE TABLE support_comments (
  id             BIGSERIAL PRIMARY KEY,
  post_id        BIGINT NOT NULL REFERENCES support_posts(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- profiles FK (PostgREST 임베디드 쿼리용)
ALTER TABLE support_comments ADD CONSTRAINT support_comments_user_id_profiles_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_support_comments_post_id ON support_comments(post_id, created_at);

CREATE TRIGGER set_support_comments_updated_at
  BEFORE UPDATE ON support_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. support_votes ──
CREATE TABLE support_votes (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES support_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_votes_unique UNIQUE (post_id, user_id)
);

CREATE INDEX idx_support_votes_post_id ON support_votes(post_id);

-- ── 4. vote_count 동기화 트리거 ──
CREATE OR REPLACE FUNCTION update_support_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE support_posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE support_posts SET vote_count = vote_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_support_vote_count
  AFTER INSERT OR DELETE ON support_votes
  FOR EACH ROW EXECUTE FUNCTION update_support_vote_count();

-- ── 5. comment_count 동기화 트리거 ──
CREATE OR REPLACE FUNCTION update_support_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE support_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE support_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_support_comment_count
  AFTER INSERT OR DELETE ON support_comments
  FOR EACH ROW EXECUTE FUNCTION update_support_comment_count();

-- ── 6. RLS: support_posts ──
ALTER TABLE support_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: public 글은 모두, private 글은 본인+관리자
CREATE POLICY "support_posts_select" ON support_posts FOR SELECT USING (
  visibility = 'public'
  OR auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- INSERT: 인증된 사용자
CREATE POLICY "support_posts_insert" ON support_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 + 관리자
CREATE POLICY "support_posts_update" ON support_posts FOR UPDATE USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: 본인 + 관리자
CREATE POLICY "support_posts_delete" ON support_posts FOR DELETE USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ── 7. RLS: support_comments ──
ALTER TABLE support_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: 부모 post가 보이는 경우 (RLS 상속)
CREATE POLICY "support_comments_select" ON support_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_posts p WHERE p.id = support_comments.post_id)
);

-- INSERT: 인증된 사용자 + 부모 post 접근 가능
CREATE POLICY "support_comments_insert" ON support_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM support_posts p WHERE p.id = post_id)
);

-- UPDATE: 본인 + 관리자
CREATE POLICY "support_comments_update" ON support_comments FOR UPDATE USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- DELETE: 본인 + 관리자
CREATE POLICY "support_comments_delete" ON support_comments FOR DELETE USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ── 8. RLS: support_votes ──
ALTER TABLE support_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_votes_select" ON support_votes FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "support_votes_insert" ON support_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "support_votes_delete" ON support_votes FOR DELETE USING (
  auth.uid() = user_id
);
