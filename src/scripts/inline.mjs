// Scripts that must run before first paint, so they are inlined into the page.
// astro.config.mjs hashes these exact strings into the Content Security Policy;
// render them with <script is:inline set:html={...}> so the bytes match.

/** Marks that scripts run, for CSS that only hides things when JS can reveal them. */
export const JS_CLASS = "document.documentElement.classList.add('js');";

/**
 * Decide whether the 3D hero can run, so fallback visitors get the real photo
 * straight away (and download only that). ?force3d skips the check.
 */
export const STAGE_CHECK = `(function () {
  var off = false;
  try {
    if (!/[?&]force3d\\b/.test(location.search)) {
      var conn = navigator.connection;
      if (conn && conn.saveData) off = true;
      if (!off) {
        var gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) off = true;
        else {
          var info = gl.getExtension('WEBGL_debug_renderer_info');
          var r = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
          if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)) off = true;
          var lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
      }
    }
  } catch (e) {
    off = true;
  }
  if (off) document.documentElement.setAttribute('data-stage-static', '');
})();`;

export const INLINE_SCRIPTS = [JS_CLASS, STAGE_CHECK];
