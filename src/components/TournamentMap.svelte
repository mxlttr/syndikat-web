<script>
  import markerClusterPluginUrl from "../assets/vendors/leaflet.markercluster.js?url";
  import "../assets/vendors/MarkerCluster.css";
  import "../assets/vendors/MarkerCluster.Default.css";
  import { resolveApiUrl } from "../utils/api";
  import {
    getExternalUrl,
    getTournamentCoordinates,
    getTournamentMarkerColor,
    getTournamentPopupViewModel,
    groupTournamentWeeks,
  } from "../utils/tournaments";
  import { DEFAULT_VIEW, iconOptions, routeMessages } from "../data/map";
  import { onMount, mount, unmount } from "svelte";
  import TournamentPopup from "./TournamentPopup.svelte";
  import TournamentRow from "./TournamentRow.svelte";
  import MarkerClusterGroup from "./MarkerClusterGroup.svelte";

  let MapComponent, TileLayerComponent, MarkerComponent, PopupComponent;
  let ControlLayersComponent, DivIconComponent;
  let mapInstance;
  const MAP_OPTIONS = { ...DEFAULT_VIEW, zoomControl: false };
  let LeafletMapContextKey;
  let official = [];
  let metrix = [];
  let mapStatus = "loading";
  let tournamentStatus = "loading";
  let tournamentError = "";
  let metrixStatus = "loading";
  let metrixError = "";
  $: tournamentWeeks = groupTournamentWeeks(official ?? []);
  let routeOriginInput;
  let routeOrigin = "";
  let routeStatus = "idle";
  let routeResult = null;
  let routeLayer = null;
  let activeRouteRequest = 0;
  let selectedTournament = null;
  let routeMessage = routeMessages.idle;
  $: if (routeResult?.route?.geometry && mapInstance && mapStatus === "ready") {
    drawRoute(routeResult.route.geometry);
  }

  const API_URL = `${resolveApiUrl()}/tournaments`;

  const endpoints = {
    official: API_URL,
    metrix: API_URL + "/metrix",
    route: API_URL + "/route",
  };

  async function fetchTournaments(url) {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Tournament request failed with ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Tournament response is not an array");
    }

    return data;
  }

  async function loadTournaments() {
    tournamentStatus = "loading";
    tournamentError = "";

    try {
      official = await fetchTournaments(endpoints.official);
      tournamentStatus = official.length ? "success" : "empty";
    } catch (error) {
      official = [];
      tournamentStatus = "error";
      tournamentError = "Turniere konnten nicht geladen werden. Bitte versuche es erneut.";
      console.error(error);
    }
  }

  async function loadMetrixTournaments() {
    metrixStatus = "loading";
    metrixError = "";

    try {
      metrix = await fetchTournaments(endpoints.metrix);
      metrixStatus = metrix.length ? "success" : "empty";
    } catch (error) {
      metrix = [];
      metrixStatus = "error";
      metrixError = "Metrix-Turniere konnten nicht geladen werden. Bitte versuche es erneut.";
      console.error(error);
    }
  }

  async function initializeMap() {
    try {
      const leafletModule = await import("leaflet");
      const leaflet = Object.assign({}, leafletModule.default ?? leafletModule);
      window.L = leaflet;
      LeafletMapContextKey = leaflet.Map;

      if (typeof leaflet.markerClusterGroup !== "function") {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = markerClusterPluginUrl;
          script.onload = () => {
            if (typeof leaflet.markerClusterGroup === "function") {
              resolve();
            } else {
              reject(new Error("Leaflet marker clustering did not initialize"));
            }
          };
          script.onerror = () => reject(new Error("Could not load marker clustering"));
          document.head.append(script);
        });
      }

      const sveaflet = await import("sveaflet");

      MapComponent = sveaflet.Map;
      TileLayerComponent = sveaflet.TileLayer;
      MarkerComponent = sveaflet.Marker;
      PopupComponent = sveaflet.Popup;
      ControlLayersComponent = sveaflet.ControlLayers;
      DivIconComponent = sveaflet.DivIcon;
      mapStatus = "ready";
    } catch (error) {
      mapStatus = "error";
      console.error("Could not load the tournament map", error);
    }
  }

  function getTournamentMarkerIconOptions() {
    const [width, height] = iconOptions.iconSize;
    const color = getTournamentMarkerColor();

    return {
      className: "tournament-map-marker-icon",
      html: `<span aria-hidden="true" style="display:block;width:${width}px;height:${height}px;background:${color};-webkit-mask:url('${iconOptions.iconUrl}') center/100% 100% no-repeat;mask:url('${iconOptions.iconUrl}') center/100% 100% no-repeat"></span>`,
      iconSize: iconOptions.iconSize,
      iconAnchor: iconOptions.iconAnchor,
      popupAnchor: iconOptions.popupAnchor,
    };
  }

  function resetMapView(event) {
    event.preventDefault();
    event.stopPropagation();
    mapInstance?.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
  }

  function zoomMap(event, direction) {
    event.preventDefault();
    event.stopPropagation();
    if (direction > 0) mapInstance?.zoomIn();
    else mapInstance?.zoomOut();
  }

  function stopControlPropagation(event) {
    event.stopPropagation();
  }

  function isSelectedTournament(tournament) {
    if (selectedTournament?.event_id != null && tournament?.event_id != null) {
      return String(selectedTournament.event_id) === String(tournament.event_id);
    }

    return selectedTournament?.title === tournament?.title;
  }

  function clearRouteLayer() {
    routeLayer?.remove?.();
    routeLayer = null;
  }

  function resetRouteState() {
    activeRouteRequest += 1;
    clearRouteLayer();
    routeResult = null;
    routeStatus = "idle";
  }

  function drawRoute(geometry) {
    if (!mapInstance || typeof window.L?.geoJSON !== "function") return;

    clearRouteLayer();
    const color = getComputedStyle(document.documentElement).getPropertyValue("--brand-color").trim() || "#6558d3";
    routeLayer = window.L.geoJSON(geometry, {
      style: { color, weight: 5, opacity: 0.85 },
    }).addTo(mapInstance);

    const bounds = routeLayer.getBounds();
    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 });
    }
  }

  function formatDistance(distanceMeters) {
    const distance = Number(distanceMeters);
    if (!Number.isFinite(distance)) return "";
    if (distance < 1000) return `${Math.round(distance)} m`;

    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(distance / 1000)} km`;
  }

  function formatDuration(durationSeconds) {
    const seconds = Number(durationSeconds);
    if (!Number.isFinite(seconds)) return "";

    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours && remainingMinutes) return `${hours} Std. ${remainingMinutes} Min.`;
    if (hours) return `${hours} Std.`;
    return `${minutes} Min.`;
  }

  function getRouteErrorMessage(code) {
    return typeof code === "string" && Object.prototype.hasOwnProperty.call(routeMessages, code)
      ? routeMessages[code]
      : routeMessages.default;
  }

  async function submitRoute(event) {
    event.preventDefault();

    const origin = routeOrigin.trim();
    const destination = getTournamentCoordinates(selectedTournament);
    if (!selectedTournament || !destination || origin.length < 3) {
      routeStatus = "error";
      routeMessage = routeMessages.INVALID_REQUEST;
      return;
    }

    routeStatus = "loading";
    routeMessage = routeMessages.loading;
    const requestId = ++activeRouteRequest;
    routeResult = null;
    clearRouteLayer();

    const requestBody = {
      origin,
      destination: {
        ...destination,
        address: selectedTournament.location || undefined,
        name: selectedTournament.title || undefined,
      },
    };
    if (selectedTournament.dates?.startTournament) {
      requestBody.date = selectedTournament.dates.startTournament;
    }

    try {
      const response = await fetch(endpoints.route, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json().catch(() => null);
      if (requestId !== activeRouteRequest) return;

      if (!response.ok) {
        routeStatus = "error";
        routeMessage = getRouteErrorMessage(result?.code);
        return;
      }

      const coordinates = result?.route?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        routeStatus = "error";
        routeMessage = routeMessages.default;
        return;
      }

      routeResult = result;
      routeStatus = "success";
      routeMessage = "Route berechnet.";
    } catch (error) {
      if (requestId !== activeRouteRequest) return;
      routeStatus = "error";
      routeMessage = routeMessages.default;
      console.error("Could not calculate tournament route", error);
    }
  }

  function clearPlannedRoute() {
    resetRouteState();
    routeMessage = selectedTournament ? getSelectedTournamentMessage(selectedTournament) : routeMessages.idle;
  }

  function getSelectedTournamentMessage(tournament) {
    return `${tournament.title || "Das Turnier"} ausgewählt. Gib eine Startadresse ein, um die Route zu planen.`;
  }

  function selectTournament(tournament, marker = null) {
    resetRouteState();
    selectedTournament = tournament;
    routeMessage = getSelectedTournamentMessage(tournament);
    marker?.closePopup();
    routeOriginInput?.focus();
  }

  function createPopupContent(tournament, marker) {
    const target = document.createElement("div");
    const popup = mount(TournamentPopup, {
      target,
      props: {
        tournament: getTournamentPopupViewModel(tournament),
        onRoute: () => selectTournament(tournament, marker),
      },
    });

    marker.once("popupclose", () => {
      void unmount(popup);
    });

    return target;
  }

  onMount(() => {
    void initializeMap();
    void loadTournaments();
    void loadMetrixTournaments();
  });
</script>

<section class="tournament-route-planner" aria-labelledby="tournament-route-title">
  <p class="tournament-route-planner__eyebrow">Anfahrt zum Turnier</p>
  <h2 id="tournament-route-title" class="tournament-route-planner__title">Route mit dem Auto berechnen</h2>
  <p class="tournament-route-planner__copy">
    Wähle zuerst ein Turnier auf der Karte aus und gib dann eine vollständige Startadresse ein. Für das MVP
    funktionieren Straße, Hausnummer, Postleitzahl und Ort am verlässlichsten.
  </p>

  <form class="tournament-route-form" onsubmit={submitRoute}>
    <label class="screen-reader-text" for="route-origin">Startadresse</label>
    <input
      bind:this={routeOriginInput}
      bind:value={routeOrigin}
      id="route-origin"
      name="origin"
      type="text"
      class="tournament-route-form__input"
      placeholder="Straße, Hausnummer, Postleitzahl, Ort"
      autocomplete="street-address"
      minlength="3"
      required
    />
    <button
      type="submit"
      class="button button--text tournament-route-form__button"
      disabled={!selectedTournament || routeOrigin.trim().length < 3 || routeStatus === "loading"}
    >
      {routeStatus === "loading" ? "Route wird berechnet …" : "Route berechnen"}
    </button>
  </form>

  <div class="tournament-route-feedback" data-state={routeStatus}>
    <p
      class="tournament-route-feedback__message"
      role={routeStatus === "error" ? "alert" : "status"}
      aria-live={routeStatus === "error" ? "assertive" : "polite"}
    >
      {routeMessage}
    </p>

    {#if routeResult}
      <div class="tournament-route-summary">
        <p class="tournament-route-summary__tournament">
          {routeResult.resolvedPoints?.origin?.text || routeOrigin}
          →
          {routeResult.resolvedPoints?.destination?.text || selectedTournament?.title}
        </p>
        <div class="tournament-route-summary__meta">
          {#if formatDistance(routeResult.route?.distanceMeters)}
            <span>{formatDistance(routeResult.route.distanceMeters)}</span>
          {/if}
          {#if formatDuration(routeResult.route?.durationSeconds)}
            <span>{formatDuration(routeResult.route.durationSeconds)}</span>
          {/if}
        </div>
        <div class="tournament-route-summary__actions">
          {#if getExternalUrl(routeResult.train?.url)}
            <a href={getExternalUrl(routeResult.train.url)} target="_blank" rel="noopener noreferrer">
              Mit der Bahn suchen
            </a>
          {/if}
          <button type="button" class="button button--text" onclick={clearPlannedRoute}> Route entfernen </button>
        </div>
      </div>
    {/if}
  </div>
</section>

{#if mapStatus === "loading"}
  <p class="tournaments-overview__status" role="status" aria-live="polite">Karte wird geladen …</p>
{:else if mapStatus === "error"}
  <div class="tournaments-overview__status" role="alert">
    <p>Die Turnierkarte konnte nicht geladen werden.</p>
    <button type="button" class="button button--text" onclick={initializeMap}> Erneut versuchen </button>
  </div>
{:else if MapComponent && TileLayerComponent && MarkerComponent}
  <div id="tournaments-map">
    <MapComponent options={MAP_OPTIONS} bind:instance={mapInstance}>
      <TileLayerComponent url={"https://tile.openstreetmap.org/{z}/{x}/{y}.png"} />
      <ControlLayersComponent>
        <MarkerClusterGroup contextKey={LeafletMapContextKey} name="Discgolf.de" layerType="base" checked>
          {#each official as tournament}
            {#if tournament?.coords?.lat && tournament?.coords?.lng}
              <MarkerComponent latLng={[tournament.coords.lat, tournament.coords.lng]}>
                <DivIconComponent options={getTournamentMarkerIconOptions()} />
                <PopupComponent
                  options={{
                    content: (markerInstance) => createPopupContent(tournament, markerInstance),
                  }}
                />
              </MarkerComponent>
            {/if}
          {/each}
        </MarkerClusterGroup>
        <MarkerClusterGroup contextKey={LeafletMapContextKey} name="Metrix" layerType="base">
          {#each metrix as tournament}
            {#if tournament?.coords?.lat && tournament?.coords?.lng}
              <MarkerComponent latLng={[tournament.coords.lat, tournament.coords.lng]}>
                <DivIconComponent options={getTournamentMarkerIconOptions()} />
                <PopupComponent
                  options={{
                    content: (markerInstance) => createPopupContent(tournament, markerInstance),
                  }}
                />
              </MarkerComponent>
            {/if}
          {/each}
        </MarkerClusterGroup>
      </ControlLayersComponent>
    </MapComponent>
    <div class="tournament-map-controls" role="group" aria-label="Kartensteuerung">
      <button
        type="button"
        class="tournament-map-controls__button"
        aria-label="Karte vergrößern"
        title="Karte vergrößern"
        onmousedown={stopControlPropagation}
        ontouchstart={stopControlPropagation}
        onclick={(event) => zoomMap(event, 1)}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        class="tournament-map-controls__button"
        aria-label="Karte verkleinern"
        title="Karte verkleinern"
        onmousedown={stopControlPropagation}
        ontouchstart={stopControlPropagation}
        onclick={(event) => zoomMap(event, -1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        class="tournament-map-controls__button"
        aria-label="Kartenansicht zurücksetzen"
        title="Kartenansicht zurücksetzen"
        onmousedown={stopControlPropagation}
        ontouchstart={stopControlPropagation}
        onclick={resetMapView}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if metrixStatus === "loading"}
  <p class="tournaments-overview__status" role="status" aria-live="polite">Metrix-Turniere werden geladen …</p>
{:else if metrixStatus === "error"}
  <div class="tournaments-overview__status" role="alert">
    <p>{metrixError}</p>
    <button type="button" class="button button--text" onclick={loadMetrixTournaments}> Erneut versuchen </button>
  </div>
{:else if metrixStatus === "empty"}
  <p class="tournaments-overview__status" role="status" aria-live="polite">
    Für die Metrix-Ebene sind derzeit keine Turniere verfügbar.
  </p>
{/if}

<section class="tournaments-overview" aria-labelledby="upcoming-tournaments-title">
  <div class="tournaments-overview__intro">
    <p class="tournaments-overview__eyebrow">Offizielle Turniere</p>
    <h2 id="upcoming-tournaments-title" class="tournaments-overview__title">Alle anstehenden Turniere</h2>
    <p class="tournaments-overview__copy">
      Die Liste zeigt die anstehenden Turniere von <a href="https://turniere.discgolf.de/" target="_blank"
        >turniere.discgolf.de</a
      >, mit Datum, Ort, Status und aktueller Auslastung.
    </p>
  </div>

  {#if tournamentStatus === "loading"}
    <p class="tournaments-overview__status" role="status" aria-live="polite">Lade Turniere …</p>
  {:else if tournamentStatus === "error"}
    <div class="tournaments-overview__status" role="alert">
      <p>{tournamentError}</p>
      <button type="button" class="button button--text" onclick={loadTournaments}> Erneut versuchen </button>
    </div>
  {:else if tournamentStatus === "empty"}
    <p class="tournaments-overview__status" role="status" aria-live="polite">
      Zurzeit sind keine anstehenden Turniere verfügbar.
    </p>
  {:else}
    <div class="table-responsive tournaments-overview__table-wrapper" data-upcoming-table-wrapper>
      <table class="tournaments-table">
        <thead>
          <tr>
            <th scope="col" aria-label="Status"></th>
            <th scope="col">Turnier</th>
            <th scope="col">Datum</th>
            <th scope="col">Ort</th>
            <th scope="col">Plätze</th>
            <th scope="col">Aktion</th>
          </tr>
        </thead>
        <tbody data-upcoming-body>
          {#each tournamentWeeks as week (week.key)}
            <tr class="tournaments-table__week">
              <th colspan="6">{week.label}</th>
            </tr>
            {#each week.tournaments as tournament (tournament.event_id || tournament.title)}
              <TournamentRow
                {tournament}
                selected={isSelectedTournament(tournament)}
                onSelect={(selected) => selectTournament(selected)}
              />
            {/each}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
