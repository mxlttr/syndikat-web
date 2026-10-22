<script>
  import { onMount } from "svelte";
  import { TrendingUp, TrendingDown, X } from "lucide-svelte";
  import { fetchPlayer, fetchRatings } from "./api";
  import HistoricRatingsChart from "./HistoricRatingsChart.svelte";
  import { l, locale } from "./i18n.js";

  let players = [];
  let loading = true;
  let error = false;
  let search = "";
  let division = "all";
  let club = "syndikat-only";
  let selectedPlayer = null;
  let playerLoading = false;
  let playerError = false;
  let noResultsEventKey = "";
  let searchInputElement;
  let ratingsController;
  const pageSize = 50;
  let currentPage = 1;
  let totalPlayers = 0;
  let divisions = [];
  let searchTimer;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function trackEvent(eventName, data = {}) {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(eventName, data);
    }
  }

  function trackExternalLink(destination) {
    trackEvent("ratings_external_link_click", { destination });
  }

  function syncFilterUrl() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const query = search.trim();

    if (query) params.set("search", query);
    else params.delete("search");
    params.delete("q");
    if (division !== "all") params.set("division", division);
    else params.delete("division");
    if (club !== "syndikat-only") params.set("club", club);
    else params.delete("club");

    const nextUrl = `${url.pathname}${params.toString() ? `?${params}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function restoreFiltersFromUrl() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlClub = params.get("club");

    search = params.get("search") || params.get("q") || "";
    division = params.get("division") || "all";
    club = ["syndikat-only", "cologne-only", "all"].includes(urlClub)
      ? urlClub
      : "syndikat-only";
  }

  async function loadRatings(requestedPage = currentPage) {
    ratingsController?.abort();
    const controller = new AbortController();
    ratingsController = controller;
    loading = true;
    error = false;
    fetchRatings({
      signal: controller.signal,
      club: club === "syndikat-only" ? "Syndikat" : club === "cologne-only" ? "Köln,Syndikat" : "",
      division,
      search,
      page: requestedPage,
      pageSize,
    })
      .then((result) => {
        players = result.items.map((player) => ({
          ...player,
          lastRoundLabel: formatDate(player.lastRound),
        }));
        totalPlayers = result.total;
        divisions = result.divisions;
        currentPage = requestedPage;
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          window.Sentry?.captureException(err);
          error = true;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && ratingsController === controller) loading = false;
      });
  }

  onMount(() => {
    restoreFiltersFromUrl();
    loadRatings();
    return () => {
      ratingsController?.abort();
    };
  });

  function showModal(node) {
    node.showModal();
    return {
      destroy() {
        if (node.open) node.close();
      },
    };
  }

  $: totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));

  $: if (!loading && !error && totalPlayers === 0) {
    const key = `${search}|${division}|${club}`;
    if (key !== noResultsEventKey) {
      noResultsEventKey = key;
    }
  }

  function searchPlayers() {
    if (club !== "all") {
      club = "all";
      division = "all";
    }
    syncFilterUrl();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadRatings(1), 250);
  }

  function clearPlayerSearch() {
    search = "";
    searchPlayers();
    searchInputElement?.focus();
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
    return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
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
    selectedPlayer = { name: `${player.firstName} ${player.lastName}`, club: player.club, divisionRank: player.divisionRank };
    playerLoading = true;
    playerError = false;
    try {
      const playerDetails = await fetchPlayer(id);
      selectedPlayer = {
        ...playerDetails,
        club: playerDetails.club || player.club,
        rating: player.rating,
        divisionRank: player.divisionRank,
      };
    } catch (err) {
      window.Sentry?.captureException(err);
      playerError = true;
    } finally {
      playerLoading = false;
    }
  }

  function closePlayer() {
    selectedPlayer = null;
  }

  function handleDialogKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePlayer();
    }
  }

  function handleDialogClick(event) {
    if (event.target === event.currentTarget) closePlayer();
  }

  function openPlayer(player) {
    trackEvent("ratings_player_open", {
      gtNumber: player.gtNumber,
      name: `${player.firstName} ${player.lastName}`,
    });
    showPlayer(player);
  }

  function handlePlayerRowKeydown(event, player) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPlayer(player);
  }

  function initials(name = "") {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }
</script>

