# Ailey & Bailey Canvas - Architectural Whitepaper & Deployment Guide

**[Korean](./README.md) | [English](./README.en.md)**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

## 🇰🇷 한글

### 1. 개요 (Abstract)

본 문서는 Gemini 언어 모델이 Google Canvas 샌드박스 환경 내에서 실시간으로 대화형 웹 애플리케이션을 동적으로 생성하는 **Ailey & Bailey Canvas** 시스템의 핵심 아키텍처를 상세히 기술한다. 시스템 초기 버전에서 발생했던 심각한 AI 응답 속도 저하 문제를 해결하기 위해, 본 프로젝트는 모든 외부 CDN 의존성을 제거하고 필요한 모든 라이브러리를 단일 JavaScript 파일에 통합하는 **'의존성 완전 내재화 및 동적 주입 (Total Dependency Internalization with Dynamic Injection)'** 아키텍처를 채택했다. 이 결정은 Google Canvas 환경의 엄격한 보안 정책(CSP)과 네트워크 제약 속에서 안정적인 고성능을 확보하기 위한 **불가피하고도 최적화된 선택**이었음을 논증한다. 본 문서는 해당 아키텍처의 설계 배경, 기술적 결정 과정, 그리고 최종 구조를 투명하게 기록함으로써 향후 시스템 유지보수의 근간이 될 핵심 기술 지침을 제공하는 것을 목표로 한다.

### 2. 서론: 왜 새로운 아키텍처가 필요했는가?

모든 시스템은 성장 과정에서 한계에 부딪힙니다. Ailey & Bailey Canvas의 초기 아키텍처는 AI가 매번 완전한 HTML, CSS, JavaScript 코드를 생성하여 Canvas에 전달하는 직관적인 구조였습니다. 하지만 애플리케이션의 기능이 복잡해질수록 AI가 생성하는 코드의 양은 기하급수적으로 증가했고, 이는 치명적인 **응답 속도 저하**로 이어졌습니다.

더욱 결정적인 문제는 **Google Canvas의 실행 환경** 그 자체였습니다. Canvas는 강력한 보안 정책(Content Security Policy)을 적용하여, 신뢰할 수 없는 외부 소스에서의 스크립트 로딩을 원천적으로 차단합니다. 이로 인해 Firebase와 같은 핵심 라이브러리를 CDN을 통해 로드하려는 시도는 빈번한 타임아웃 오류를 발생시키며 시스템의 안정성을 심각하게 저해했습니다.

느리고 불안정한 시스템은 사용자 경험을 해치는 가장 큰 적입니다. 따라서 우리는 기존 아키텍처를 전면 폐기하고, **"Google Canvas 환경 내에서 어떻게 하면 가장 빠르고, 가장 안정적으로 애플리케이션을 구동할 수 있는가?"** 라는 근본적인 질문에 답하기 위한 새로운 도전을 시작했습니다.

### 3. 배경지식: 핵심 작동 원리

이 시스템의 아키텍처를 이해하기 위해서는 두 가지 핵심 개념을 먼저 알아야 합니다.

1.  **구성요소 (Components):**
    *   **AI (Gemini):** 사용자의 요구사항을 해석하고, 그에 맞는 '콘텐츠'와 '실행 명령'을 생성하는 **설계자(Architect)** 역할을 합니다.
    *   **클라이언트 (Client):** 사용자의 브라우저에서 실행되며, 미리 약속된 UI의 '뼈대(Shell)'를 가지고 있다가 AI의 명령에 따라 콘텐츠를 조립하여 최종 결과물을 만들어내는 **시공자(Builder)**입니다. 이 시공자의 모든 도구와 자재는 `bundle/main.js`와 `bundle/main.css` 파일 안에 담겨 있습니다.

2.  **작동 모델: '지시 기반 렌더링 (Command-Based Rendering)'**
    초기 모델처럼 AI가 집 전체(Full HTML)를 매번 새로 짓는 방식이 아닙니다. 새로운 아키텍처에서 AI는 오직 **"이 콘텐츠('dynamicContent')를 가지고, 약속된 설계도(`renderAppShell` 함수)에 따라 집을 완성하라"** 는 가벼운 명령서(Loader Script)만 보냅니다. 실제 건축 행위는 전적으로 클라이언트의 책임입니다.

### 4. 본론: 아키텍처 설계 및 결정

이러한 배경 아래, 우리는 두 가지 핵심적인 기술적 결정을 내렸습니다.

#### **결정 1: 역할의 분리 - 동적 주입 (Dynamic Injection)**

