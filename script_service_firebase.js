/*
--- Ailey & Bailey Canvas ---
File: script_service_firebase.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Firebase 서비스 자체의 초기화 및 인증 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const FirebaseService = {
        async initialize() {
            console.log("Firebase 서비스 초기화 시작...");
            try {
                // 이 변수들은 외부 HTML에 의해 주입되어야 합니다.
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                if (!firebaseConfig) { throw new Error("Firebase 설정(config)을 찾을 수 없습니다."); }
                if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

                const auth = firebase.auth();
                db = firebase.firestore(); // 전역 변수 db 설정

                if (initialAuthToken) {
                    await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
                       console.warn("커스텀 토큰 로그인 실패. 익명으로 재시도합니다.", err);
                       await auth.signInAnonymously();
                    });
                } else {
                    await auth.signInAnonymously();
                }

                currentUser = auth.currentUser; // 전역 변수 currentUser 설정
                console.log("Firebase 인증 성공. User UID:", currentUser.uid);
                return true;
            } catch (error) {
                console.error("Firebase 초기화 또는 인증 실패:", error);
                // UI에 에러 메시지를 표시하는 로직은 다른 모듈이 책임집니다.
                return false;
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Firebase = FirebaseService;

})(window);