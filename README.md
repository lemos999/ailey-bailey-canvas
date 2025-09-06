# Ailey & Bailey Canvas 
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
---
## 🇰🇷 한글
### 1. 개요 (Abstract)
이 문서는 Gemini 언어 모델이 Google Canvas 환경 내에서 웹 애플리케이션을 동적으로 생성하는 Ailey & Bailey Canvas 시스템의 아키텍처 설계 과정을 기록한 기술 문서입니다. 초기 버전에서 발견된 AI 응답 지연 문제를 해결하기 위해, 모든 외부 CDN 의존성을 제거하고 필요한 라이브러리를 단일 JavaScript 파일에 통합하는 '의존성 내재화 및 동적 주입' 아키텍처를 채택했습니다. 이 방식은 Google Canvas의 보안 정책(CSP)과 네트워크 제약이라는 특수한 환경 속에서 안정적인 성능을 확보하기 위한 구조적 해법입니다. 이 문서는 해당 아키텍처의 설계 배경과 기술적 의사결정 과정을 기록하고자 합니다.

### 2. 문제의 시작: 왜 새로운 아키텍처가 필요했는가?
Ailey & Bailey Canvas의 초기 아키텍처는 AI가 매번 완전한 HTML, CSS, JavaScript 코드를 생성하여 Canvas에 전달하는 직관적인 구조였습니다. 하지만 기능이 복잡해지면서 AI가 생성하는 코드의 양이 늘어났고, 이는 응답 속도 저하 문제로 이어졌습니다.
더 근본적인 제약은 Google Canvas의 실행 환경이었습니다. Canvas는 보안 정책(CSP)에 따라 신뢰하지 않는 외부 소스에서의 스크립트 로딩을 차단합니다. 이로 인해 Firebase와 같은 핵심 라이브러리를 CDN을 통해 로드할 때 타임아웃 오류가 발생했고, 이는 시스템 안정성을 확보하기 어렵게 만들었습니다.
따라서 우리는 기존 구조를 재검토하고, "주어진 Canvas 환경 제약 내에서 어떻게 하면 더 빠르고 안정적으로 애플리케이션을 구동할 수 있을까?" 라는 근본적인 질문에서부터 설계를 다시 시작했습니다.

### 3. 작동 원리
이 시스템의 아키텍처는 두 가지 주체의 역할을 기반으로 합니다.
1.  AI (Gemini): 사용자의 요구를 해석하여, 그에 맞는 '콘텐츠'와 '실행 명령'을 생성하는 설계자의 역할을 합니다.
2.  클라이언트 (Client): 사용자의 브라우저에서 실행되며, 미리 정의된 UI '뼈대(Shell)'를 가지고 있다가 AI의 명령에 따라 콘텐츠를 조립하여 결과물을 만드는 시공자의 역할을 합니다. 이 시공자의 모든 도구는 `bundle/main.js`와 `bundle/main.css` 파일 안에 내장되어 있습니다.
이전처럼 AI가 매번 집 전체(Full HTML)를 짓는 대신, 새로운 아키텍처에서는 "이 콘텐츠('dynamicContent')를 가지고, 약속된 설계도(`renderAppShell` 함수)에 따라 집을 완성하라" 는 가벼운 명령서(Loader Script)만 보냅니다. 실제 구현은 클라이언트가 전담하는 방식입니다.

### 4. 아키텍처 설계 결정
이러한 원칙 아래, 두 가지 기술적 결정을 내렸습니다.

