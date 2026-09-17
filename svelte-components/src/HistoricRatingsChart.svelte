<script>
  export let ratings = [];
  export let playerName = "";

  const chartWidth = 640;
  const chartHeight = 280;
  const chartMargins = { top: 20, right: 20, bottom: 42, left: 64 };
  let activePoint = null;

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "–"
      : date.toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function formatRating(value) {
    return Number(value).toFixed(3);
  }

  $: history = ratings
    .map((point) => ({
      ...point,
      timestamp: new Date(point.date).getTime(),
      numericRating: Number(point.rating),
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.numericRating));
  $: chart = buildChart(history);

  function buildChart(points) {
    if (points.length < 2) return null;

    const plotWidth = chartWidth - chartMargins.left - chartMargins.right;
    const plotHeight = chartHeight - chartMargins.top - chartMargins.bottom;
    const values = points.map((point) => point.numericRating);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max((maximum - minimum) * 0.12, 0.5);
    const lowerBound = minimum - padding;
    const upperBound = maximum + padding;
    const firstTimestamp = points[0].timestamp;
    const timeRange = points[points.length - 1].timestamp - firstTimestamp || 1;
    const x = (timestamp) => chartMargins.left + ((timestamp - firstTimestamp) / timeRange) * plotWidth;
    const y = (rating) => chartMargins.top + ((upperBound - rating) / (upperBound - lowerBound)) * plotHeight;
    const chartPoints = points.map((point) => ({ ...point, x: x(point.timestamp), y: y(point.numericRating) }));
    const path = chartPoints.reduce(
      (value, point, index) => index === 0 ? `M ${point.x} ${point.y}` : `${value} H ${point.x} V ${point.y}`,
      "",
    );

    return {
      points: chartPoints,
      path,
      yTicks: [maximum, (minimum + maximum) / 2, minimum].map((rating) => ({ rating, y: y(rating) })),
      xStart: { label: formatDate(points[0].date), x: chartMargins.left },
      xEnd: { label: formatDate(points[points.length - 1].date), x: chartWidth - chartMargins.right },
    };
  }
</script>

{#if chart}
  <div class="rating-history" aria-label="Historischer Ratingverlauf">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Historischer Ratingverlauf von ${playerName}`}>
      {#each chart.yTicks as tick, index}
        <line class="rating-history__grid" x1={chartMargins.left} x2={chartWidth - chartMargins.right} y1={tick.y} y2={tick.y} />
        {#if !activePoint}
          <text class="rating-history__label rating-history__label--y" x={chartMargins.left - 10} y={tick.y + 4}>{formatRating(tick.rating)}</text>
        {/if}
      {/each}
      {#if activePoint}
        <line class="rating-history__crosshair" x1={chartMargins.left} x2={activePoint.x} y1={activePoint.y} y2={activePoint.y} />
        <line class="rating-history__crosshair" x1={activePoint.x} x2={activePoint.x} y1={activePoint.y} y2={chartHeight - chartMargins.bottom} />
        <text class="rating-history__crosshair-label rating-history__crosshair-label--y" x={chartMargins.left - 6} y={activePoint.y + 4}>{formatRating(activePoint.numericRating)}</text>
        <text class="rating-history__crosshair-label" x={Math.max(chartMargins.left + 45, Math.min(activePoint.x, chartWidth - chartMargins.right - 45))} y={chartHeight - 12} text-anchor="middle">{formatDate(activePoint.date)}</text>
      {/if}
      <path class="rating-history__line" d={chart.path} />
      {#each chart.points as point}
        <g
          class:rating-history__point--active={activePoint === point}
          tabindex="0"
          role="button"
          aria-label={`${formatDate(point.date)}: ${formatRating(point.numericRating)}`}
          on:mouseenter={() => (activePoint = point)}
          on:mouseleave={() => (activePoint = null)}
          on:focus={() => (activePoint = point)}
          on:blur={() => (activePoint = null)}
        >
          <circle class="rating-history__point" cx={point.x} cy={point.y} r="4" />
        </g>
      {/each}
      {#if !activePoint}
        <text class="rating-history__label" x={chart.xStart.x} y={chartHeight - 12}>{chart.xStart.label}</text>
        <text class="rating-history__label" x={chart.xEnd.x} y={chartHeight - 12} text-anchor="end">{chart.xEnd.label}</text>
      {/if}
    </svg>
  </div>
{:else}
  <p class="rating-modal__muted rating-history__empty">Keine historischen Ratingdaten vorhanden.</p>
{/if}

<style>
  .rating-history { position: relative; margin: 0 0 1.5rem; overflow-x: auto; padding-bottom: .25rem; }
  .rating-history svg { display: block; width: 100%; min-width: 32rem; height: 280px; overflow: visible; }
  .rating-history__grid { stroke: var(--border-color, #dfe5ef); stroke-dasharray: 3 4; stroke-width: 1; }
  .rating-history__crosshair { stroke: var(--dark-blue, #1e2740); stroke-width: 1; opacity: .55; pointer-events: none; }
  :global([dark]) .rating-history__crosshair { stroke: var(--light-gray, #f0f0f0); }
  .rating-history__line { fill: none; stroke: var(--brand-color, #4f46e5); stroke-linejoin: round; stroke-linecap: round; stroke-width: 3; }
  .rating-history__point { fill: var(--background-color, #fff); stroke: var(--brand-color, #4f46e5); stroke-width: 2; cursor: pointer; outline: none; }
  .rating-history__point:hover, .rating-history__point:focus, .rating-history__point--active .rating-history__point { fill: var(--brand-color, #4f46e5); stroke: var(--dark-blue, #1e2740); stroke-width: 3; }
  .rating-history__label { fill: var(--heading-font-color, #1e2740); font-size: 12px; }
  .rating-history__label--y { text-anchor: end; }
  .rating-history__crosshair-label { fill: var(--heading-font-color, #1e2740); font-size: 12px; font-weight: 700; pointer-events: none; }
  .rating-history__crosshair-label--y { text-anchor: end; }
  .rating-history__empty { margin: -.5rem 0 1.25rem; }
</style>
