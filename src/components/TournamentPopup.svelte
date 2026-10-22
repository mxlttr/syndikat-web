<script>
  import { ExternalLink } from "lucide-svelte";

  let { tournament, onRoute } = $props();
</script>

<div class="tournament-popup">
  <p class="popup-title">
    {#if tournament.badge}
      <span class="popup-badge">{tournament.badge}</span>
    {/if}
    {tournament.title}
  </p>

  <p>Ort: {tournament.location}</p>
  <p>{tournament.gameDayLabel}: {tournament.gameDay}</p>

  {#if tournament.lastGameDay}
    <p>Letzter Spieltag: {tournament.lastGameDay}</p>
  {/if}

  {#if tournament.registrationDate}
    <p>Registrierung: ab {tournament.registrationDate}</p>
  {/if}

  {#if tournament.availableSpots}
    <p>Freie Startplätze: {tournament.availableSpots}</p>
  {/if}

  {#if tournament.relatedTournaments.length}
    <p>
      Verbundene Runden:
      {#each tournament.relatedTournaments as item, index}
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          {item.round}
        </a>{index < tournament.relatedTournaments.length - 1 ? ", " : ""}
      {/each}
    </p>
  {/if}

  {#if tournament.link}
    <p>
      <a href={tournament.link} target="_blank" rel="noopener noreferrer" class="popup-link">
        Turnierausschreibung ansehen
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </p>
  {/if}

  <button type="button" class="button button--text popup-route-button" onclick={onRoute}> Route anzeigen </button>
</div>
