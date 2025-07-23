// [1/3] 핵심 모듈 임포트
import { initializeFirebase } from './core/firebase.js';
import { initializeUtils } from './core/utils.js';
import { initializeTheme } from './ui/theme.js';
import { initializeNavigator } from './ui/navigator.js';

// [2/3] 기능 모듈 임포트 (다음 단계에서 채울 파일들)
import { initializeNotesApp } from './features/notes/notes.js';
import { initializeChat } from './features/chat/chat.js';
import { initializeQuiz } from './features/quiz/quiz.js';
import { initializeApiSettings } from './features/apiSettings/apiSettings.js';

// [3/3] DOM 로드 후 모든 모듈 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 순서는 중요. 의존성이 있는 모듈부터 초기화.
    
    // 코어 & 기본 UI 초기화
    initializeFirebase().then(() => {
        // Firebase 초기화가 완료된 후 실행되어야 하는 로직들
        initializeNavigator();
        initializeChat(); // 채팅은 Firebase 데이터에 의존하므로 여기서 호출
        initializeNotesApp(); // 노트도 동일
    });

    initializeUtils();
    initializeTheme();
    initializeQuiz();
    initializeApiSettings();

    console.log("Ailey & Bailey Canvas: All modules loaded successfully. ??");
});
