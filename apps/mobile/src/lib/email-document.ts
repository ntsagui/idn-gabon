function removeUnsafeMarkup(html: string): string {
  return html
    .replace(
      /<(script|iframe|object|embed|form|input|button|meta|base|link|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    )
    .replace(
      /<(script|iframe|object|embed|form|input|button|meta|base|link|svg|math)\b[^>]*\/?\s*>/gi,
      "",
    )
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,
      "",
    )
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/url\s*\(\s*(["']?)\s*javascript:[^)]*\)/gi, "")
}

export function documentForEmail(html: string): string {
  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'">
<base target="_blank">
<style>
:root{color-scheme:only light}
html,body{background:#fff;color:#16170f;font:15px/1.55 -apple-system,BlinkMacSystemFont,Arial,sans-serif;overflow-wrap:anywhere}
</style>
</head><body><div id="email-content">${removeUnsafeMarkup(html)}</div>
<style>
html,body{margin:0!important;padding:0!important}
#email-content{display:flow-root;position:absolute;top:12px;left:12px;width:calc(100% - 24px);transform-origin:top left}
img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}a{color:#0e7c3a}
</style></body></html>`
}

// Runs in the native WebView, separately from the untrusted email HTML.
export const emailLayoutScript = `
(function () {
  var content = document.getElementById('email-content');
  if (!content) return;
  var pending = false;
  var lastHeight = 0;
  function measure() {
    pending = false;
    if (!content.isConnected) return;
    var available = Math.max(1, document.documentElement.clientWidth - 24);
    var width = Math.max(available, content.scrollWidth);
    var scale = Math.min(1, available / width);
    content.style.transform = 'scale(' + scale + ')';
    var height = Math.ceil(Math.max(content.scrollHeight, content.offsetHeight) * scale + 24);
    document.body.style.height = height + 'px';
    if (height !== lastHeight) {
      lastHeight = height;
      window.ReactNativeWebView.postMessage(String(height));
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(measure);
    }
  }
  new ResizeObserver(schedule).observe(content);
  document.addEventListener('load', schedule, true);
  window.addEventListener('resize', schedule);
  if (document.fonts) document.fonts.ready.then(schedule);
  schedule();
})();
true;
`
