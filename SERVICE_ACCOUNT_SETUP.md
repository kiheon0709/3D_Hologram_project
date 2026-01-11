# Service Account 키 설정 가이드 (권장)

WIF가 Vercel에서 작동하지 않으므로, **Service Account JSON 키 방식**을 사용합니다.

---

## 🔐 1. Service Account 키 생성

### 1.1. GCP Console에서 Service Account 생성

```bash
# 1. Service Account 생성
gcloud iam service-accounts create vertex-ai-sa \
  --display-name="Vertex AI Service Account"

# 2. Vertex AI 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vertex-ai-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# 3. JSON 키 생성 및 다운로드
gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account=vertex-ai-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

또는 **GCP Console UI**에서:

1. https://console.cloud.google.com/iam-admin/serviceaccounts
2. **CREATE SERVICE ACCOUNT** 클릭
3. 이름: `vertex-ai-sa`, 설명 입력 후 **CREATE AND CONTINUE**
4. Role 선택: **Vertex AI User** 추가
5. **CONTINUE** > **DONE**
6. 생성된 Service Account 클릭
7. **KEYS** 탭 > **ADD KEY** > **Create new key**
8. **JSON** 선택 > **CREATE**
9. `vertex-ai-key.json` 파일 다운로드

---

## 📦 2. JSON 키를 Base64로 인코딩

### macOS / Linux:

```bash
base64 -i vertex-ai-key.json | tr -d '\n' > vertex-ai-key-base64.txt
```

### Windows (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("vertex-ai-key.json")) | Out-File vertex-ai-key-base64.txt
```

### 또는 온라인 도구:

https://www.base64encode.org/ (파일 업로드)

⚠️ **주의**: 생성된 Base64 문자열은 **매우 길 것입니다** (약 2300자). 이게 정상입니다!

---

## 🔧 3. Vercel 환경변수 설정

1. **Vercel Dashboard** > 프로젝트 선택
2. **Settings** > **Environment Variables**
3. 다음 환경변수 추가:

### 필수 환경변수 (1개만 추가):

```env
GOOGLE_APPLICATION_CREDENTIALS_BASE64=<복사한-base64-문자열>
```

⚠️ **주의**: 
- 전체 Base64 문자열을 복사/붙여넣기 하세요
- 줄바꿈이나 공백 없이!
- `GOOGLE_PROJECT_ID`는 선택사항 (JSON 키에 포함되어 있음)

### 선택적 환경변수:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1
```

4. **Environment**: Production, Preview, Development 모두 체크
5. **Save**

---

## 🚀 4. 재배포 및 테스트

### 4.1. 재배포

Vercel은 환경변수 변경 후 자동으로 재배포합니다.
또는 수동으로:

```bash
git commit --allow-empty -m "Test service account auth"
git push
```

### 4.2. 인증 테스트

배포 완료 후:

```bash
curl -X POST https://3dhologramproject.vercel.app/api/debug-auth
```

**✅ 예상 성공 응답:**

```json
{
  "success": true,
  "message": "✅ Google 인증 성공! Vertex AI 호출 준비 완료",
  "projectId": "your-project-id",
  "tokenPreview": "ya29.c.c0ASRK0Ga...",
  "authMethod": "Service Account JSON (Base64)",
  "envCheck": {
    "GOOGLE_PROJECT_ID": true,
    "GOOGLE_WIF_AUDIENCE": false,
    "GOOGLE_SERVICE_ACCOUNT_EMAIL": false,
    "VERCEL_OIDC_TOKEN": false,
    "AWS_WEB_IDENTITY_TOKEN_FILE": false,
    "VERCEL_URL": true
  }
}
```

---

## 🎬 5. Vertex AI Veo 테스트

인증이 성공하면 바로 Veo API를 호출할 수 있습니다:

```bash
curl -X POST https://3dhologramproject.vercel.app/api/vertex-veo \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat playing piano",
    "aspectRatio": "9:16"
  }'
```

---

## 🔒 보안 고려사항

### ✅ 안전한 방식:

- ✅ Base64로 인코딩된 키를 Vercel 환경변수에 저장
- ✅ `.gitignore`에 `*.json` 추가 (키 파일이 Git에 커밋되지 않도록)
- ✅ Service Account에 최소 권한만 부여 (`roles/aiplatform.user`)
- ✅ 키를 정기적으로 교체

### ❌ 하지 말아야 할 것:

- ❌ JSON 키를 Git 저장소에 커밋
- ❌ JSON 키를 클라이언트 사이드 코드에 포함
- ❌ 불필요하게 넓은 권한 부여 (예: `roles/owner`)

---

## 🐛 트러블슈팅

### 문제 1: "Invalid JWT" 오류

**원인**: Base64 문자열이 손상됨

**해결**:
1. Base64 인코딩을 다시 수행
2. 복사/붙여넣기 시 줄바꿈 확인
3. `tr -d '\n'` 명령어로 줄바꿈 제거 확인

---

### 문제 2: "403 Forbidden" 오류

**원인**: Service Account에 권한 없음

**해결**:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:vertex-ai-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

---

### 문제 3: JSON 파싱 오류

**원인**: Base64 디코딩 실패

**해결**:
1. 원본 JSON 키 파일이 손상되지 않았는지 확인
2. Base64 인코딩을 다시 수행
3. 온라인 Base64 디코더로 검증: https://www.base64decode.org/

---

## 📋 체크리스트

배포 전 확인사항:

- [ ] Service Account 생성 완료
- [ ] Vertex AI User 권한 부여 완료
- [ ] JSON 키 다운로드 완료
- [ ] Base64 인코딩 완료 (줄바꿈 제거됨)
- [ ] Vercel 환경변수 `GOOGLE_APPLICATION_CREDENTIALS_BASE64` 추가
- [ ] 원본 JSON 키 파일을 안전한 곳에 백업
- [ ] `.gitignore`에 `*.json` 추가됨
- [ ] Vercel 재배포 완료
- [ ] `/api/debug-auth` 테스트 성공

---

## 🎉 완료!

이제 **Vertex AI Veo API**를 사용할 준비가 완료되었습니다!

추가 질문이 있으면 `/api/debug-auth` 응답을 확인하세요.

