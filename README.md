# Fitting Room · AI 옷장

날씨에 맞춰 내 옷장에서 코디를 추천해주는 웹앱입니다. 폰에서 "홈 화면에 추가"하면 앱처럼 설치돼요.

## 폴더 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 전체 (화면, 코디 추천, 사진 배경 제거, 전신 사진에서 옷 추출) |
| `api/ai.js` | AI 기능용 서버 함수. Claude API를 대신 호출해요 (API 키를 브라우저에 노출하지 않기 위해) |
| `api/image.js` | 전신 사진 속 옷을 쇼핑몰 상품 사진처럼 새로 그려주는 서버 함수 (OpenAI 이미지 API) |
| `manifest.webmanifest`, `sw.js`, `icons/` | 홈 화면 설치(PWA)용 설정, 오프라인 캐시, 앱 아이콘 |
| `samples/samples.json` | 처음 실행할 때 옷장에 넣어주는 기본 옷 28벌 |
| `vercel.json` | Vercel 배포 설정 |

## 데이터는 어디에 저장되나요?

- 옷, OOTD 기록은 **각자의 기기(브라우저)** 에 저장돼요 (IndexedDB). 서버에 올라가지 않아요.
- 그래서 사람마다, 기기마다 옷장이 따로예요. 브라우저 데이터를 지우면 옷장도 지워져요.
- 날씨는 [Open-Meteo](https://open-meteo.com) 에서 무료로 받아와요 (키 필요 없음). 위치 권한을 허용하면 현재 위치, 아니면 서울 기준이에요.

## 배포하기 (Vercel, 무료)

1. [github.com](https://github.com) 에서 새 저장소(repository)를 만들고 이 폴더의 파일을 전부 올려요.
   웹에서 "Add file → Upload files"로 폴더째 끌어다 놓으면 돼요.
2. [vercel.com](https://vercel.com) 에 GitHub 계정으로 가입 → **Add New → Project** → 방금 만든 저장소를 **Import** → 설정은 그대로 두고 **Deploy**.
3. 1분쯤 뒤 `https://프로젝트이름.vercel.app` 주소가 생겨요. 이 주소가 앱 주소예요.

이 상태로도 옷장, 코디 추천, 날씨, 사진 배경 제거, 드래그로 옷 잘라내기는 모두 돼요. AI 기능만 꺼져 있어요.

### AI 기능 켜기 (선택, 사용량만큼 요금 발생)

AI 기능: 사진 보고 옷 정보 채우기, 전신 사진에서 옷 자동으로 찾기, AI 스타일리스트.

1. [console.anthropic.com](https://console.anthropic.com) 에서 가입하고 결제 수단을 등록한 뒤 **API Keys → Create Key** 로 키를 만들어요.
   **Limits** 메뉴에서 월 사용 한도(예: 5달러)를 꼭 걸어두세요.
2. Vercel 프로젝트 → **Settings → Environment Variables** 에 추가:
   - `ANTHROPIC_API_KEY` = 방금 만든 키 (필수)
   - `APP_CODE` = 아무 비밀 코드, 예: `closet2026` (권장. 설정하면 이 코드를 아는 사람만 AI를 쓸 수 있어요. 앱에서 처음 AI를 누를 때 한 번 물어봐요)
   - `ANTHROPIC_MODEL` = 쓸 모델 (선택, 기본값 `claude-sonnet-5`. 더 싸게 쓰려면 `claude-haiku-4-5-20251001`)
3. **Deployments** 탭에서 최신 배포의 **⋯ → Redeploy** 를 눌러 적용해요.

> 키는 절대 `index.html`이나 GitHub에 직접 적지 마세요. 환경 변수에만 넣어야 안전해요.

### 전신 사진 → 상품 이미지 만들기 켜기 (선택, 장당 요금 발생)

옷 추가에서 카테고리(예: 아우터)를 고르고 입고 찍은 사진을 올리면, 그 옷만 쇼핑몰 상품 사진처럼 새로 그려줘요.
이미지를 새로 그리는 건 Claude가 할 수 없어서 OpenAI 이미지 API를 써요.

1. [platform.openai.com](https://platform.openai.com) 에서 가입하고 결제 수단 등록 → **API keys → Create new secret key**.
   **Limits** 에서 월 사용 한도를 꼭 걸어두세요. 요금은 [OpenAI 가격 페이지](https://openai.com/api/pricing/) 의 이미지 모델 항목에서 확인하세요.
   이미지 모델은 조직 인증(Verify organization)을 먼저 요구할 수 있어요.
2. Vercel → **Settings → Environment Variables** 에 추가:
   - `OPENAI_API_KEY` = 방금 만든 키 (필수)
   - `OPENAI_IMAGE_MODEL` = 쓸 이미지 모델 (선택, 기본값 `gpt-image-2`. 오류가 나면 OpenAI 문서의 최신 이미지 모델 이름으로 바꿔요)
   - `IMAGE_QUALITY` = `low` / `medium` / `high` (선택, 기본 `medium`. `low`가 가장 싸고 빨라요)
3. **Redeploy**.

키를 넣지 않으면 예전처럼 사진 위를 드래그해서 그 부분만 잘라내는 방식으로 동작해요.
AI가 새로 그린 그림이라 로고, 단추 개수 같은 세부가 실제 옷과 조금 다를 수 있어요.

## 폰에 설치하기

- **아이폰 (Safari):** 앱 주소 열기 → 아래 공유 버튼 → **홈 화면에 추가**
- **안드로이드 (Chrome):** 앱 주소 열기 → 오른쪽 위 ⋮ → **앱 설치** (또는 홈 화면에 추가)

설치하면 주소창 없이 전체 화면 앱으로 열리고, 인터넷이 잠깐 끊겨도 옷장은 열려요.

## 수정 후 다시 배포

GitHub 저장소의 파일을 고치면 Vercel이 자동으로 다시 배포해요. 설치한 앱은 다음에 열 때 새 버전으로 바뀌어요.