#### 결정 1: 역할의 분리 - 동적 주입 (Dynamic Injection)
*   문제 인식: AI가 반복적인 UI 뼈대 코드를 매번 생성하는 것은 비효율적인 구조였습니다.
*   해결책: UI 뼈대는 클라이언트의 `bundle/main.js`에 템플릿 형태로 한 번만 내장시켰습니다. AI는 이제 핵심 '콘텐츠'만 생성하여 전달하고, 클라이언트는 이 콘텐츠를 템플릿의 지정된 위치(`ai-content-placeholder`)에 주입하여 UI를 완성합니다.
*   결과: 결과적으로 AI가 생성하는 데이터의 양이 크게 줄었고, 이는 응답 시간 단축으로 이어졌습니다.
*   
#### 결정 2: 자원의 통합 - 의존성 내재화 및 번들링 (Total Internalization & Bundling)
*   문제 인식: Google Canvas의 보안 정책으로 인한 CDN 로딩 실패는 안정성 문제의 주된 원인이었습니다.
*   해결책: "외부에 의존하지 않는다" 라는 원칙을 세웠습니다. Firebase, ToastUI Editor 등 구동에 필요한 모든 라이브러리를 로컬에 저장하고, `bundler.js`를 통해 애플리케이션 코드와 함께 단일 파일(`main.js`, `main.css`)로 결합(Bundling)했습니다.
*   결과: 이 방식은 Canvas 환경의 제약을 극복하고 일관된 로딩 성능을 확보하기 위한 현실적인 해결책이었습니다. 브라우저는 단 두 번의 요청만으로 전체 애플리케이션을 로드할 수 있게 되었고, 이는 외부 환경 변화에 영향을 받지 않는 안정적인 구조를 의미합니다.
*   
### 5. 결론: 새로운 표준 아키텍처
이 과정을 통해 확립된 '의존성 내재화 및 동적 주입' 아키텍처는 Ailey & Bailey Canvas의 새로운 표준이 되었습니다.
*   성능 (Performance): AI의 작업량을 줄이고 클라이언트 렌더링을 최적화했습니다.
*   안정성 (Stability): 외부 네트워크 의존성을 제거하여 안정적인 동작을 확보했습니다.
*   단순성 (Simplicity): `bundle/` 디렉토리만 배포하면 되므로 과정이 단순해집니다.
*   
### 6. 레포지토리 구조
```
/ (Root)
├── bundle/
│   ├── main.js      # 모든 JavaScript 라이브러리와 앱 소스코드가 포함된 최종 번들
│   └── main.css     # 모든 CSS 스타일이 포함된 최종 번들
│├── .gitignore       # Git 추적 제외 설정
├── LICENSE          # Apache 2.0 라이선스
└── README.md        # 본 문서
```
### 7. 사용법 (Usage)
이 프로젝트는 Google Gemini와 Canvas 툴을 통해 실행됩니다.
1.  프롬프트 로드: `prompt.txt(Ailey & Bailey X_xxxxxx(Stable).txt)` 파일의 내용 전체를 복사합니다.
2.  Gemini 활성화: [Google Gemini](https://gemini.google.com/)에서 새 채팅을 시작하고, 복사한 프롬프트를 붙여넣습니다. 이는 AI를 'Ailey & Bailey' 모드로 설정합니다.
3.  Canvas에서 실행: Gemini 인터페이스에서 Google Canvas 툴을 활성화하고, `.cc`와 같은 명령어를 통해 애플리케이션과 상호작용합니다.
### 8. 라이선스 (License)
이 프로젝트는 Apache License 2.0에 따라 라이선스가 부여됩니다. 자세한 내용은 `LICENSE` 파일을 참고하십시오.

---

## 🇺🇸 English

### 1. Abstract

This document records the architectural design process for the Ailey & Bailey Canvas system, where a Gemini language model dynamically generates web applications within the Google Canvas environment. To resolve response delays found in the initial version, we adopted a "Dependency Internalization and Dynamic Injection" architecture. This approach removes all external CDN dependencies, bundling required libraries into a single JavaScript file. This was a structural solution to secure stable performance within the unique constraints of the Google Canvas environment, such as its security policies (CSP) and network limitations. This document aims to record the design background and technical decision-making process behind this architecture.

### 2. The Starting Point: Why a New Architecture?

The initial architecture of Ailey & Bailey Canvas was straightforward: the AI generated complete HTML, CSS, and JavaScript code for each request. As application functionality grew, so did the amount of generated code, which led to response time issues.

A more fundamental constraint was the Google Canvas execution environment. Its Content Security Policy (CSP) blocks script loading from untrusted external sources. This caused timeout errors when attempting to load core libraries like Firebase via CDN, making it difficult to ensure system stability.

We therefore decided to rethink the structure, starting from a fundamental question: "Given the constraints of the Canvas environment, what is the most efficient and stable way to run our application?"

### 3. How It Works

The architecture is based on the roles of two key components:

1.  The Architect (AI/Gemini): Interprets user requirements and generates the "content" and "execution commands."
2.  The Builder (Client): Executes in the user's browser. It holds a pre-defined UI "shell" and assembles the content into the final product based on the AI's commands. All the Builder's tools are embedded within the `bundle/main.js` and `bundle/main.css` files.

Instead of the AI constructing the entire application (Full HTML) each time, the new model has the AI send a lightweight instruction (Loader Script) that says, "Take this content ('dynamicContent') and complete the application according to the blueprint (`renderAppShell` function)." The client is responsible for the actual implementation.

### 4. Architectural Decisions

Based on this principle, we made two key technical decisions.

#### Decision 1: Separation of Concerns via Dynamic Injection

*   Problem: The AI repeatedly generating the same UI shell code was an inefficient structure.
*   Solution: The UI shell was embedded as a template once within the client-side `bundle/main.js`. The AI now only generates the core "content," and the client injects this content into a designated placeholder (`ai-content-placeholder`) to complete the UI.
*   Result: The amount of data generated by the AI was significantly reduced, which in turn led to shorter response times.

#### Decision 2: Consolidation of Resources via Dependency Internalization & Bundling

*   Problem: Failures in loading libraries from CDNs due to the Canvas security policy were a primary cause of stability issues.
*   Solution: We adopted the principle of "no external dependencies." All required libraries (Firebase, ToastUI Editor, etc.) were saved locally and consolidated (bundled) with the application source code into single files (`main.js`, `main.css`) using a `bundler.js` script.
*   Result: This approach was a practical solution for overcoming the environment's constraints and ensuring consistent loading performance. The browser can load the entire application with just two network requests, creating a stable structure unaffected by external factors.

### 5. Conclusion: The New Standard Architecture

The "Dependency Internalization and Dynamic Injection" architecture established through this process has become the new standard for the project.

*   Performance: Reduced AI workload and optimized client-side rendering.
*   Stability: Secured stable operation by eliminating external network dependencies.
*   Simplicity: The deployment process is simplified, as it only requires the `bundle/` directory.

### 6. Repository Structure
