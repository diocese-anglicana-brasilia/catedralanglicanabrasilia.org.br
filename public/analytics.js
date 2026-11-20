(() => {
  const hostname = window.location.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]" || /^127\./.test(hostname)) return;

  for (const name of ["stats.js", "recorder.js"]) {
    const script = document.createElement("script");
    script.src = `https://data.leocarvalho.dev/${name}`;
    script.defer = true;
    script.async = false;
    script.dataset.websiteId = "26e81a87-2c68-441e-aa04-f3accf18ede9";
    document.head.append(script);
  }
})();
