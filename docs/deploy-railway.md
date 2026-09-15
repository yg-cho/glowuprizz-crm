# Railway 배포

서비스 4개. 각 서비스는 자동 발급 도메인(`*.up.railway.app`)을 받아 서로 다른 origin 이 된다 (ADR-0006).

## 실제 배포 절차 (CLI, 2026-09-14 수행)

```bash
brew install railway            # 또는 npm i -g @railway/cli
railway login
railway init --name glowuprizz-crm
railway add --database postgres

# 서비스 3개: GitHub 레포, 루트 디렉토리 /, Dockerfile 경로는 변수로 지정
railway add --service api   --repo yg-cho/glowuprizz-crm --branch main \
  --variables RAILWAY_DOCKERFILE_PATH=docker/api.Dockerfile   --variables NODE_ENV=production
railway add --service forms --repo yg-cho/glowuprizz-crm --branch main \
  --variables RAILWAY_DOCKERFILE_PATH=docker/forms.Dockerfile --variables NODE_ENV=production
railway add --service web   --repo yg-cho/glowuprizz-crm --branch main \
  --variables RAILWAY_DOCKERFILE_PATH=docker/web.Dockerfile   --variables NODE_ENV=production

# 공개 도메인
railway domain --service api
railway domain --service forms
railway domain --service web
```

도메인이 나오면 환경변수 설정:

```bash
railway variables --service api \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set "JWT_SECRET=$(openssl rand -hex 32)" \
  --set PORT=3001 \
  --set WEB_ORIGIN=https://<web 도메인> \
  --set FORMS_PUBLIC_ORIGIN=https://<forms 도메인> \
  --set SEED_OPERATOR_EMAIL=<운영자 이메일> \
  --set SEED_OPERATOR_PASSWORD=<운영자 비밀번호>

railway variables --service forms \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set "IP_HASH_SALT=$(openssl rand -hex 16)" \
  --set PORT=3002

railway variables --service web \
  --set PORT=3000 \
  --set API_INTERNAL_URL=http://api.railway.internal:3001 \
  --set NEXT_PUBLIC_API_URL=https://<api 도메인>
```

## 배포 트리거
GitHub 앱 연동이 없으면 push 로 빌드가 시작되지 않는다. 그 경우 로컬에서 직접 업로드한다 (`.gitignore` 기준으로 제외):
```bash
railway up --service api --detach
railway up --service forms --detach
railway up --service web --detach
railway status
```

## 마이그레이션·시드
별도 명령 없음. `api` 컨테이너가 기동할 때 `prisma migrate deploy` → 운영자 upsert(`SEED_OPERATOR_*` 있을 때만) → 서버 시작 순으로 실행한다 (`docker/api.Dockerfile` CMD). Postgres 는 공개 TCP 프록시 없이 private network 만 사용한다.

## 확인
- `https://<forms 도메인>/healthz` → `{"ok":true}`
- `https://<api 도메인>/docs`, `https://<forms 도메인>/docs` Swagger
- `https://<web 도메인>/login` 로그인 → 템플릿 업로드 → 링크 발급 → 링크 URL 이 forms 도메인인지 확인
- 브라우저 devtools 에서 forms 도메인 쿠키에 `gu_admin` 이 없는지 확인

## 현재 배포
| 서비스 | URL |
|---|---|
| web (관리자) | https://web-production-4d66a.up.railway.app |
| api (Swagger) | https://api-production-fd80.up.railway.app/docs |
| forms (공개 폼) | https://forms-production-7e88.up.railway.app |