*   **문제:** AI가 수백 줄의 반복적인 UI 뼈대 코드를 매번 생성하는 것은 극심한 비효율을 초래했습니다.
*   **해결책:** UI 뼈대는 클라이언트 측 `bundle/main.js`에 **템플릿(Template)** 형태로 단 한 번만 내장시켰습니다. AI는 이제 사용자의 요청에 따른 핵심 '콘텐츠' 데이터만 생성하여 전달합니다. 클라이언트는 이 콘텐츠를 템플릿의 지정된 위치(`ai-content-placeholder`)에 주입하여 최종 UI를 완성합니다.
*   **결과:** AI가 생성하는 텍스트의 양이 90% 이상 감소했으며, 이는 직접적으로 응답 시간 단축으로 이어졌습니다.

#### **결정 2: 자원의 통합 - 의존성 완전 내재화 및 번들링 (Total Internalization & Bundling)**

*   **문제:** Google Canvas의 보안 정책은 외부 CDN을 통한 라이브러리 로딩을 차단하여, `Firebase SDK loading timed out`과 같은 치명적인 오류를 유발했습니다. 이는 시스템의 안정성을 보장할 수 없게 만드는 근본적인 제약 조건이었습니다.
*   **해결책:** **"외부에 아무것도 의존하지 않는다"** 라는 원칙을 세웠습니다. Firebase, ToastUI Editor, KaTeX 등 애플리케이션 구동에 필요한 모든 JavaScript와 CSS 라이브러리를 로컬 `vendor/` 및 `src_css/` 폴더에 다운로드하고, `bundler.js` 스크립트를 통해 애플리케이션 소스 코드와 함께 단 하나의 `main.js`와 `main.css` 파일로 결합(Bundling)했습니다.
*   **결과:** 이 결정은 **Canvas 환경 내 고속 구동을 위한 불가피한 선택**이었습니다. 모든 실행 코드가 단일 파일에 포함되어 있으므로, 브라우저는 단 두 번의 네트워크 요청(`main.js`, `main.css`)만으로 전체 애플리케이션을 로드할 수 있습니다. 이는 외부 네트워크 상태나 예측 불가능한 보안 정책 변화에 전혀 영향을 받지 않는, **안정성과 개선된 로딩 성능**을 시스템에 부여했습니다.

### 5. 최종 결론: 새로운 표준 아키텍처

이러한 과정을 통해 확립된 **'의존성 완전 내재화 및 동적 주입'** 아키텍처는 Ailey & Bailey Canvas의 새로운 표준이 되었습니다. 이 아키텍처의 핵심적인 장점은 다음과 같습니다.

*   **성능 (Performance):** AI의 작업량을 최소화하고, 클라이언트의 렌더링 과정을 최적화하여 사용자에게 가장 빠른 경험을 제공합니다.
*   **안정성 (Stability):** 외부 네트워크 의존성을 100% 제거하여 어떤 실행 환경에서도 예측 가능하고 안정적으로 동작합니다.
*   **단순화된 배포 (Simplified Deployment):** `bundle/` 디렉토리만 배포하면 되므로, 배포 과정이 극도로 단순하고 명확해집니다.

### 6. 레포지토리 구조 및 라이선스

#### **구조 (Repository Structure)**

```
/ (Root)
├── bundle/
│   ├── main.js      # 모든 JavaScript 라이브러리와 앱 소스코드가 포함된 최종 번들
│   └── main.css     # 모든 CSS 스타일이 포함된 최종 번들
│
├── .gitignore       # 번들링 전 소스코드 및 node_modules 등을 제외하기 위한 설정
├── LICENSE          # Apache 2.0 라이선스
└── README.md        # 현재 보고 계신 이 문서
```

#### **라이선스 (License)**

이 프로젝트는 **Apache License 2.0**에 따라 라이선스가 부여됩니다. 자세한 내용은 `LICENSE` 파일을 참고하십시오.

---

## 🇺🇸 English

### 1. Abstract

This document serves as a technical whitepaper detailing the core architecture of the **Ailey & Bailey Canvas** system, in which the Gemini language model dynamically generates interactive web applications within the Google Canvas sandbox environment. To resolve the critical AI response latency issues encountered in the initial version, this project adopted the **"Total Dependency Internalization with Dynamic Injection"** architecture. This approach eliminates all external CDN dependencies by bundling every required library into a single JavaScript file. We argue that this decision was an **unavoidable and optimal choice** to ensure stable, high-speed performance under the stringent security policies (CSP) and network constraints of the Google Canvas environment. By transparently documenting the design rationale, technical decisions, and final structure, this paper aims to provide foundational technical guidance for all future system maintenance and development.

