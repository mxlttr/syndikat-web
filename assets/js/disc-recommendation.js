(() => {
  const form = document.querySelector('[data-disc-recommendation-form]');
  const result = document.querySelector('[data-disc-recommendation-result]');
  if (!form || !result) return;

  const labels = {
    skill: { beginner: 'Einsteiger:in', intermediate: 'fortgeschritten', advanced: 'Turnierspieler:in' },
    distance: { 60: 'bis 60 m', 90: '60–90 m', 120: '90–120 m', 150: 'mehr als 120 m' },
    throwType: { backhand: 'Backhand', forehand: 'Forehand', both: 'Backhand und Forehand' },
    category: { midrange: 'Midrange', putter: 'Putter', approach: 'Approach', 'control-driver': 'Fairway / Control Driver', 'distance-driver': 'Distance Driver' },
    stability: { understable: 'understable', stable: 'stable', overstable: 'overstable' },
    shot: { straight: 'gerade Würfe', turnover: 'Turnover / Anhyzer', hyzer: 'Hyzer', approach: 'kontrollierte Annäherungen' },
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    result.hidden = false;
    result.textContent = 'Empfehlung wird vorbereitet …';

    fetch(`${resolveApiBaseUrl()}/recommendations/discs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Die Empfehlung konnte nicht geladen werden.');
        return body;
      })
      .then((body) => {
        result.innerHTML = `<strong>Dein Profil ist bereit.</strong><p>Gesucht wird ein ${labels.category[values.category]} für ${labels.skill[values.skill]} mit ${labels.throwType[values.throwType]} (ca. ${labels.distance[values.distance]}). Die Scheibe darf ${labels.stability[values.stability]} sein und wird vor allem für ${labels.shot[values.shot]} eingesetzt.</p><pre>${JSON.stringify(body, null, 2)}</pre>`;
      })
      .catch((error) => {
        result.textContent = error.message;
      });
  });
})();
