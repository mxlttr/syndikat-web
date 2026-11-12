<script>
  import { onMount } from "svelte";
  import TournamentRow from "./TournamentRow.svelte";
  import { resolveApiUrl } from "../utils/api";
  import { groupTournamentWeeks } from "../utils/tournaments";

  let state = "loading";
  let tournaments = [];
  let requestId = 0;

  $: weeks = groupTournamentWeeks(tournaments);

  onMount(() => {
    loadTournaments();
  });

  async function loadTournaments() {
    const currentRequest = ++requestId;
    state = "loading";

    try {
      const response = await fetch(`${resolveApiUrl()}/tournaments/on-tour`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`On-tour request failed with ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("On-tour response is not an array");
      }

      if (currentRequest !== requestId) return;
      tournaments = data;
      state = data.length ? "loaded" : "empty";
    } catch (error) {
      if (currentRequest !== requestId) return;
      console.error("Failed to load on-tour tournaments.", error);
      state = "error";
    }
  }
</script>

{#if state === "loading"}
  <p class="on-tour-status" aria-live="polite">Lade aktuelle Turnierteilnahmen …</p>
{:else if state === "empty"}
  <p class="on-tour-status" aria-live="polite">Derzeit sind keine Spieler*innen des Syndikats auf Tour.</p>
{:else if state === "error"}
  <div class="on-tour-status" role="alert">
    <p>Die Turnierdaten sind zurzeit nicht verfügbar. Bitte versuche es später erneut.</p>
    <button class="button button--text" type="button" onclick={loadTournaments}>Erneut versuchen</button>
  </div>
{:else}
  <div class="table-responsive on-tour-wrapper">
    <table class="tournaments-table on-tour">
      <thead>
        <tr>
          <th scope="col" aria-label="Status"></th>
          <th scope="col">Turnier</th>
          <th scope="col">Datum</th>
          <th scope="col">Spieler*innen</th>
        </tr>
      </thead>
      <tbody>
        {#each weeks as week (week.key)}
          <tr class="tournaments-table__week">
            <th colspan="4" scope="colgroup">{week.label}</th>
          </tr>
          {#each week.tournaments as tournament, index (`${week.key}-${tournament.event_id || tournament.title || index}`)}
            <TournamentRow {tournament} variant="on-tour" />
          {/each}
        {/each}
      </tbody>
    </table>
  </div>
{/if}
