<script>
  import { onMount } from "svelte";
  import { TrendingUp, TrendingDown } from "lucide-svelte";
  import { fetchPlayer, fetchRatings } from "./api";
  import HistoricRatingsChart from "./HistoricRatingsChart.svelte";

  let players = [];
  let loading = true;
  let error = false;
  let search = "";
  let division = "all";
  let club = "syndikat-only";
  let selectedPlayer = null;
  let playerLoading = false;
  let playerError = false;
  onMount(() => {
    const controller = new AbortController();
    fetchRatings({ signal: controller.signal })
      .then((data) => {
        players = data;
      })
      .catch((err) => {
        if (err.name !== "AbortError") error = true;
      })
      .finally(() => {
        loading = false;
      });
    return () => controller.abort();
  });

  $: divisions = [...new Set(players.map((player) => player.division))].sort(
    (a, b) => a.localeCompare(b, "de", { numeric: true }),
  );
  $: query = search.toLocaleLowerCase("de");
  $: visiblePlayers = players.filter((player) => {
    const playerClub = player.club || "";
    return (
      (club === "all" ||
        playerClub.includes("Syndikat") ||
        (club === "cologne-only" && playerClub.includes("Köln"))) &&
      (division === "all" || player.division === division) &&
      (`${player.firstName} ${player.lastName}`
        .toLocaleLowerCase("de")
        .includes(query) ||
        playerClub.toLocaleLowerCase("de").includes(query))
    );
  });

  function searchPlayers() {
    club = "all";
    division = "all";
  }

  function avatarColor(player) {
    return avatarColorForName(`${player.firstName} ${player.lastName}`);
  }

  function avatarColorForName(name) {
    const hash = [...name].reduce(
      (value, letter) => (value * 31 + letter.charCodeAt(0)) | 0,
      0,
    );
    return `hsl(${Math.abs(hash) % 360}, 95%, 20%)`;
  }

  function formatDate(value) {
    if (!value) return "–";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "–"
      : date.toLocaleDateString("de-DE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  }

  function formatRating(value) {
    return Number(value).toFixed(0);
  }

  function formatTournamentDates(tournament) {
    const start = formatDate(tournament.startDate);
    const end = formatDate(tournament.endDate);
    return !tournament.endDate || start === end ? start : `${start} – ${end}`;
  }

  async function showPlayer(player) {
    const id = player.gtNumber || new URL(player.link).searchParams.get("gtn");
    if (!id) return;
    selectedPlayer = { name: `${player.firstName} ${player.lastName}`, club: player.club };
    playerLoading = true;
    playerError = false;
    try {
      selectedPlayer = { ...(await fetchPlayer(id)), rating: player.rating };
    } catch (err) {
      playerError = true;
    } finally {
      playerLoading = false;
    }
  }

  function closePlayer() {
    selectedPlayer = null;
  }

  function initials(name = "") {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }
</script>

<div class="toolbar">
  <div class="search__group rating__search">
    <input
      type="search"
      name="search"
      data-rating-search
      class="search__text"
      aria-label="Spieler oder Verein suchen"
      placeholder="Spieler/Verein suchen..."
      bind:value={search}
      on:input={searchPlayers}
      disabled={loading || error}
    />
  </div>
  <div class="rating-filters">
    <select
      data-toggle-division
      aria-label="Division"
      bind:value={division}
      on:change={() => {
        search = "";
      }}
      disabled={loading || error}
    >
      <option value="all">Alle Divisionen</option>
      {#each divisions as item}<option value={item}>{item}</option>{/each}
    </select>
    <select
      data-toggle-club
      aria-label="Vereine"
      bind:value={club}
      on:change={() => {
        search = "";
      }}
      disabled={loading || error}
    >
      <option value="syndikat-only">Nur Syndikat</option>
      <option value="cologne-only">Nur Kölner Clubs</option>
      <option value="all">Alle zeigen</option>
    </select>
  </div>
</div>

<div class="table-responsive" aria-busy={loading}>
  <table
    id="ratings"
    aria-label="Deutschland-Rating der Spielerinnen und Spieler"
  >
    <thead>
      <tr>
        <th scope="col">Rang</th>
        <th scope="col">Name</th>
        <th scope="col">Rating</th>
        <th scope="col">Division</th>
        <th scope="col">Rang in Division</th>
        <th scope="col">DM-Runden</th>
        <th scope="col">letzte Runde</th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        {#each Array(7) as _, index}
          <tr
            class="row-skeleton"
            style:opacity={1 / (index + 1)}
            aria-hidden="true"
          >
            <td>▮</td>
            <td>
              <div class="name-cell">
                <span class="avatar" style:background-color="hsl(0, 10%, 50%)"
                  ><span>▮▮</span></span
                >
                <div class="ranking-name-wrapper">
                  <span>▮▮▮▮▮▮▮▮▮▮▮▮▮▮</span>
                  <div class="ranking-club">▮▮▮▮▮▮▮▮▮▮▮</div>
                </div>
              </div>
            </td>
            <td>▮▮▮</td>
            <td><span class="pill" data-division="Open">▮▮▮▮▮</span></td>
            <td>▮▮▮<span class="percentile">Top ▮▮%</span></td>
            <td>▮/▮▮</td>
            <td>▮▮.▮▮.▮▮▮▮</td>
          </tr>
        {/each}
      {:else if error}
        <tr
          ><td class="ratings-error" colspan="7" role="alert"
            >Ratings konnten gerade nicht geladen werden. Bitte versuche es
            später erneut.</td
          ></tr
        >
      {:else}
        {#each visiblePlayers as player, index}
          <tr data-club={player.club}>
            <td>{index + 1}</td>
            <td>
              <div class="name-cell">
                {#if player.image}
                  <img
                    src={player.image}
                    alt={`${player.firstName} ${player.lastName}`}
                    class="avatar"
                  />
                {:else}
                  <span
                    class="avatar"
                    style:background-color={avatarColor(player)}
                  >
                    <span
                      >{player.firstName?.[0] || ""}{player.lastName?.[0] ||
                        ""}</span
                    >
                  </span>
                {/if}
                <div class="ranking-name-wrapper">
                  <a href={player.link} on:click|preventDefault={() => showPlayer(player)}>{player.firstName} {player.lastName}</a>
                  <div class="ranking-club">{player.club}</div>
                </div>
              </div>
            </td>
            <td>
              {player.rating}
              {#if player.ratingChange > 0}
                <TrendingUp
                  class="lucide color--green"
                  size={24}
                  aria-label="Rating gestiegen"
                />
              {:else if player.ratingChange < 0}
                <TrendingDown
                  class="lucide color--red"
                  size={24}
                  aria-label="Rating gesunken"
                />
              {/if}
            </td>
            <td
              ><span class="pill" data-division={player.division}
                >{player.division}</span
              ></td
            >
            <td>
              {player.divisionRank}
              {#if player.divisionCount > 0}
                <span class="percentile"
                  >Top {Math.ceil(
                    (player.divisionRank / player.divisionCount) * 100,
                  )}%</span
                >
              {/if}
            </td>
            <td>{player.dmRounds}/{player.roundCount}</td>
            <td>{formatDate(player.lastRound)}</td>
          </tr>
        {:else}
          <tr
            ><td class="ratings-error" colspan="7" role="status"
              >Keine Spieler*innen gefunden.</td
            ></tr
          >
        {/each}
      {/if}
    </tbody>
  </table>
</div>

{#if selectedPlayer}
  <div class="rating-modal-backdrop" role="presentation" on:click={closePlayer}>

    <section class="rating-modal" role="dialog" aria-modal="true" aria-labelledby="player-modal-title" on:click|stopPropagation on:keypress|stopPropagation>
      <button class="rating-modal__close" aria-label="Dialog schließen" on:click={closePlayer}>×</button>
      <header class="rating-modal__hero">
        <div class="rating-modal__avatar" style={`background-color: ${avatarColorForName(selectedPlayer.name)}`}>{initials(selectedPlayer.name)}</div>
        <div>
          <p class="rating-modal__eyebrow">Spielerprofil</p>
          <h2 id="player-modal-title">{selectedPlayer.name}</h2>
          {#if selectedPlayer.club}
            <p class="rating-modal__club">{selectedPlayer.club}</p>
          {/if}
        </div>
      </header>
      <div class="rating-modal__content" class:rating-modal__content--state={playerLoading || playerError}>
        {#if playerLoading}
          <p>Spielerdaten werden geladen …</p>
        {:else if playerError}
          <p class="ratings-error">Spielerdaten konnten gerade nicht geladen werden.</p>
        {:else}
        <div class="rating-modal__stats">
          <div><strong>{selectedPlayer.tournaments?.length || 0}</strong><span>Turniere</span></div>
          <div><strong>{selectedPlayer.tournaments?.reduce((sum, item) => sum + (item.rounds?.length || 0), 0) || 0}</strong><span>Runden</span></div>
          <div><strong>{formatRating(selectedPlayer.rating)}</strong><span>Aktuelles Rating</span></div>
          <div><strong>{selectedPlayer.gtNumber}</strong><span>GT-Nummer</span></div>
        </div>
        <h3>Turnierverlauf</h3>
        <HistoricRatingsChart ratings={selectedPlayer.historicRatings} playerName={selectedPlayer.name} />
        {#if selectedPlayer.tournaments?.length}
          {#each selectedPlayer.tournaments as tournament}
            <article class="rating-modal__tournament">
              <div class="rating-modal__tournament-heading">
                <strong><a href={tournament.tournamentId ? `https://rating.discgolf.de/turnier.php?turnier=${tournament.tournamentId}` : tournament.pdgaEventId ? `https://www.pdga.com/tour/event/${tournament.pdgaEventId}` : "#"} target="_blank" rel="noopener noreferrer">{tournament.name}</a></strong>
                <span>{formatTournamentDates(tournament)}</span>
              </div>
              <div class="rating-modal__meta">
                {#if tournament.series && tournament.series !== "Einzelturnier"}<span class="rating-modal__muted">{tournament.series}</span>{/if}
                {#if tournament.tournamentId || tournament.pdgaEventId}
                  <div class="rating-modal__ids">
                    {#if tournament.tournamentId}<a href={`https://rating.discgolf.de/turnier.php?turnier=${tournament.tournamentId}`} target="_blank" rel="noopener noreferrer">discgolf.de</a>{/if}
                    {#if tournament.pdgaEventId}<a href={`https://www.pdga.com/tour/event/${tournament.pdgaEventId}`} target="_blank" rel="noopener noreferrer">PDGA</a>{/if}
                  </div>
                {/if}
              </div>
              {#if tournament.rounds?.length}
                <table class="rating-modal__rounds"><thead><tr><th>Runde</th><th>Rating</th><th>Division</th><th>Bahnen</th><th>Status</th></tr></thead><tbody>
                  {#each tournament.rounds as round}
                    <tr><td><b>R{round.roundNumber}</b></td><td>{formatRating(round.rating)} {#if selectedPlayer.rating && round.rating > selectedPlayer.rating + 10}<TrendingUp class="round-trend color--green" size={16} aria-label="Mehr als 10 Punkte über aktuellem Rating" />{:else if selectedPlayer.rating && round.rating < selectedPlayer.rating - 10}<TrendingDown class="round-trend color--red" size={16} aria-label="Mehr als 10 Punkte unter aktuellem Rating" />{/if}</td><td>{round.division || "–"}</td><td>{round.holes || "–"}</td><td>{round.inRating ? "im Rating" : "–"}</td></tr>
                  {/each}
                </tbody></table>
              {:else}<span class="rating-modal__muted">Keine Runden erfasst.</span>{/if}
            </article>
          {/each}
        {:else}<p>Keine Turnierdaten vorhanden.</p>{/if}
        {/if}
      </div>
    </section>
  </div>
{/if}

<style>
  .rating-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgb(0 0 0 / 55%); }
  .rating-modal { position: relative; width: min(42rem, 100%); max-height: 90vh; overflow: auto; padding: 2rem; border-radius: 1rem; background: var(--background-color, #fff); color: var(--text-color, #222); box-shadow: 0 1rem 3rem rgb(0 0 0 / 30%); }
  .rating-modal__close { position: absolute; top: .5rem; right: .75rem; border: 0; background: transparent; font-size: 2rem; cursor: pointer; }
  .rating-modal__hero { display: flex; align-items: center; gap: 1rem; padding-bottom: 1.5rem; }
  .rating-modal__avatar { display: grid; width: 4.5rem; height: 4.5rem; place-items: center; border-radius: 50%; color: #fff; font-size: 1.35rem; font-weight: 700; }
  .rating-modal__eyebrow { margin: 0; color: var(--brand-color, #4f46e5); font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .rating-modal h2 { margin: .15rem 0; }
  .rating-modal__club, .rating-modal__muted { margin: 0; color: rgb(0 0 0 / 60%); }
  .rating-modal__content { min-height: 34rem; }
  .rating-modal__content--state { display: flex; min-height: 34rem; align-items: center; justify-content: center; }
  .rating-modal__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; margin: 0 0 1.5rem; }
  .rating-modal__stats div { padding: .85rem; border-radius: .65rem; background: rgb(0 0 0 / 5%); }
  .rating-modal__stats strong, .rating-modal__stats span { display: block; }
  .rating-modal__stats strong { font-size: 1.25rem; }
  .rating-modal__stats span { color: rgb(0 0 0 / 60%); font-size: .75rem; }
  .rating-modal__tournament { display: grid; gap: .4rem; padding: 1rem 0; border-top: 1px solid rgb(0 0 0 / 12%); }
  .rating-modal__tournament-heading { display: flex; justify-content: space-between; gap: 1rem; }
  .rating-modal__tournament-heading span { color: var(--text-alt-color, #716f8a); font-size: .85rem; }
  .rating-modal__tournament-heading strong a { color: var(--heading-font-color, #1e2740); }
  .rating-modal__meta { display: flex; width: 100%; align-items: center; gap: 1rem; }
  .rating-modal__rounds { width: 100%; margin-top: .25rem; font-size: .85rem; border-collapse: collapse; }
  .rating-modal__rounds th { color: var(--text-alt-color, #716f8a); font-size: .7rem; font-weight: 600; text-align: left; text-transform: uppercase; }
  .rating-modal__rounds th, .rating-modal__rounds td { padding: .35rem .5rem .35rem 0; }
  .rating-modal__rounds tr + tr { border-top: 1px solid var(--border-color, #f3f7ff); }
  .round-trend { vertical-align: middle; margin-left: .2rem; }
  .rating-modal__ids { display: flex; justify-content: flex-end; gap: .75rem; margin-left: auto; font-size: .8rem; }
  .rating-modal__ids a { color: var(--link-color, #1e2740); text-decoration: none; }
  :global([dark]) .rating-modal__club,
  :global([dark]) .rating-modal__muted { color: var(--text-alt-color, #f0f0f0); }
  :global([dark]) .rating-modal__stats div { background: var(--background-alt-color, #1a1a1f); }
  :global([dark]) .rating-modal__stats span { color: var(--text-alt-color, #f0f0f0); }
  :global([dark]) .rating-modal__tournament-heading strong a,
  :global([dark]) .rating-modal__ids a { color: var(--link-color, #f0f0f0); }
  :global([dark]) .rating-modal__rounds td { color: var(--heading-font-color, #f0f0f0); }
  @media (max-width: 520px) { .rating-modal { padding: 1.25rem; } .rating-modal__stats { grid-template-columns: repeat(2, 1fr); gap: .4rem; } .rating-modal__stats div { padding: .6rem; } .rating-modal__tournament-heading { display: grid; gap: .15rem; } .rating-modal__meta { align-items: flex-start; } }
</style>
