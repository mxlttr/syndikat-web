<script>
  import { onMount } from "svelte";
  import { resolveApiUrl } from "../utils/api";

  let ranking = [];
  let loading = true;
  let errorMessage = "";

  onMount(() => {
    const controller = new AbortController();
    let active = true;

    const loadRanking = async () => {
      try {
        const response = await fetch(`${resolveApiUrl()}/bagtag`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load bag-tag ranking: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Bag-tag ranking response is not an array");
        }

        ranking = data;
      } catch (err) {
        if (controller.signal.aborted) return;

        window.Sentry?.captureException(err);
        console.error(err);
        errorMessage = "Die Rangliste konnte gerade nicht geladen werden.";
      } finally {
        if (active) loading = false;
      }
    };

    void loadRanking();

    return () => {
      active = false;
      controller.abort();
    };
  });
</script>

<div class="bag-tags-wrapper">
  <table>
    <thead>
      <tr>
        <th>Rang</th>
        <th>Name</th>
        <th>Motiv</th>
      </tr>
    </thead>
    <tbody>
      {#if !loading && !errorMessage && ranking.length === 0}
        <tr>
          <td colspan="3">Keine Ranglisteneinträge verfügbar.</td>
        </tr>
      {:else if !loading && !errorMessage}
        {#each ranking as rank}
          <tr>
            <td>{rank.Rank}</td>
            <td>{rank.Name}</td>
            <td>{rank.Motiv}</td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>

  {#if loading}
    <p role="status">Rangliste wird geladen …</p>
  {:else if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}
</div>
