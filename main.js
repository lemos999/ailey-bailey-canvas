/*
--- Ailey & Bailey Canvas - JS Entry Point ---
File: main.js
Description: 모든 원자적 JS 파일을 순서대로 동적으로 로드합니다.
---
*/

(function() {
    'use strict';
    const JS_FILES_TO_LOAD = [
        'script_state.js',
        'script_service_firebase.js',
        'script_service_api_settings.js',
        'script_service_api_openai.js',
        'script_service_api_anthropic.js',
        'script_service_api_google.js',
        'script_data_notes_notes.js',
        'script_data_notes_projects.js',
        'script_data_chat_sessions.js',
        'script_data_chat_projects.js',
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
        'script_event_handler.js',
        'script_app.js',
        'script_main.js',
    ];

    const head = document.head;
    JS_FILES_TO_LOAD.forEach(file => {
        const script = document.createElement('script');
        script.defer = true;
        script.src = file;
        head.appendChild(script);
    });
})();