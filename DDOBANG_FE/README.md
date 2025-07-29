# Love Code Anyway Frontend

Love Code Anyway 프로젝트의 프론트엔드 저장소입니다.

### 필수 조건

-   Node.js (버전 18 이상 권장)
-   npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install
# 또는
yarn install
```

### 개발 서버 실행

```bash
# 개발 서버 실행
npm run dev
# 또는
yarn dev
```

## 프로젝트 구조

```
├── src/ # 소스 코드
│ ├── app/
│ │ ├── (auth)/ # 로그인, 회원가입
│ │ ├── parties/ # 모임 관련 페이지
│ │ ├── themes/ # 테마 관련 페이지
│ │ ├── my/ # 마이페이지
│ │ │ ├── profile/ # 프로필 관리
│ │ │ ├── stat/ # 통계
│ │ │ ├── history/ # 모임히스토리
│ │ │ ├── diary/ # 활동일지
│ │ │ ├── messages/ # 쪽지함
│ │ │ └── inquiry/ # 문의하기
│ │ ├── page.tsx # 메인 페이지
│ │ ├── layout.tsx # 루트 레이아웃
│ │ ├── ClientLayout.tsx # 클라이언트 레이아웃 (인증/인가 처리)
│ │ └── globals.css # 전역 스타일
│ │
│ ├── components/ # 재사용 가능한 컴포넌트
│ │ ├── common/ # 공통 컴포넌트
│ │ ├── layout/ # 레이아웃 관련 컴포넌트
│ │ ├── party/ # 모임 관련 컴포넌트
│ │ ├── theme/ # 테마 관련 컴포넌트
│ │ ├── stat/ # 통계 관련 컴포넌트
│ │ ├── history/ # 히스토리 관련 컴포넌트
│ │ ├── diary/ # 일지 관련 컴포넌트
│ │ └── my/ # 마이페이지 관련 컴포넌트
│ │
│ ├── stores/ # 상태 관리 스토어
│ │ └── auth/ # 인증 관련 상태 관리
│ │ └── loginMember.tsx # 로그인한 사용자 정보 관리
│ │
│ └── lib/ # 유틸리티 함수 및 설정
│ └── backend/ # 백엔드 API 관련 설정
│ ├── apiV1/ # API v1 엔드포인트 정의
│ │ └── schema.d.ts # OpenAPI 스키마 기반 타입 정의
│ └── client.ts # API 클라이언트 설정(openapi-typescript)
│
└── public/ # 정적 파일 (이미지, SVG 등)
```

## 주요 디렉토리 설명

-   src/stores: 전역 상태 관리 스토어
    -   `auth/`: 인증 관련 상태 관리
        -   `loginMember.tsx`: React Context를 사용한 로그인 사용자 정보 관리
            -   로그인 상태 관리
            -   사용자 프로필 정보
            -   인증 토큰 관리
    -   `useGlobalLoginMember.ts`: 로그인 사용자 정보를 전역으로 관리하는 훅
        -   로그인 상태 관리
        -   사용자 프로필 정보
        -   인증 토큰 관리
    -   컴포넌트에서 인증인가 처리시 전역 상태 관리 스토어를 사용하기 위해서는 다음과 같이 임포트해야 합니다.
        ```tsx
        import { useGlobalLoginMember } from '@/stores/auth/loginMember'
        ```
-   src/lib: 유틸리티 함수, API 클라이언트, 상수 등
    -   `backend/`: 백엔드 API 관련 설정 및 클라이언트
        -   `apiV1/`: 백엔드 apiV1.json 파일을 기반으로 openapi-typescript로 생성된 API 타입 및 엔드포인트 정의
            -   API 요청/응답 타입
            -   API 엔드포인트 상수
        -   `client.ts`: openapi-fetch 기반 API 클라이언트 설정
            -   기본 헤더 설정 (Content-Type, Authorization 등)
            -   에러 핸들링 및 인터셉터
            -   인증 토큰 자동 주입

### 환경 변수

-   `.env.local` - 로컬 환경 변수, `.env.local.default` 파일을 복사하여 사용
-   `.env.development` - 개발 환경 변수
-   `.env.production` - 프로덕션 환경 변수

개발 환경과 프로덕션 환경에 따라 `NODE_ENV`가 자동으로 설정됩니다:

-   개발: `NODE_ENV=development`
-   프로덕션: `NODE_ENV=production`
