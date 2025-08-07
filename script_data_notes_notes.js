/*
--- Ailey & Bailey Canvas ---
File: script_data_notes_notes.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 노트 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NotesDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
            this.collectionRef = db.collection(`${userPath}/notes`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(notes);
            }, error => console.error("노트 데이터 수신 오류:", error));
        },

        async add(noteData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...noteData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(noteId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(noteId).update(dataWithTimestamp);
        },

        delete(noteId) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(noteId).delete();
        }
    };

    window.Data = window.Data || {};
    window.Data.Notes = NotesDataService;

})(window);