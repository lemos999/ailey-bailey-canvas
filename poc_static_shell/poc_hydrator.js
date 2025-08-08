document.addEventListener('DOMContentLoaded', function () {
  const hydrateButton = document.getElementById('hydrate-button');
  const contentContainer = document.getElementById('content-container');

  // 이 내용은 AI가 동적으로 생성할 HTML 조각(Fragment)을 시뮬레이션합니다.
  const testContent = '
    <h2>동적 콘텐츠</h2>
    <p>성공적으로 주입되었습니다!</p>
    <strong style="color: green;">이 메시지는 JavaScript에 의해 동적으로 추가되었습니다.</strong>
  ';

  hydrateButton.addEventListener('click', function () {
    console.log('Hydrate button clicked. Injecting content...');
    contentContainer.innerHTML = testContent;
    hydrateButton.textContent = "주입 완료!";
    hydrateButton.disabled = true;
    console.log('Content injection complete.');
  });
});