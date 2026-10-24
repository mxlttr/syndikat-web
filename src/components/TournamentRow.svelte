<script>
  import { formatDate } from "../utils/dates";
  import { getExternalUrl, getTournamentAvatarColor, getTournamentCoordinates } from "../utils/tournaments";

  export let tournament;
  export let variant = "upcoming";
  export let onSelect = null;
  export let selected = false;

  $: onTour = variant === "on-tour";
  $: dateRange = getTournamentDateRange(tournament);
  $: tournamentLink = getExternalUrl(tournament?.link);
  $: freeSpots = getFreeSpots(tournament);
  $: registrationStatus = getTournamentRegistrationStatus(tournament, freeSpots);
  $: avatarColor = getTournamentAvatarColor(tournament);
  $: initials = getTournamentInitials(tournament?.title);
  $: title = tournament?.title || "Unbenanntes Turnier";
  $: overallSpots = Number(tournament?.spots?.overall);
  $: hasCoordinates = Boolean(getTournamentCoordinates(tournament));
  $: spotsLabel = tournament?.spots?.overall ? `${freeSpots} / ${overallSpots}` : "k. A.";
  $: players = Array.isArray(tournament?.our_players) ? tournament.our_players : [];
  $: starters = players.filter((player) => player?.waitlisted !== true).map(formatPlayerName);
  $: waitlist = players.filter((player) => player?.waitlisted === true).map(formatPlayerName);
  $: playerList = [starters.join(", "), waitlist.length ? `(${waitlist.join(", ")})` : ""].filter(Boolean).join(", ");

  function getTournamentDateRange(item) {
    const start = item?.dates?.startTournament;
    const end = item?.dates?.endTournament;

    if (!start) return null;

    return {
      start: formatDate(start),
      end: end && start !== end ? formatDate(end) : null,
    };
  }

  function getFreeSpots(item) {
    const overall = Number(item?.spots?.overall);
    const used = Number(item?.spots?.used);

    if (!Number.isFinite(overall) || overall <= 0) return 0;
    if (!Number.isFinite(used) || used < 0) return overall;

    return Math.max(overall - used, 0);
  }

  function getTournamentRegistrationStatus(item, availableSpots) {
    if (availableSpots <= 0) return "already full";

    const registrationDate = item?.dates?.startRegistration;
    if (!registrationDate) return "";

    const registrationStartsAt = new Date(registrationDate);
    if (Number.isNaN(registrationStartsAt.getTime())) return "";

    return registrationStartsAt > new Date() ? "registration soon" : "registration open";
  }

  function getTournamentInitials(value = "") {
    const words = String(value).trim().split(/\s+/).filter(Boolean).slice(0, 2);

    if (!words.length) return "TT";
    return words.map((word) => word.charAt(0).toUpperCase()).join("");
  }

  function formatPlayerName(player) {
    return String(player?.name || "")
      .split(", ")
      .reverse()
      .join(" ");
  }
</script>

<tr data-event-id={String(tournament?.event_id || "")} class:is-selected={selected}>
  <td data-label="Status">
    <span
      class="tournaments-table__indicator"
      class:is-active={registrationStatus}
      role="img"
      data-registration-status={registrationStatus}
      aria-label={registrationStatus || "n/a"}
    ></span>
  </td>

  <td data-label="Turnier">
    <div class="tournaments-table__name-cell">
      <span class="avatar tournaments-table__avatar" style={`background-color: ${avatarColor};`}>
        <span>{initials}</span>
      </span>
      <div class="tournaments-table__heading">
        {#if !onTour && tournament?.badge}
          <span class="pill tournaments-table__badge" data-tournament-badge={tournament.badge}>{tournament.badge}</span>
        {/if}
        <div class="tournaments-table__title">
          {#if tournamentLink}
            <a href={tournamentLink} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          {:else}
            {title}
          {/if}
        </div>
      </div>
    </div>
  </td>

  <td data-label="Datum">
    {#if !dateRange}
      <span class="tournaments-table__date">noch unbekannt</span>
    {:else if dateRange.end}
      <div class="tournaments-table__date tournaments-table__date--range">
        <span>{dateRange.start}</span>
        <span>{dateRange.end}</span>
      </div>
    {:else}
      <span class="tournaments-table__date">{dateRange.start}</span>
    {/if}
  </td>

  {#if onTour}
    <td data-label="Spieler*innen">{playerList || "–"}</td>
  {:else}
    <td data-label="Ort">{tournament?.location || "Unbekannt"}</td>
    <td data-label="Plätze">{spotsLabel}</td>
    <td data-label="Aktion">
      <div class="tournaments-table__actions">
        <button
          type="button"
          class="button button--text tournaments-table__select-button"
          data-select-event={String(tournament?.event_id || "")}
          disabled={!onSelect || !hasCoordinates}
          onclick={() => onSelect?.(tournament)}
        >
          Route
        </button>
      </div>
    </td>
  {/if}
</tr>
