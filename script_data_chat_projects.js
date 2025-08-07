/*
--- Ailey & Bailey Canvas ---
File: script_data_chat_projects.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 채팅 프로젝트 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ChatProjectsDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const chatHistoryPath = `artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}`;
            this.collectionRef = db.collection(`${chatHistoryPath}/projects`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(projects);
            }, error => console.error("채팅 프로젝트 데이터 수신 오류:", error));
        },

        async add(projectData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...projectData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(projectId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(projectId).update(dataWithTimestamp);
        },

        async delete(projectId, sessionsToMove) {
            if (!this.collectionRef) this.initialize();
            const batch = db.batch();
            // 연결된 세션들의 projectId를 null로 업데이트
            sessionsToMove.forEach(session => {
                const sessionRef = window.Data.ChatSessions.collectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            // 프로젝트 삭제
            const projectRef = this.collectionRef.doc(projectId);
            batch.delete(projectRef);
            return await batch.commit();
        }
    };

    window.Data = window.Data || {};
    window.Data.ChatProjects = ChatProjectsDataService;

})(window);