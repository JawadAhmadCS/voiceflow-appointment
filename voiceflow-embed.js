/**
 * Voiceflow web chat widget — load once per page.
 * Edit VOICEFLOW_CONFIG below; keep this file if you reuse embed on other pages.
 */
(function () {
  var VOICEFLOW_CONFIG = {
    projectID: "69e69e7e64eb056fea557ec5",
    url: "https://general-runtime.voiceflow.com",
    versionID: "production",
    voice: {
      url: "https://runtime-api.voiceflow.com",
    },
  };

  var BUNDLE = "https://cdn.voiceflow.com/widget-next/bundle.mjs";

  function inject() {
    var v = document.createElement("script");
    var s = document.getElementsByTagName("script")[0];
    v.onload = function () {
      window.voiceflow.chat.load({
        verify: { projectID: VOICEFLOW_CONFIG.projectID },
        url: VOICEFLOW_CONFIG.url,
        versionID: VOICEFLOW_CONFIG.versionID,
        voice: VOICEFLOW_CONFIG.voice,
      });
    };
    v.src = BUNDLE;
    v.type = "text/javascript";
    s.parentNode.insertBefore(v, s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
