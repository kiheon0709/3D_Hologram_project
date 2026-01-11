# Vertex AI + WIF 설정 가이드

이 문서는 **Vercel에서 Vertex AI Veo API**를 사용하기 위한 완전한 설정 가이드입니다.

---

## 📋 목차

1. [필요한 환경변수](#1-필요한-환경변수)
2. [GCP 설정 확인](#2-gcp-설정-확인)
3. [Vercel 환경변수 설정](#3-vercel-환경변수-설정)
4. [인증 테스트](#4-인증-테스트)
5. [Veo API 사용법](#5-veo-api-사용법)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. 필요한 환경변수

Vercel 대시보드에 **4개의 환경변수**를 설정해야 합니다:

| 환경변수 | 설명 | 예시 |
|---------|------|------|
| `GOOGLE_PROJECT_ID` | GCP 프로젝트 ID | `my-project-123` |
| `GOOGLE_LOCATION` | GCP 리전 (선택) | `us-central1` |
| `GOOGLE_WIF_AUDIENCE` | WIF Audience | `//iam.googleapis.com/projects/123456789/...` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account 이메일 | `vertex-ai-sa@my-project.iam.gserviceaccount.com` |

⚠️ **중요**: `VERCEL_OIDC_TOKEN`은 Vercel이 자동으로 제공하므로 설정할 필요 없습니다!

---

## 2. GCP 설정 확인

### 2.1. Workload Identity Federation (WIF) 풀 생성

```bash
# WIF 풀 생성
gcloud iam workload-identity-pools create vercel-pool \
  --location="global" \
  --display-name="Vercel Pool"

# WIF Provider 생성 (Vercel OIDC 연결)
gcloud iam workload-identity-pools providers create-oidc vercel-provider \
  --location="global" \
  --workload-identity-pool="vercel-pool" \
  --issuer-uri="https://oidc.vercel.com" \
  --allowed-audiences="//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider" \
  --attribute-mapping="google.subject=assertion.sub"
```

### 2.2. Service Account 생성 및 권한 부여

```bash
# Service Account 생성
gcloud iam service-accounts create vertex-ai-sa \
  --display-name="Vertex AI Service Account"

# Vertex AI 권한 부여
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:vertex-ai-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# WIF에서 Service Account 가장(impersonation) 허용
gcloud iam service-accounts add-iam-policy-binding vertex-ai-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/*"
```

### 2.3. Vertex AI API 활성화

```bash
gcloud services enable aiplatform.googleapis.com
```

### 2.4. Audience 값 확인

```bash
gcloud iam workload-identity-pools providers describe vercel-provider \
  --location="global" \
  --workload-identity-pool="vercel-pool" \
  --format="value(name)"
```

출력 예시:
```
projects/123456789/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider
```

👉 이 값 앞에 `//iam.googleapis.com/`을 붙여서 `GOOGLE_WIF_AUDIENCE`로 사용하세요!

---

## 3. Vercel 환경변수 설정

1. Vercel 대시보드 > **프로젝트 선택** > **Settings** > **Environment Variables**로 이동

2. 다음 4개 변수를 추가:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1
GOOGLE_WIF_AUDIENCE=//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider
GOOGLE_SERVICE_ACCOUNT_EMAIL=vertex-ai-sa@your-project-id.iam.gserviceaccount.com
```

3. **모든 환경**(Production, Preview, Development)에 체크

4. **Save** 후 재배포

---

## 4. 인증 테스트

배포 후 인증이 제대로 작동하는지 확인하세요:

### 방법 1: API 직접 호출

```bash
curl -X POST https://your-app.vercel.app/api/debug-auth
```

### 방법 2: 브라우저에서 확인

```
https://your-app.vercel.app/api/debug-auth
```

### ✅ 성공 시 응답:

```json
{
  "success": true,
  "message": "✅ WIF 인증 성공! Vertex AI 호출 준비 완료",
  "projectId": "your-project-id",
  "tokenPreview": "ya29.c.c0ASRK0Ga...",
  "envCheck": {
    "GOOGLE_PROJECT_ID": true,
    "GOOGLE_WIF_AUDIENCE": true,
    "GOOGLE_SERVICE_ACCOUNT_EMAIL": true,
    "VERCEL_OIDC_TOKEN": true
  }
}
```

### ❌ 실패 시:

`envCheck`에서 `false`인 항목을 확인하고 환경변수를 다시 설정하세요.

---

## 5. Veo API 사용법

### 5.1. 텍스트 → 비디오 생성

```typescript
const response = await fetch('/api/vertex-veo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A cat playing piano in a futuristic city',
    aspectRatio: '9:16', // 9:16, 16:9, 1:1
  }),
});

const data = await response.json();
console.log(data.data.name); // operation name
```

### 5.2. 이미지 → 비디오 생성

```typescript
const response = await fetch('/api/vertex-veo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Transform this 2D image into a 3D rotating hologram',
    imageBase64: 'base64EncodedImageString...',
    aspectRatio: '9:16',
  }),
});
```

### 5.3. Operation 상태 확인

Veo는 비동기로 작동하므로, 생성 요청 후 operation을 통해 진행 상태를 확인해야 합니다:

```typescript
// 1. 비디오 생성 요청
const createResponse = await fetch('/api/vertex-veo', {
  method: 'POST',
  body: JSON.stringify({ prompt: '...' }),
});

const { data } = await createResponse.json();
const operationName = data.name;

// 2. 상태 확인 (폴링)
const checkStatus = async () => {
  const statusResponse = await fetch(
    `/api/vertex-veo?operationName=${encodeURIComponent(operationName)}`
  );
  const statusData = await statusResponse.json();

  if (statusData.data.done) {
    console.log('✅ 비디오 생성 완료!');
    console.log('비디오 URL:', statusData.data.response.generatedSamples[0].video.uri);
  } else {
    console.log('⏳ 생성 중...');
    setTimeout(checkStatus, 5000); // 5초 후 재확인
  }
};

checkStatus();
```

---

## 6. 트러블슈팅

### 문제 1: `VERCEL_OIDC_TOKEN`이 `false`로 나옴

**원인**: Vercel 프로젝트에서 OIDC가 비활성화됨

**해결**:
1. Vercel 대시보드 > 프로젝트 > Settings > General
2. "Enable Vercel OIDC Token" 활성화
3. 재배포

---

### 문제 2: "403 Forbidden" 오류

**원인**: Service Account에 Vertex AI 권한이 없음

**해결**:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:vertex-ai-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

---

### 문제 3: "Invalid audience" 오류

**원인**: `GOOGLE_WIF_AUDIENCE` 형식이 잘못됨

**확인**:
- 형식: `//iam.googleapis.com/projects/PROJECT_NUMBER/...`
- `//`로 시작해야 함 ⚠️
- `PROJECT_NUMBER`는 숫자여야 함 (Project ID 아님!)

---

### 문제 4: "Model not found" 오류

**원인**: Veo 2 모델이 해당 리전에서 사용 불가

**해결**:
- `GOOGLE_LOCATION`을 `us-central1`로 설정
- Vertex AI > Model Garden에서 Veo 2 사용 가능 여부 확인

---

## 🎉 완료!

이제 Vercel에서 Vertex AI Veo를 사용할 준비가 완료되었습니다!

추가 질문이나 문제가 있다면 로그를 확인하세요:
- Vercel 대시보드 > Deployments > Functions 탭
- `/api/debug-auth` 응답

