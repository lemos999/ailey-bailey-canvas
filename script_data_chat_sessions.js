/*
--- Ailey & Bailey Canvas ---
File: script_data_chat_sessions.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 채팅 세션 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ChatSessionsDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const chatHistoryPath = `artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}`;
            this.collectionRef = db.collection(`${chatHistoryPath}/sessions`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(sessions);
            }, error => console.error("채팅 세션 데이터 수신 오류:", error));
        },

        async add(sessionData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...sessionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(sessionId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(sessionId).update(dataWithTimestamp);
        },

        addMessage(sessionId, message) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(sessionId).update({
                messages: firebase.firestore.FieldValue.arrayUnion(message),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },

        delete(sessionId) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(sessionId).delete();
        }
    };

    window.Data = window.Data || {};
    window.Data.ChatSessions = ChatSessionsDataService;

})(window);