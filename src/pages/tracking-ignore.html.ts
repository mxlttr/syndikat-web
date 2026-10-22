export function GET() {
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Tracking-Einstellungen – syndikat.golf</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { max-width: 42rem; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.6; }
      fieldset { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0; padding: 1rem; border: 1px solid #8aa8ad; border-radius: .5rem; }
      label { display: inline-flex; align-items: center; gap: .5rem; cursor: pointer; }
      #tracking-status { min-height: 1.6em; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <main>
      <h1>Tracking-Einstellungen</h1>
      <p>Du kannst die anonyme Reichweitenmessung für diesen Browser deaktivieren. Die Einstellung wird lokal gespeichert und gilt nur für dieses Gerät und diesen Browser.</p>
      <form id="tracking-form">
        <fieldset>
          <legend>Reichweitenmessung</legend>
          <label><input type="radio" name="tracking" value="enabled"> Erlauben</label>
          <label><input type="radio" name="tracking" value="disabled"> Deaktivieren</label>
        </fieldset>
      </form>
      <p id="tracking-status" role="status" aria-live="polite"></p>
      <p><a href="/">Zurück zur Startseite</a></p>
    </main>
    <script>
      (() => {
        const form = document.querySelector('#tracking-form');
        const status = document.querySelector('#tracking-status');
        const preferenceKey = 'umami.disabled';

        try {
          const disabled = localStorage.getItem(preferenceKey) === '1';
          form.elements.tracking.value = disabled ? 'disabled' : 'enabled';
          status.textContent = disabled
            ? 'Die Reichweitenmessung ist in diesem Browser deaktiviert.'
            : 'Die Reichweitenmessung ist in diesem Browser erlaubt.';

          form.addEventListener('change', (event) => {
            const disabled = event.target.value === 'disabled';
            if (disabled) localStorage.setItem(preferenceKey, '1');
            else localStorage.removeItem(preferenceKey);
            status.textContent = disabled
              ? 'Die Reichweitenmessung ist in diesem Browser deaktiviert.'
              : 'Die Reichweitenmessung ist in diesem Browser erlaubt.';
          });
        } catch {
          status.textContent = 'Die Einstellung kann in diesem Browser nicht gespeichert werden.';
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