### 2. The Challenge: Why a New Architecture Was Necessary

Every system encounters limitations as it evolves. The initial architecture of Ailey & Bailey Canvas was intuitive: the AI generated complete HTML, CSS, and JavaScript code for each request and delivered it to Canvas. However, as application functionality grew, the volume of AI-generated code increased exponentially, leading to a critical degradation in **response speed**.

A more fundamental problem was the **Google Canvas execution environment** itself. Canvas enforces a strict Content Security Policy (CSP), inherently blocking script loading from untrusted external sources. Consequently, attempts to load core libraries like Firebase via CDN frequently resulted in timeout errors, severely compromising system stability.

An unstable, slow system is the greatest adversary to a positive user experience. We therefore decided to decommission the existing architecture and embark on a new challenge to answer a fundamental question: **"Within the Google Canvas environment, what is the fastest and most stable way to run our application?"**

### 3. Core Principles: How It Works

To fully grasp the architecture, one must first understand two core concepts.

1.  **Components:**
    *   **The Architect (AI/Gemini):** Interprets user requirements and generates the "content" and "execution commands."
    *   **The Builder (Client):** Executes in the user's browser. It holds a pre-defined UI "shell" and, upon receiving commands from the AI, assembles the content into the final product. All of the Builder's tools and materials are contained within the `bundle/main.js` and `bundle/main.css` files.

2.  **Operating Model: "Command-Based Rendering"**
    Unlike the initial model where the AI built an entire house (Full HTML) every time, in the new architecture, the AI only sends a lightweight instruction manual (Loader Script) that says, **"Take this content ('dynamicContent') and complete the house according to the agreed-upon blueprint (`renderAppShell` function)."** The actual construction is entirely the Client's responsibility.

### 4. The Body: Architectural Design and Decisions

Based on this background, we made two critical technical decisions.

#### **Decision 1: Separation of Concerns via Dynamic Injection**

*   **Problem:** The AI's repeated generation of hundreds of lines of identical UI shell code was grossly inefficient.
*   **Solution:** The UI shell was embedded as a **template** just once within the client-side `bundle/main.js`. The AI is now only responsible for generating the core "content" data based on the user's request. The client then injects this content into a designated location (`ai-content-placeholder`) within the template to render the final UI.
*   **Result:** The volume of text generated by the AI was reduced by over 90%, which directly translated into faster response times.

#### **Decision 2: Consolidation of Resources via Total Internalization & Bundling**

*   **Problem:** The Google Canvas security policy blocked library loading from external CDNs, causing critical errors like `Firebase SDK loading timed out`. This was a fundamental constraint that made system stability impossible to guarantee.
*   **Solution:** We established a core principle: **"Depend on nothing external."** All JavaScript and CSS libraries required to run the application—Firebase, ToastUI Editor, KaTeX, etc.—were downloaded to local `vendor/` and `src_css/` directories. A `bundler.js` script then consolidates (bundles) them, along with our application source code, into a single `main.js` and `main.css` file.
*   **Result:** This was an **unavoidable choice for achieving high-speed execution within the Canvas environment.** With all executable code contained in a single file, the browser only needs to make two network requests (`main.js`, `main.css`) to load the entire application. This grants the system **stability and loading performance**, as it is completely insulated from external network conditions or unpredictable changes in security policies.

### 5. Conclusion: The New Standard Architecture

The **"Total Dependency Internalization with Dynamic Injection"** architecture, established through this process, has become the new standard for the Ailey & Bailey Canvas. Its key advantages are:

*   **Performance:** Minimizes the AI's workload and optimizes the client-side rendering process to deliver the fastest possible user experience.
*   **Stability:** Eliminates 100% of external network dependencies, ensuring predictable and stable operation in any execution environment.
*   **Simplified Deployment:** The deployment process is extremely simple and clear, as it only requires deploying the `bundle/` directory.

### 6. Repository Structure & License

#### **Structure**

```
/ (Root)
├── bundle/
│   ├── main.js      # The final bundle containing all JS libraries and app source code
│   └── main.css     # The final bundle containing all CSS styles
│
├── .gitignore       # Configured to exclude pre-bundling source code, node_modules, etc.
├── LICENSE          # Apache 2.0 License
└── README.md        # This document
```

#### **License**

This project is licensed under the **Apache License 2.0**. For details, please see the `LICENSE` file.
```
