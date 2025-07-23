// js/utils/helpers.js
// 순수 함수(Pure functions)나 애플리케이션 전반에 사용되는 작은 유틸리티 함수들을 관리합니다.

/**
 * 주어진 타임스탬프를 기준으로 상대적인 날짜 그룹 정보를 반환합니다.
 * @param {firebase.firestore.Timestamp | Date} timestamp - 날짜 객체 또는 Firestore 타임스탬프
 * @param {boolean} isPinned - 고정 여부
 * @returns {{key: number, label: string}} 날짜 그룹의 키와 라벨
 */
export function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) {
        return { key: 0, label: '?? 고정됨' };
    }

    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }

    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };

    const nowMonth = now.getMonth();
    const dateMonth = date.getMonth();
    const nowYear = now.getFullYear();
    const dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) {
        return { key: 4, label: '이번 달' };
    }

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
         return { key: 5, label: '지난 달' };
    }

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: ${dateYear}년 월 };
}

/**
 * 실시간 시계를 업데이트합니다.
 */
export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}
