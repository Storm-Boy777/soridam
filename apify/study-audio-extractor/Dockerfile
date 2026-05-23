# 소리담 월요일 스터디 — YouTube 대화 구간 오디오 추출 Actor
# apify/actor-node 베이스 + ffmpeg + yt-dlp(정적 바이너리)
FROM apify/actor-node:20

# 시스템 패키지 설치를 위해 root로 전환 (apify/actor-node 는 Alpine 기반 → apk)
USER root

# ffmpeg(오디오 변환) + yt-dlp(pip 최신 — 봇차단 대응에 최신 버전이 유리)
#  - Alpine musl 환경이라 glibc 정적 바이너리 대신 pip 설치를 사용 (yt-dlp는 순수 Python이라 musl에서 동작)
#  - chown: root 설치 과정에서 꼬인 /usr/src/app 소유권을 myuser로 복구 (npm install EACCES 방지)
RUN apk add --no-cache ffmpeg python3 py3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp \
 && chown -R myuser:myuser /usr/src/app

# Apify 이미지 기본 유저로 복귀
USER myuser

# 의존성 먼저 설치 (Docker 레이어 캐시 최적화)
COPY --chown=myuser:myuser package*.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# 소스 복사
COPY --chown=myuser:myuser . ./

CMD ["npm", "start"]