<div class="toolbar">
  <div class="search__group rating__search">
    {#if search}
      <button
        type="button"
        class="search__close"
        aria-label={l({ de: "Suche löschen", en: "Clear search" })}
        title={l({ de: "Suche löschen", en: "Clear search" })}
        on:click={clearPlayerSearch}
      >
        <X size={18} aria-hidden="true" />
      </button>
    {/if}
    <input
      type="search"
      name="search"
      data-rating-search
      class="search__text"
      bind:this={searchInputElement}
      aria-label={l({ de: "Spieler oder Verein suchen", en: "Search player or club" })}
      placeholder={l({ de: "Spieler/Verein suchen...", en: "Search player/club..." })}
      bind:value={search}
      on:input={searchPlayers}
      disabled={error || (loading && players.length === 0)}
    />
  </div>
  <div class="rating-filters">
    <select
      data-toggle-division
      aria-label="Division"
      bind:value={division}
      on:change={() => {
        search = "";
        syncFilterUrl();
        loadRatings(1);
      }}
      disabled={loading || error}
    >
      <option value="all">{l({ de: "Alle Divisionen", en: "All divisions" })}</option>
      {#each divisions as item}<option value={item}>{item}</option>{/each}
    </select>
    <select
      data-toggle-club
      aria-label={l({ de: "Vereine", en: "Clubs" })}
      bind:value={club}
      on:change={() => {
        search = "";
        syncFilterUrl();
        loadRatings(1);
      }}
      disabled={loading || error}
    >
      <option value="syndikat-only">{l({ de: "Nur Syndikat", en: "Syndikat only" })}</option>
      <option value="cologne-only">{l({ de: "Nur Kölner Clubs", en: "Cologne clubs only" })}</option>
      <option value="all">{l({ de: "Alle zeigen", en: "Show all" })}</option>
    </select>
  </div>
</div>

<div class="table-responsive" aria-busy={loading}>
  <table
    id="ratings"
    aria-label={l({ de: "Deutschland-Rating der Spielerinnen und Spieler", en: "German ratings of players" })}
  >
    <thead>
      <tr>
        <th scope="col">{l({ de: "Rang", en: "Rank" })}</th>
        <th scope="col">Name</th>
        <th scope="col">Rating</th>
        <th scope="col">Division</th>
        <th scope="col">{l({ de: "Rang in Division", en: "Division rank" })}</th>
        <th scope="col">{l({ de: "Runden", en: "Rounds" })}</th>
        <th scope="col">letzte Runde</th>
      </tr>
    </thead>
    <tbody>
      {#if loading && players.length === 0}
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
      {:else if error && players.length === 0}
        <tr
          ><td class="ratings-error" colspan="7" role="alert"
            >{l({ de: "Ratings konnten gerade nicht geladen werden. Bitte versuche es später erneut.", en: "Ratings could not be loaded right now. Please try again later." })}</td
          ></tr
        >
      {:else}
        {#if error}
          <tr><td class="ratings-error" colspan="7" role="alert">{l({ de: "Die Aktualisierung konnte nicht geladen werden. Die zuletzt geladenen Ratings werden angezeigt.", en: "The update could not be loaded. Showing the most recently loaded ratings." })}</td></tr>
        {/if}
        {#each players as player, index (player.gtNumber || player.link)}
          <tr
            class="rating-player-row"
            data-club={player.club}
            role="button"
            tabindex="0"
            aria-label={l({ de: `Spielerprofil von ${player.firstName} ${player.lastName} öffnen`, en: `Open player profile of ${player.firstName} ${player.lastName}` })}
            on:click={() => openPlayer(player)}
            on:keydown={(event) => handlePlayerRowKeydown(event, player)}
          >
            <td>{(currentPage - 1) * pageSize + index + 1}</td>
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
                  <span class="ranking-name-link">{player.firstName} {player.lastName}</span>
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
                  aria-label={l({ de: "Rating gestiegen", en: "Rating increased" })}
                />
              {:else if player.ratingChange < 0}
                <TrendingDown
                  class="lucide color--red"
                  size={24}
                  aria-label={l({ de: "Rating gesunken", en: "Rating decreased" })}
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
            <td>{player.roundCount}</td>
            <td>{player.lastRoundLabel}</td>
          </tr>
        {:else}
          <tr
            ><td class="ratings-error" colspan="7" role="status"
              >{l({ de: "Keine Spieler*innen gefunden.", en: "No players found." })}</td
            ></tr
          >
        {/each}
      {/if}
    </tbody>
  </table>
</div>

{#if !loading && !error && totalPages > 1}
  <nav class="ratings-pagination" aria-label={l({ de: "Ratingseiten", en: "Rating pages" })}>
    <button type="button" class="button button--text" on:click={() => loadRatings(currentPage - 1)} disabled={loading || currentPage === 1}>← {l({ de: "Zurück", en: "Back" })}</button>
    <span>{l({ de: `Seite ${currentPage} von ${totalPages} · ${totalPlayers} Spieler*innen`, en: `Page ${currentPage} of ${totalPages} · ${totalPlayers} players` })}</span>
    <button type="button" class="button button--text" on:click={() => loadRatings(currentPage + 1)} disabled={loading || currentPage === totalPages}>{l({ de: "Weiter", en: "Next" })} →</button>
  </nav>
{/if}

{#if selectedPlayer}
  <dialog class="rating-modal" aria-labelledby="player-modal-title" use:showModal on:click={handleDialogClick} on:keydown={handleDialogKeydown} on:close={closePlayer}>
      <button class="rating-modal__close" aria-label={l({ de: "Dialog schließen", en: "Close dialog" })} on:click={closePlayer}>×</button>
      <header class="rating-modal__hero">
        <div class="rating-modal__avatar" style={`background-color: ${avatarColorForName(selectedPlayer.name)}`}>{initials(selectedPlayer.name)}</div>
        <div>
          <p class="rating-modal__eyebrow">{l({ de: "Spielerprofil", en: "Player profile" })}</p>
          <h2 id="player-modal-title">{selectedPlayer.name}</h2>
          {#if selectedPlayer.club}
            <p class="rating-modal__club">{selectedPlayer.club}</p>
          {/if}
        </div>
      </header>
      <div class="rating-modal__content" class:rating-modal__content--state={playerLoading || playerError}>
        {#if playerLoading}
          <p>{l({ de: "Spielerdaten werden geladen …", en: "Loading player data …" })}</p>
        {:else if playerError}
          <p class="ratings-error">{l({ de: "Spielerdaten konnten gerade nicht geladen werden.", en: "Player data could not be loaded right now." })}</p>
        {:else}
        <div class="rating-modal__stats">
          <div><strong>{selectedPlayer.tournaments?.length || 0}</strong><span>{l({ de: "Turniere", en: "Tournaments" })}</span></div>
          <div><strong>{selectedPlayer.tournaments?.reduce((sum, item) => sum + (item.rounds?.length || 0), 0) || 0}</strong><span>{l({ de: "Runden", en: "Rounds" })}</span></div>
          <div><strong>{formatRating(selectedPlayer.rating)}</strong><span>{l({ de: "Aktuelles Rating", en: "Current rating" })}</span></div>
          <div><strong>{selectedPlayer.divisionRank}</strong><span>{l({ de: "Rang in Division", en: "Division rank" })}</span></div>
          <div><strong>{selectedPlayer.gtNumber}</strong><span>GT-Nummer</span></div>
        </div>
        <h3>{l({ de: "Turnierverlauf", en: "Tournament history" })}</h3>
        <HistoricRatingsChart ratings={selectedPlayer.historicRatings} playerName={selectedPlayer.name} />
        {#if selectedPlayer.tournaments?.length}
          {#each selectedPlayer.tournaments as tournament}
            <article class="rating-modal__tournament">
              <div class="rating-modal__tournament-heading">
                <strong><a href={tournament.tournamentId ? `https://rating.discgolf.de/turnier.php?turnier=${tournament.tournamentId}` : tournament.pdgaEventId ? `https://www.pdga.com/tour/event/${tournament.pdgaEventId}` : "#"} target="_blank" rel="noopener noreferrer" on:click={() => trackExternalLink(tournament.tournamentId ? "gt" : "pdga")}>{tournament.name}</a></strong>
                <span>{formatTournamentDates(tournament)}</span>
              </div>
              <div class="rating-modal__meta">
                {#if tournament.series && tournament.series !== "Einzelturnier"}<span class="rating-modal__muted">{tournament.series}</span>{/if}
                {#if tournament.tournamentId || tournament.pdgaEventId}
                  <div class="rating-modal__ids">
                    {#if tournament.tournamentId}<a href={`https://rating.discgolf.de/turnier.php?turnier=${tournament.tournamentId}`} target="_blank" rel="noopener noreferrer" on:click={() => trackExternalLink("gt")}>discgolf.de</a>{/if}
                    {#if tournament.pdgaEventId}<a href={`https://www.pdga.com/tour/event/${tournament.pdgaEventId}`} target="_blank" rel="noopener noreferrer" on:click={() => trackExternalLink("pdga")}>PDGA</a>{/if}
                  </div>
                {/if}
              </div>
              {#if tournament.rounds?.length}
                <table class="rating-modal__rounds"><thead><tr><th>{l({ de: "Runde", en: "Round" })}</th><th>Rating</th><th>Division</th><th>{l({ de: "Bahnen", en: "Holes" })}</th><th>Status</th></tr></thead><tbody>
                  {#each tournament.rounds as round}
                    <tr><td><b>R{round.roundNumber}</b></td><td>{formatRating(round.rating)} {#if selectedPlayer.rating && round.rating > selectedPlayer.rating + 10}<TrendingUp class="round-trend color--green" size={16} aria-label="Mehr als 10 Punkte über aktuellem Rating" />{:else if selectedPlayer.rating && round.rating < selectedPlayer.rating - 10}<TrendingDown class="round-trend color--red" size={16} aria-label="Mehr als 10 Punkte unter aktuellem Rating" />{/if}</td><td>{round.division || "–"}</td><td>{round.holes || "–"}</td><td>{round.inRating ? "im Rating" : "–"}</td></tr>
                  {/each}
                </tbody></table>
              {:else}<span class="rating-modal__muted">{l({ de: "Keine Runden erfasst.", en: "No rounds recorded." })}</span>{/if}
            </article>
          {/each}
        {:else}<p>{l({ de: "Keine Turnierdaten vorhanden.", en: "No tournament data available." })}</p>{/if}
        {/if}
      </div>
  </dialog>
{/if}

<style>
  :global(body:has(dialog:modal)) { overflow: hidden; }
  .rating__search .search__text { padding-right: 64px; }
  :global(.rating__search input[type="search"]::-webkit-search-cancel-button) { -webkit-appearance: none; appearance: none; }
  .rating-player-row { cursor: pointer; }
  .rating-player-row:hover, .rating-player-row:focus-visible { background: var(--background-alt-color, rgb(0 0 0 / 5%)); outline: none; }
  :global(#ratings .rating-player-row:hover > td), :global(#ratings .rating-player-row:focus-visible > td) { background: var(--background-alt-color, rgb(0 0 0 / 5%)); }
  .ranking-name-link { display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rating-modal { position: fixed; inset: 0; display: flex; box-sizing: border-box; flex-direction: column; width: min(42rem, calc(100% - 2rem)); height: min(90vh, 56rem); max-width: none; max-height: none; overflow: hidden; margin: auto; padding: 2rem; border: 0; border-radius: 1rem; background: var(--background-color, #fff); color: var(--text-color, #222); box-shadow: 0 1rem 3rem rgb(0 0 0 / 30%); }
  .rating-modal::backdrop { background: rgb(0 0 0 / 55%); }
  .rating-modal__close { position: absolute; top: .5rem; right: .75rem; border: 0; background: transparent; color: inherit; -webkit-appearance: none; appearance: none; -webkit-text-fill-color: currentColor; font-size: 2rem; cursor: pointer; }
  .rating-modal__hero { display: flex; flex: 0 0 auto; align-items: center; gap: 1rem; padding-bottom: 1.5rem; }
  .rating-modal__avatar { display: grid; width: 4.5rem; height: 4.5rem; place-items: center; border-radius: 50%; color: #fff; font-size: 1.35rem; font-weight: 700; }
  .rating-modal__eyebrow { margin: 0; color: var(--brand-color, #4f46e5); font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .rating-modal h2 { margin: .15rem 0; }
  .rating-modal__club, .rating-modal__muted { margin: 0; color: rgb(0 0 0 / 60%); }
  .rating-modal__content { min-height: 0; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; }
  .rating-modal__content--state { display: flex; min-height: 34rem; align-items: center; justify-content: center; }
  .rating-modal__stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: .75rem; margin: 0 0 1.5rem; }
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
  .ratings-pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin: 1rem 0 2rem; font-size: .85rem; }
  :global(.round-trend) { vertical-align: middle; margin-left: .2rem; }
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
