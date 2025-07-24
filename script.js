/*
--- Ailey & Bailey Canvas ---
File: script.js (Entry Point)
Version: 11.0 (Modular JS Architecture)
Architect: [Username] & System Architect Ailey
Description: This file now acts as the central entry point for all JavaScript modules.
             It imports functionalities from different files and orchestrates the application's initialization.
*/

import { initializeFirebase } from './modules/js/_firebase.js';
import { initializeBaseUI, setupGlobalEventListeners } from './modules/js/_uiSetup.js';
import { initializeNotesApp } from './modules/js/_notesManager.js';
import { initializeApiManager } from './modules/js/_apiManager.js';
import { initializeChat } from './modules/js/chat/_chatManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Firebase 및 데이터 리스너 초기화 (가장 먼저)
    initializeFirebase();

    // 2. 기본 UI (시계, 툴팁 등) 및 전역 이벤트 리스너 설정
    initializeBaseUI();
    setupGlobalEventListeners();

    // 3. 지식 발전소(메모) 기능 초기화
    initializeNotesApp();
    
    // 4. 개인 API 설정(BYOK) 기능 초기화
    initializeApiManager();

    // 5. AI 러닝메이트(챗봇) 기능 초기화
    initializeChat();

    console.log("Ailey & Bailey Canvas System Initialized (Modular Architecture)");
});