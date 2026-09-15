/**
 * 등록 HTML 에 주입되는 스크립트.
 * - 퍼널 이벤트(form_view / form_start / submit_attempt / submit_error) 를 /f/:slug/events 로 전송.
 * - 문서 단위로 submit 을 위임 받아(어느 <form> 이든, 나중에 렌더된 폼 포함) 필드를 JSON 으로 /f/:slug/submissions 에 POST.
 * - 운영자 JS 가 preventDefault() 했으면(자체 검증 실패) 개입하지 않는다. 진행 중 재진입 차단.
 * - 모든 POST 에 X-GU-Token(slug·방문자 바인딩 HMAC) 을 실어 다른 운영자 HTML 의 교차 제출·방문자 위조를 막는다.
 * - 모두 같은 origin (CSP connect-src 'self'). 성공 시 폼을 감사 메시지로 교체, 실패 시 alert.
 * - 대상 폼 지정: <form data-gu-form> 이 있으면 그 폼만, 없으면 모든 폼.
 */
export function buildInjectScript(slug: string, linkCode: string | null, token: string): string {
  const submitUrl = `/f/${encodeURIComponent(slug)}/submissions`;
  const eventUrl = `/f/${encodeURIComponent(slug)}/events`;
  return `
(function(){
  var LINK = ${JSON.stringify(linkCode)};
  var TOKEN = ${JSON.stringify(token)};
  var EVENT_URL = ${JSON.stringify(eventUrl)};
  var SUBMIT_URL = ${JSON.stringify(submitUrl)};
  var HEADERS = { 'Content-Type': 'application/json', 'X-GU-Token': TOKEN };

  // 퍼널 이벤트 전송. 토큰 헤더가 필요해 keepalive fetch 사용(페이지 이탈 중에도 전달).
  function track(type, meta){
    try {
      fetch(EVENT_URL, { method: 'POST', headers: HEADERS, body: JSON.stringify({ linkCode: LINK, type: type, meta: meta || {} }), keepalive: true, credentials: 'same-origin' }).catch(function(){});
    } catch (e) {}
  }

  // 대상 폼: data-gu-form 이 있으면 그것만, 없으면 모든 form
  function isTarget(form){
    if (!form || form.tagName !== 'FORM') return false;
    var picked = document.querySelector('form[data-gu-form]');
    return picked ? form === picked : true;
  }
  function firstTarget(){ return document.querySelector('form[data-gu-form]') || document.querySelector('form'); }

  // 폼 도달: 폼이 있을 때만. 늦게 렌더되는 폼은 DOM 변화를 지켜본다.
  var viewed = false;
  function onFormFound(form){
    if (viewed) return; viewed = true;
    track('form_view', { fields: form.querySelectorAll('input,select,textarea').length });
  }
  var initial = firstTarget();
  if (initial) onFormFound(initial);
  else if (window.MutationObserver) {
    var mo = new MutationObserver(function(){ var f = firstTarget(); if (f) { onFormFound(f); mo.disconnect(); } });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 작성 시작: 사용자의 첫 입력(값 변경) 만. focus/autofocus 는 세지 않는다.
  var started = false;
  function onStart(e){
    if (started) return;
    var el = e && e.target;
    if (!el || !isTarget(el.form)) return;
    started = true;
    track('form_start', { field: (el.name || el.id) || null });
  }
  document.addEventListener('input', onStart, true);
  document.addEventListener('change', onStart, true);

  // 제출: 문서 단위 위임. 운영자 JS 가 막았으면 건드리지 않음. 진행 중 재진입 차단.
  var busy = false;
  document.addEventListener('submit', function(e){
    var form = e.target;
    if (!isTarget(form) || e.defaultPrevented) return;
    e.preventDefault();
    if (busy) return; busy = true;

    var fd = new FormData(form);
    var fields = {};
    fd.forEach(function(v, k){
      if (typeof v !== 'string') return;
      if (fields[k] === undefined) fields[k] = v;
      else if (Array.isArray(fields[k])) fields[k].push(v);
      else fields[k] = [fields[k], v];
    });
    var buttons = form.querySelectorAll('button:not([type]),[type=submit]');
    buttons.forEach(function(b){ b.disabled = true; });
    function release(){ busy = false; buttons.forEach(function(b){ b.disabled = false; }); }

    track('submit_attempt', { fields: Object.keys(fields).length });
    fetch(SUBMIT_URL, {
      method: 'POST',
      headers: HEADERS,
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
      release();
      alert('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      console.error(err);
    });
  }, true);
})();`;
}

/**
 * 원본 HTML 에 제출 스크립트 주입. 마지막 </body> 직전(주석·문자열 안의 </body> 를 피하기 위해 마지막 매치), 없으면 끝에 추가.
 * 원본은 수정하지 않음 (sanitize 안 함) — 격리는 origin + CSP 로 담당.
 */
export function injectScript(html: string, script: string): string {
  const tag = `<script data-gu-inject>${script}</script>`;
  const matches = [...html.matchAll(/<\/body\s*>/gi)];
  const last = matches.length ? matches[matches.length - 1].index! : -1;
  return last === -1 ? html + tag : html.slice(0, last) + tag + html.slice(last);
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
