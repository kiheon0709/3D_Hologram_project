# Vercel OIDC Token 활성화 가이드

## 문제 상황
`/api/debug-auth` 호출 시:
```json
{
  "success": false,
  "message": "❌ WIF 인증 실패: VERCEL_OIDC_TOKEN",
  "envCheck": {
    "VERCEL_OIDC_TOKEN": false  // 👈 문제!
  }
}
```

---

## ✅ 해결 방법

### 방법 1: Vercel 대시보드 설정 (권장)

1. **Vercel Dashboard** 접속
   - https://vercel.com/dashboard

2. **프로젝트 선택**

3. **Settings** > **General** 탭

4. **"OIDC Token"** 섹션 찾기
   - "Enable OIDC Token for this project"
   - 또는 "Workload Identity Federation"

5. **활성화** 후 **Save**

6. **재배포** (Deployments > Redeploy)

---

### 방법 2: Vercel CLI로 확인 및 활성화

```bash
# Vercel CLI 설치 (없으면)
npm i -g vercel

# 로그인
vercel login

# 프로젝트 연결
vercel link

# 환경변수 확인
vercel env ls

# OIDC가 활성화되어 있는지 확인
vercel inspect
```

---

### 방법 3: `vercel.json` 설정 (실험적)

프로젝트 루트에 `vercel.json` 파일 생성:

```json
{
  "features": {
    "oidcToken": true
  }
}
```

⚠️ 주의: 이 방법은 Vercel의 정책에 따라 작동하지 않을 수 있습니다.

---

## 🔍 OIDC가 왜 필요한가?

**Vercel → Google Cloud WIF 인증 플로우:**

```
1. Vercel이 OIDC Token 발급 (자동)
   └─> process.env.VERCEL_OIDC_TOKEN

2. 이 토큰으로 Google STS에 접근
   └─> https://sts.googleapis.com/v1/token

3. Google이 토큰 검증 후 임시 자격증명 발급
   └─> Workload Identity Federation

4. 임시 자격증명으로 Service Account Impersonation
   └─> Vertex AI API 호출 가능
```

**OIDC 토큰이 없으면 첫 단계부터 막힙니다!**

---

## ✅ 재배포 후 확인

```bash
curl -X POST https://your-app.vercel.app/api/debug-auth
```

**예상 결과:**
```json
{
  "success": true,
  "message": "✅ WIF 인증 성공!",
  "envCheck": {
    "VERCEL_OIDC_TOKEN": true  // 👈 이제 true!
  }
}
```

---

## 🆘 여전히 안 된다면?

### 1. Vercel 플랜 확인
- **Hobby 플랜**: OIDC 제한이 있을 수 있음
- **Pro/Enterprise**: 전부 지원

### 2. Vercel Support에 문의
```
Subject: OIDC Token not provided in environment

Hi, I'm trying to use Workload Identity Federation with Google Cloud,
but VERCEL_OIDC_TOKEN is not available in my deployment environment.

Project: [your-project-name]
Team: [your-team-name]

Can you enable OIDC tokens for this project?
```

### 3. 임시 대안: Service Account JSON 키 사용
⚠️ **보안상 권장하지 않음**, 하지만 급하면:

1. GCP에서 Service Account JSON 키 다운로드
2. Base64 인코딩:
   ```bash
   base64 -i key.json
   ```
3. Vercel 환경변수에 추가:
   ```
   GOOGLE_APPLICATION_CREDENTIALS_BASE64=<base64-string>
   ```
4. 코드 수정해서 디코딩 후 사용

❌ **이 방법은 임시 테스트용!** 프로덕션에선 반드시 WIF 사용하세요.

---

## 📚 참고 자료

- [Vercel OIDC Documentation](https://vercel.com/docs/security/oidc-token)
- [Google Cloud WIF with OIDC](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers)
- [GitHub Issue: OIDC Token not available](https://github.com/vercel/vercel/discussions)

