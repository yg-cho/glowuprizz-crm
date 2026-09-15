/**
 * 등록 HTML 에 주입되는 스크립트.
 * - 퍼널 이벤트(form_view / form_start / submit_attempt / submit_error) 를 /f/:slug/events 로 전송.
 * - 페이지의 첫 <form> submit 을 가로채 필드를 JSON 으로 /f/:slug/submissions 에 POST.
 * - 모두 같은 origin (CSP connect-src 'self'). 성공 시 폼을 감사 메시지로 교체, 실패 시 alert.
 */
export function buildInjectScript(slug: string, linkCode: string | null): string {
  const submitUrl = `/f/${encodeURIComponent(slug)}/submissions`;
  const eventUrl = `/f/${encodeURIComponent(slug)}/events`;
  return `
(function(){
  var LINK = ${JSON.stringify(linkCode)};
  var form = document.querySelector('form');
  // 퍼널 이벤트 전송. sendBeacon 우선(페이지 이탈 중에도 전달), 없으면 keepalive fetch.
  function track(type, meta){
    try {
      var body = JSON.stringify({ linkCode: LINK, type: type, meta: meta || {} });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(${JSON.stringify(eventUrl)}, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(${JSON.stringify(eventUrl)}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true, credentials: 'same-origin' });
      }
    } catch (e) {}
  }
  if (!form) { track('form_view', { hasForm: false }); return; }
  track('form_view', { hasForm: true, fields: form.querySelectorAll('input,select,textarea').length });

  var started = false;
  function onStart(e){
    if (started) return; started = true;
    var el = e && e.target;
    track('form_start', { field: (el && (el.name || el.id)) || null });
  }
  form.addEventListener('input', onStart, true);
  form.addEventListener('change', onStart, true);
  form.addEventListener('focusin', onStart, true);

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var fd = new FormData(form);
    var fields = {};
    fd.forEach(function(v, k){
      if (typeof v !== 'string') return;
      if (fields[k] === undefined) fields[k] = v;
      else if (Array.isArray(fields[k])) fields[k].push(v);
      else fields[k] = [fields[k], v];
    });
    var btn = form.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    track('submit_attempt', { fields: Object.keys(fields).length });
    fetch(${JSON.stringify(submitUrl)}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ linkCode: LINK, fields: fields })
    }).then(function(r){
      if (!r.ok) { track('submit_error', { reason: 'http', status: r.status }); throw new Error('submit failed: ' + r.status); }
      var done = document.createElement('div');
      done.setAttribute('data-gu-success', '1');
      done.style.cssText = 'padding:24px;text-align:center;font-family:system-ui,sans-serif;font-size:18px';
      done.textContent = '신청이 완료되었습니다. 감사합니다!';
      form.replaceWith(done);
    }).catch(function(err){
      if (!/submit failed/.test(String(err && err.message))) track('submit_error', { reason: 'network' });
      if (btn) btn.disabled = false;
      alert('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      console.error(err);
    });
  });
})();`;
}

/**
 * 원본 HTML 에 제출 스크립트 주입. </body> 직전, 없으면 끝에 추가.
 * 원본은 수정하지 않음 (sanitize 안 함) — 격리는 origin + CSP 로 담당.
 */
export function injectScript(html: string, script: string): string {
  const tag = `<script data-gu-inject>${script}</script>`;
  const idx = html.search(/<\/body\s*>/i);
  return idx === -1 ? html + tag : html.slice(0, idx) + tag + html.slice(idx);
}

/**
 * 공개 폼 CSP — 목적은 XSS 방지가 아니라 "탈출 방지" (ADR-0003).
 * - script-src: 운영자 HTML 의 인라인 JS/이벤트 핸들러와 https CDN 허용. nonce 를 쓰면 브라우저가
 *   'unsafe-inline' 을 무시해 운영자 JS 가 전부 죽으므로 nonce 미사용.
 * - connect-src 'self': fetch/XHR/WebSocket 은 forms origin 만 → 관리자 API 로 요청 불가.
 * - form-action 'self': 전통 form POST 도 외부 불가.
 * - frame-ancestors 'none': 관리자 화면 포함 어디에도 임베드 불가 (클릭재킹/postMessage 경로 차단).
 */
export function buildCsp(): string {
  return [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' https: data:",
    "media-src 'self' https: data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join('; ');
}
