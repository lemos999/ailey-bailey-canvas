/* --- Ailey & Bailey Canvas --- */
// File: 000_shell_template.js
// Version: 7.5 (Header Toggle Button)
// Description: Added the HTML element for the header visibility toggle button.

const SHELL_HTML_BODY_TEMPLATE = `
    <header id="immersive-header">
        <div class="header-group left">
            <div id="system-info-widget">
                <div id="real-time-clock"></div>
                <div id="canvas-id-container">
                    <span class="brand-logo">Ailey & Bailey <small>(Beta)</small></span>
                </div>
            </div>
        </div>
        <div class="header-group center">
            <div id="quick-query-container">
                <button id="quick-query-temp-toggle" title="임시 채팅 모드 (기록되지 않음)"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M12,16A4,4 0 0,1 8,12H10A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10V7H14V9H16V7H18V10A4,4 0 0,1 14,14H12A4,4 0 0,1 8,10V9H6V12A6,6 0 0,0 12,18A6,6 0 0,0 18,12V6H12V4L16,1L20,4V6H22V12A8,8 0 0,1 14,20H10A8,8 0 0,1 2,12V6H4V12A6,6 0 0,0 8,15.73V16Z" /></svg></button>
                <textarea id="quick-query-input" placeholder="빠른 질문..." rows="1"></textarea>
                <button id="quick-query-send-btn" title="전송"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" /></svg></button>
            </div>
        </div>
        <div class="header-group right">
            <div class="fixed-tool-container controls-disabled">
                 <div class="loader-text">불러오는 중...</div>
                 <div class="tool-button" id="debugger-toggle-btn" title="디버거 열기/닫기" style="display: none;"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg></div>
                 <div class="tool-button" id="notes-app-toggle-btn" title="지식 발전소 (클라우드 메모)"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17,4V10L15,8L13,10V4H6A2,2 0 0,0 4,6V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V6A2,2 0 0,0 18,4H17Z" /></svg></div>
                 <div class="tool-button" id="chat-toggle-btn" title="Ailey & Bailey와 대화"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18,14V11H16V14H13V16H16V19H18V16H21V14M12,2C6.5,2 2,6.5 2,12C2,17.5 6.5,22 12,22C13.2,22 14.4,21.8 15.5,21.3C15.9,21.9 16.5,22.4 17.2,22.7L19,23.5V21.1C20.2,20.1 21.1,18.8 21.7,17.3C21.9,16.5 22,15.8 22,15C22,8.4 17.6,2 12,2Z" /></svg></div>
                 <div class="tool-button" id="theme-toggle" title="테마 전환"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,18V22H10V18H12M12,2V6H10V2H12M22,12H18V10H22V12M6,12H2V10H6V12M16.95,7.05L19.78,4.22L18.36,2.81L15.54,5.64L16.95,7.05M8.46,15.54L5.64,18.36L4.22,16.95L7.05,14.12L8.46,15.54M18.36,21.19L19.78,19.78L16.95,16.95L15.54,18.36L18.36,21.19M7.05,8.46L4.22,5.64L5.64,4.22L8.46,7.05L7.05,8.46M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z" /></svg></div>
            </div>
        </div>
    </header>
    <div id="selection-popover">
        <button id="popover-ask-ai"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right: 8px;"><path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M15.9,8.4C15.9,7.3 15,6.5 13.9,6.5C12.8,6.5 11.9,7.3 11.9,8.4C11.9,9.5 12.8,10.3 13.9,10.3C15,10.3 15.9,9.5 15.9,8.4M8.1,8.4C8.1,7.3 9,6.5 10.1,6.5C11.2,6.5 12.1,7.3 12.1,8.4C12.1,9.5 11.2,10.3 10.1,10.3C9,10.3 8.1,9.5 8.1,8.4M12,20C13.8,20 15.5,19.2 16.8,18H7.2C8.5,19.2 10.2,20 12,20M20,12V7C20,5.9 19.1,5 18,5H6C4.9,5 4,5.9 4,7V12C4,13.1 4.9,14 6,14H7.2C8.1,15.2 9.5,16 11,16V18H9V20H15V18H13V16C14.5,16 15.9,15.2 16.8,14H18C19.1,14 20,13.1 20,12Z" /></svg> AI에게 질문</button>
        <button id="popover-add-note"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right: 8px;"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19M17,3H7A2,2 0 0,0 5,5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V5A2,2 0 0,0 17,3Z" /></svg> 메모에 추가</button>
    </div>
    <div id="copy-modal-overlay" class="custom-modal-overlay">
        <div id="copy-modal-container" class="custom-modal">
            <p>아래 내용이 자동으로 선택되었습니다. <strong>Ctrl+C</strong> 또는 <strong>Cmd+C</strong>를 눌러 복사하세요.</p>
            <textarea id="copy-modal-textarea" readonly></textarea>
        </div>
    </div>
    <div id="quiz-modal-overlay" class="custom-modal-overlay">
        <div class="quiz-modal custom-modal">
            <h2>📝 핵심 개념 퀴즈</h2>
            <div id="quiz-container"></div>
            <button id="quiz-submit-btn">제출하기</button>
            <div id="quiz-results"></div>
        </div>
    </div>
    <div id="prompt-modal-overlay" class="custom-modal-overlay">
        <div class="custom-modal">
            <h3>⚙️ Ailey & Bailey 역할 설정</h3>
            <p style="font-size:0.9em;">Ailey & Bailey에게 원하는 역할을 부여해주세요. (예: 5살 아이에게 설명하듯 알려줘)</p>
            <textarea id="custom-prompt-input" placeholder="여기에 원하는 역할을 입력하세요..."></textarea>
            <div class="custom-modal-actions">
                <button id="prompt-cancel-btn" class="modal-btn">취소</button>
                <button id="prompt-save-btn" class="modal-btn">저장</button>
            </div>
        </div>
    </div>
    <div id="prompt-manager-modal-overlay" class="custom-modal-overlay">
        <div class="custom-modal prompt-manager-modal">
             <button class="close-btn" id="prompt-manager-close-btn"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
            <div class="prompt-manager-container">
                <div class="template-list-panel">
                    <h3>템플릿 목록</h3>
                    <div id="template-list-container"></div>
                    <button id="add-new-template-btn" class="notes-btn" style="width: 100%;">새 템플릿 추가</button>
                </div>
                <div class="template-editor-panel">
                    <div class="editor-form-group">
                        <label for="template-name-input">템플릿 이름</label>
                        <input type="text" id="template-name-input" placeholder="예: 데이터 분석 전문가">
                    </div>
                    <div class="editor-form-group">
                        <label for="template-prompt-textarea">프롬프트 내용</label>
                        <textarea id="template-prompt-textarea" rows="10" placeholder="AI에게 전달할 역할, 지시사항 등을 입력하세요..."></textarea>
                    </div>
                    <div class="editor-actions">
                        <button id="delete-template-btn" class="modal-btn cancel">삭제</button>
                        <button id="save-template-btn" class="modal-btn confirm">저장</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="custom-modal" class="custom-modal-overlay">
        <div class="custom-modal">
            <p id="modal-message">정말로 이 항목을 삭제하시겠습니까?</p>
            <div class="custom-modal-actions">
                <button id="modal-cancel-btn" class="modal-btn">취소</button>
                <button id="modal-confirm-btn" class="modal-btn">삭제</button>
            </div>
        </div>
    </div>
    <div id="notes-app-panel" class="draggable-panel">
        <div id="note-list-view" class="notes-view active"></div>
        <div id="note-editor-view" class="notes-view">
             <div class="editor-header"><button id="back-to-list-btn" class="notes-btn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg><span>목록</span></button><div id="auto-save-status"></div></div>
             <input type="text" id="note-title-input" placeholder="제목을 입력하세요...">
             <div id="toast-editor"></div>
        </div>
    </div>
    <div id="chat-panel" class="draggable-panel">
        <div id="chat-session-sidebar">
            <div id="sidebar-header">
                 <div class="sidebar-controls">
                    <input type="text" id="search-sessions-input" placeholder="프로젝트/대화 검색...">
                    <button id="temp-session-toggle" title="임시 채팅 모드"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12,16A4,4 0 0,1 8,12H10A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10V7H14V9H16V7H18V10A4,4 0 0,1 14,14H12A4,4 0 0,1 8,10V9H6V12A6,6 0 0,0 12,18A6,6 0 0,0 18,12V6H12V4L16,1L20,4V6H22V12A8,8 0 0,1 14,20H10A8,8 0 0,1 2,12V6H4V12A6,6 0 0,0 8,15.73V16Z" /></svg></button>
                 </div>
                <div class="sidebar-button-group">
                    <button id="new-chat-btn" title="새 대화 시작"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20,14H14V20H12V14H6V12H12V6H14V12H20V14Z" /></svg> <span>새 대화</span></button>
                    <button id="new-project-btn" title="새 프로젝트 생성"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z" /></svg> <span>새 프로젝트</span></button>
                </div>
            </div>
            <div id="session-list-container"></div>
        </div>
        <div id="chat-main-view">
            <div class="panel-header">
                <button id="sidebar-toggle-btn" title="사이드바 접기/펼치기"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg></button>
                <span id="chat-session-title">Ailey & Bailey</span>
                <div class="panel-controls">
                    <button class="panel-control-btn panel-minimize-btn" title="최소화"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20,14H4V10H20" /></svg></button>
                    <button class="panel-control-btn panel-maximize-btn" title="최대화">
                         <span class="icon-maximize"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,4H20V20H4V4M6,8V18H18V8H6Z"/></svg></span>
                         <span class="icon-restore"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,8H8V4H20V16H16V20H4V8M16,8V14H18V6H10V8H16M6,10V18H14V10H6Z"/></svg></span>
                    </button>
                    <button class="panel-control-btn close-btn" title="닫기"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
                </div>
            </div>
            <div id="chat-control-deck">
                 <div id="settings-control-container">
                    <button id="settings-button" title="AI 모델 및 프롬프트 설정">
                        <span class="settings-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg></span>
                        <span id="settings-display-text"></span>
                    </button>
                    <div id="settings-popover" class="custom-popover">
                        <div class="popover-section">
                            <label>AI 모델</label>
                            <div class="prompt-popover-group">
                                <select id="ai-model-selector"></select>
                                <button id="manage-api-settings-btn" title="개인 API 키 설정">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>
                                </button>
                            </div>
                        </div>
                        <div class="popover-section">
                            <label>프롬프트 템플릿</label>
                            <div class="prompt-popover-group">
                                <select id="quick-prompt-select"></select>
                                <button id="manage-prompts-btn" title="프롬프트 템플릿 관리">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M6,4V20H18V4H6M9,9H15V11H9V9M9,13H15V15H9V13Z" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div id="chat-welcome-message">
                    <h3>Ailey & Bailey</h3>
                    <p>학습을 시작해보세요!</p>
                </div>
            </div>
            <div id="attached-file-display"></div>
            <form class="chat-input-form" id="chat-form">
                <button type="button" id="chat-attach-btn" title="파일 첨부"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" /></svg></button>
                <textarea id="chat-input" placeholder="Ailey & Bailey에게 질문하기..." rows="1" disabled></textarea>
                <button type="submit" id="chat-send-btn" title="전송"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" /></svg></button>
            </form>
        </div>
    </div>
    <main id="ai-content-placeholder"></main>
    <canvas id="drawing-canvas-overlay"></canvas>
    <div id="drawing-toolbar"></div>
    <input type="file" id="file-importer" accept=".json" style="display: none;">
    <input type="file" id="chat-file-input" accept=".txt,.js,.py,.html,.css,.json,.md,.png,.jpg,.jpeg,.webp,.pdf" style="display: none;">
    <button id="header-toggle-btn" title="상단바 보이기/숨기기">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M3,4H21V6H3V4M3,19H21V21H3V19Z" />
        </svg>
    </button>
    <div id="live-debugger-panel" class="draggable-panel" style="display: none; bottom: 20px; right: 20px; width: 450px; height: 300px;">
        <div class="panel-header" id="live-debugger-header">
             <span><span style="color: #ff6b6b;">🔴</span> Live State-Trace Debugger</span>
             <div class="panel-controls">
                <button id="debugger-copy-btn" class="panel-control-btn" title="로그 복사"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg></button>
                <button id="debugger-clear-btn" class="panel-control-btn" title="로그 지우기"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19.36,2.72L20.78,4.14L15.06,9.85L16.48,11.27L22.19,5.56L23.61,6.97C23.22,7.95 22.54,8.78 21.66,9.38L20.41,8.13C20.83,7.5 21.05,6.78 21.05,6C21.05,4.82 20.39,3.78 19.36,2.72M12,9C13.66,9 15,10.34 15,12C15,13.66 13.66,15 12,15C10.34,15 9,13.66 9,12C9,10.34 10.34,9 12,9M2.39,6.97L3.81,5.56L9.52,11.27L8.1,9.85L2.39,4.14L0.97,2.72C1.5,2.14 2.16,1.64 2.93,1.27L4.18,2.53C3.55,3.17 3,3.96 3,4.87C3,6.05 3.67,7.09 4.7,8.14L2.39,6.97M20.41,15.87L21.66,14.62C22.54,15.22 23.22,16.05 23.61,17.03L22.19,18.44L16.48,12.73L15.06,14.15L20.78,19.86L19.36,21.28C18.4,22.26 17.18,23 15.87,23C14.96,23 14.17,22.45 13.54,21.82L14.79,20.57C15.17,20.84 15.58,21 16,21C17.22,21 18.22,20.33 19.14,19.31L12,12.17L4.86,19.31C3.95,20.33 2.78,21 1.5,21C1.09,21 0.68,20.84 0.3,20.57L1.55,19.31C2.46,18.4 3,17.22 3,16C3,15.22 3.16,14.5 3.47,13.82L2.39,17.03L0.97,18.44C1.36,19.42 2,20.24 2.93,20.73L4.18,21.47L2.93,22.72C3.5,23.3 4.22,23.75 5,23.95V22C5,20.95 5.32,19.95 5.88,19.12L12,13L18.12,19.12C18.68,19.68 19.05,20.4 19.05,21.13V22C19.84,21.75 20.5,21.3 21.07,20.72L22.32,21.97L20.41,15.87Z" /></svg></button>
                <button class="panel-control-btn panel-minimize-btn" title="최소화"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20,14H4V10H20" /></svg></button>
                <button class="panel-control-btn panel-maximize-btn" title="최대화">
                    <span class="icon-maximize"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,4H20V20H4V4M6,8V18H18V8H6Z"/></svg></span>
                    <span class="icon-restore"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,8H8V4H20V16H16V20H4V8M16,8V14H18V6H10V8H16M6,10V18H14V10H6Z"/></svg></span>
                </button>
                <button class="panel-control-btn close-btn" title="닫기"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
             </div>
        </div>
        <div id="live-debugger-content"></div>
    </div>
`;

