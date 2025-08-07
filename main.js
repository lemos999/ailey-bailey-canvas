/*
--- Ailey & Bailey Canvas - JS Entry Point (Sequential Loader) ---
File: main.js
Version: 2.0 (Corrected)
Description: 모든 원자적 JS 파일을 정의된 순서대로, 하나씩 순차적으로 로드하여 실행 순서를 보장합니다.
---
*/

(async function() {
    'use strict';

    const JS_FILES_TO_LOAD = [
        // Layer 1: State
        'script_state.js',
        // Layer 2: Services
        'script_service_firebase.js',
        'script_service_api_settings.js',
        'script_service_api_openai.js',
        'script_service_api_anthropic.js',
        'script_service_api_google.js',
        // Layer 3: Data
        'script_data_notes_notes.js',
        'script_data_notes_projects.js',
        'script_data_chat_sessions.js',
        'script_data_chat_projects.js',
        // Layer 4: UI Components
        'script_ui_component_modal.js',
        'script_ui_component_panel.js',
        'script_ui_notes_view.js',
        'script_ui_notes_note_item.js',
        'script_ui_notes_project_item.js',
        'script_ui_notes_list_renderer.js',
        'script_ui_notes_context_menu.js',
        'script_ui_notes_editor.js',
        'script_ui_chat_session_item.js',
        'script_ui_chat_project_item.js',
        'script_ui_chat_sidebar_renderer.js',
        'script_ui_chat_message_renderer.js',
        'script_ui_chat_context_menu.js',
        // Layer 5: Actions
        'script_action_notes_create.js',
        'script_action_notes_project_create.js',
        'script_action_notes_open.js',
        'script_action_notes_save.js',
        'script_action_notes_rename.js',
        'script_action_notes_delete.js',
        'script_action_notes_pin.js',
        'script_action_notes_move.js',
        'script_action_notes_project_rename.js',
        'script_action_notes_backup.js',
        'script_action_chat_send_message.js',
        'script_action_chat_create.js',
        'script_action_chat_select.js',
        'script_action_chat_rename.js',
        'script_action_chat_delete.js',
        'script_action_chat_pin.js',
        'script_action_chat_move.js',
        'script_action_chat_project_create.js',
        'script_action_chat_project_rename.js',
        // Layer 6: Event Handler
        'script_event_handler.js',
        // Layer 0: Orchestrator & Entry Point
        'script_app.js',
        'script_main.js',
    ];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // defer는 비동기 로드를 유발하므로 여기서는 사용하지 않습니다.
            script.src = src;
            script.onload = () => {
                console.log(`${src} 로드 완료.`);
                resolve();
            };
            script.onerror = () => {
                console.error(`${src} 로드 실패.`);
                reject(new Error(`${src} 로드 실패`));
            };
            document.head.appendChild(script);
        });
    }

    console.log("순차적 스크립트 로더 시작...");
    for (const file of JS_FILES_TO_LOAD) {
        try {
            await loadScript(file);
        } catch (error) {
            console.error("스크립트 로딩 체인이 중단되었습니다.", error);
            break; // 오류 발생 시 중단
        }
    }
    console.log("모든 스크립트가 순차적으로 로드되었습니다.");
})();