// [HCA] Helper function to create a visible error block for easier debugging.
function createErrorBlock(error, blockData) {
    const errorDiv = document.createElement('div');
    errorDiv.style.border = '2px dashed red';
    errorDiv.style.padding = '15px';
    errorDiv.style.margin = '10px 0';
    errorDiv.style.backgroundColor = '#fff0f0';
    errorDiv.style.color = '#333';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.innerHTML = `
        <h4 style="margin-top:0; color: red;">🚧 블록 렌더링 오류 🚧</h4>
        <p><strong>오류 메시지:</strong> ${error.name}: ${error.message}</p>
        <p><strong>문제가 발생한 데이터:</strong></p>
        <pre style="white-space: pre-wrap; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(blockData, null, 2)}</pre>
    `;
    return errorDiv;
}

// [REFACTORED] The heart of the rendering engine, now with fault tolerance.
function renderAppShell(jsonDataString, title_from_ai, canvasId_from_ai) {
  // Defensive check for libraries
  const REQUIRED_SCRIPT_SOURCE = 'https://lemos999.github.io/ailey-bailey-canvas/';
  if (!document.documentElement.innerHTML.includes(REQUIRED_SCRIPT_SOURCE)) {
    document.body.innerHTML = 
      '<div style="font-family: sans-serif; text-align: center; padding: 40px; color: #888;">' +
      '<h1>Access Denied</h1>' +
      '<p>This application can only be run from the official deployment environment.</p>' +
      '<p>이 애플리케이션은 정식 배포 환경에서만 실행할 수 있습니다.</p>' +
      '</div>';
    return;
  }
  
  document.body.innerHTML = '';
  document.body.className = 'dark-mode';
  const savedTheme = localStorage.getItem('theme');
  if(savedTheme === 'light') document.body.classList.remove('dark-mode');
  
  canvasId = canvasId_from_ai;
  let meta = document.createElement('meta');
  meta.name = 'canvas-id';
  meta.content = canvasId;
  document.head.appendChild(meta);
  
  document.body.innerHTML = SHELL_HTML_BODY_TEMPLATE;
  rebindDOMElements(); // Bind elements from the static shell

  try {
    const jsonData = JSON.parse(jsonDataString);
    document.title = jsonData.title || title_from_ai;

    const placeholder = document.getElementById('ai-content-placeholder');
    if (!placeholder) {
        console.error("Fatal Error: #ai-content-placeholder not found in shell template.");
        return;
    }
    placeholder.innerHTML = ''; // Clear placeholder

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    const container = document.createElement('div');
    container.className = 'container';
    container.id = 'learning-content';

    // [FAULT-TOLERANT RENDERING LOGIC]
    if (jsonData.contentBlocks && Array.isArray(jsonData.contentBlocks)) {
        jsonData.contentBlocks.forEach((block, index) => {
            try {
                const blockElement = renderBlock(block, index);
                if (blockElement) {
                    container.appendChild(blockElement);
                }
            } catch (error) {
                console.error("Block Rendering Error:", error, "Problematic Block:", block);
                const errorBlockElement = createErrorBlock(error, block);
                container.appendChild(errorBlockElement);
            }
        });
    }

    wrapper.appendChild(container);
    placeholder.appendChild(wrapper);

    initializeCoreFeatures(); // Activate all JS functionalities

  } catch (error) {
      console.error("Fatal Error: Failed to parse JSON payload:", error);
      const placeholder = document.getElementById('ai-content-placeholder');
      if(placeholder) {
         const errorData = { message: error.message, stack: error.stack };
         placeholder.appendChild(createErrorBlock(error, { payload: jsonDataString.substring(0, 500) + '...' }));
      }
  }
}