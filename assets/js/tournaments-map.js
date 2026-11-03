const API_URL = `${resolveApiBaseUrl()}/tournaments`;
const endpoints = {
  official: API_URL,
  metrix: API_URL + "/metrix",
  route: API_URL + "/route"
};

const DEFAULT_VIEW = {
  center: [51, 9.5],
  zoom: 6
};

const routeMessages = localize({
  de: {
    idle: "Wähle ein Turnier auf der Karte, um die Route zu planen.",
    loading: "Route wird berechnet...",
    INVALID_REQUEST: "Die Anfrage war unvollständig. Bitte prüfe deine Eingabe noch einmal.",
    INVALID_ADDRESS: "Startadresse nicht gefunden. Bitte gib eine vollständige Straßenadresse ein.",
    NO_ROUTE_FOUND: "Für diese Strecke konnte keine befahrbare Route gefunden werden.",
    UPSTREAM_QUOTA_EXCEEDED: "Die Routenberechnung ist gerade ausgelastet. Bitte versuche es später noch einmal.",
    UPSTREAM_ERROR: "Die Routenberechnung ist im Moment nicht verfügbar. Bitte versuche es später erneut.",
    default: "Die Route konnte nicht geladen werden. Bitte versuche es noch einmal."
  },
  en: {
    idle: "Select a tournament on the map to plan your route.",
    loading: "Calculating route...",
    INVALID_REQUEST: "The request was incomplete. Please check your input again.",
    INVALID_ADDRESS: "Starting address not found. Please enter a complete street address.",
    NO_ROUTE_FOUND: "No drivable route could be found for this trip.",
    UPSTREAM_QUOTA_EXCEEDED: "The route service is busy right now. Please try again later.",
    UPSTREAM_ERROR: "The route service is currently unavailable. Please try again later.",
    default: "The route could not be loaded. Please try again."
  }
});

const UNKNOWN = localize({ de: "Unbekannt", en: "Unknown" });
const NOT_YET_KNOWN = localize({ de: "noch unbekannt", en: "not yet known" });

const state = {
  map: null,
  selectedTournament: null,
  selectedMarker: null,
  routeLayer: null,
  routeMarkersLayer: null
};

const ui = {
  form: document.querySelector("[data-route-form]"),
  originInput: document.querySelector("[data-route-origin]"),
  submitButton: document.querySelector("[data-route-submit]"),
  feedback: document.querySelector("[data-route-feedback]"),
  message: document.querySelector("[data-route-message]"),
  summary: document.querySelector("[data-route-summary]"),
  selected: document.querySelector("[data-route-selected]"),
  distance: document.querySelector("[data-route-distance]"),
  duration: document.querySelector("[data-route-duration]"),
  originConfirmation: document.querySelector("[data-route-origin-confirmation]"),
  trainLink: document.querySelector("[data-route-train]"),
  upcomingStatus: document.querySelector("[data-upcoming-status]"),
  upcomingTableWrapper: document.querySelector("[data-upcoming-table-wrapper]"),
  upcomingBody: document.querySelector("[data-upcoming-body]")
};

initMap();

if (ui.form) {
  ui.form.addEventListener("submit", handleRouteSubmit);
}

if (ui.originInput) {
  ui.originInput.addEventListener("input", () => updateSubmitState());
}

async function getTournaments(type) {
  try {
    const url = endpoints[type];
    const response = await fetch(url, { credentials: 'include' });
    return await response.json();
  } catch (error) {
    window.Sentry?.captureException(error);
    console.error(error);
    return [];
  }
}

async function initMap() {
  const osmLayer = L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.de/copyright">OpenStreetMap</a>'
  });

  const tournaments = await getTournaments("official");
  const metrix = await getTournaments("metrix");
  renderUpcomingTournaments(tournaments);

  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  const metrixMarkers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40
  });

  metrix.forEach((tournament) => renderMarker(tournament, metrixMarkers));
  tournaments.forEach((tournament) => renderMarker(tournament, markers));

  state.map = L.map("tournaments-map", {
    layers: [osmLayer, markers]
  }).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);

  if (state.map.messagebox) {
    state.map.messagebox.options.timeout = 99999;
    state.map.messagebox.show(localize({ de: "Hinweis: Cookies akzeptieren, um Turniere zu laden.", en: "Note: accept cookies to load tournaments." }));
  }

  L.control.layers({
    "Discgolf.de": markers,
    Metrix: metrixMarkers
  }).addTo(state.map);

  L.control.resetView({
    position: "topleft",
    title: "Reset view",
    latlng: L.latLng(DEFAULT_VIEW.center),
    zoom: DEFAULT_VIEW.zoom
  }).addTo(state.map);
}

function renderMarker(tournament, layer) {
  if (!tournament?.coords?.lat || !tournament?.coords?.lng) return;

  const iconElement = document.querySelector("template[data-icon]").content.firstElementChild.cloneNode(true);
  iconElement.style.fill = `hsl(220deg 50% ${Math.floor(Math.random() * (70 - 50 + 1) + 50)}%)`;
  const sizeMultiplier = Math.random() * 0.3 + 1;
  const icon = L.divIcon({
    html: iconElement,
    iconSize: [16 * sizeMultiplier, 25 * sizeMultiplier],
    className: "icon"
  });

  const marker = L.marker([tournament.coords.lat, tournament.coords.lng], {
    icon,
    tournamentData: tournament
  });
  marker.on("click", () => selectTournament(tournament, marker));

  const popup = createPopupContent(tournament, marker);
  marker.bindPopup(popup, { maxWidth: 280 });

  layer.addLayer(marker);
}

function createPopupContent(tournament, marker) {
  const wrapper = document.createElement("div");
  const EXTERNAL_LINK_ICON = '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const isOneDay = tournament?.dates?.endTournament && tournament?.dates?.startTournament === tournament?.dates?.endTournament;
  const badgeHTML = tournament.badge ? `<span class="popup-badge">${escapeHtml(tournament.badge)}</span>` : "";
  const details = [
    `<p class="popup-title">${badgeHTML}${escapeHtml(tournament.title || "")}</p>`,
    `<p>${localize({ de: "Ort", en: "Location" })}: ${escapeHtml(tournament.location || UNKNOWN)}</p>`,
    `<p>${isOneDay ? localize({ de: "Spieltag", en: "Date" }) : localize({ de: "Erster Spieltag", en: "First day" })}: ${tournament?.dates?.startTournament ? formatDate(tournament.dates.startTournament) : NOT_YET_KNOWN}</p>`
  ];

  if (tournament?.dates?.endTournament && !isOneDay) {
    details.push(`<p>${localize({ de: "Letzter Spieltag", en: "Last day" })}: ${formatDate(tournament.dates.endTournament)}</p>`);
  }

  if (tournament?.dates?.startRegistration) {
    details.push(`<p>${localize({ de: "Registrierung: ab", en: "Registration: from" })} ${formatDate(tournament.dates.startRegistration)}</p>`);
  }

  if (tournament?.dates?.startRegistration && tournament?.spots?.overall) {
    details.push(`<p>${localize({ de: "Freie Startplätze", en: "Free spots" })}: ${tournament.spots.overall - tournament.spots.used}/${tournament.spots.overall}</p>`);
  }

  if (tournament.relatedTournaments?.length) {
    details.push(`<p>${localize({ de: "Verbundene Runden", en: "Linked rounds" })}: ${tournament.relatedTournaments.map((item) => `<a href="https://discgolfmetrix.com/${item.id}">${escapeHtml(item.round)}</a>`).join(", ")}</p>`);
  }

  details.push(`<p><a href="${escapeAttribute(tournament.link || "#")}" target="_blank" rel="noopener" class="popup-link">${localize({ de: "Turnierausschreibung ansehen", en: "View tournament announcement" })} ${EXTERNAL_LINK_ICON}</a></p>`);
  wrapper.innerHTML = details.join("");

  const routeButton = document.createElement("button");
  routeButton.type = "button";
  routeButton.className = "button button--text popup-route-button";
  routeButton.textContent = localize({ de: "Route anzeigen", en: "Show route" });
  routeButton.addEventListener("click", () => {
    selectTournament(tournament, marker);
    marker.closePopup();
    ui.originInput?.focus();
  });
  wrapper.append(routeButton);

  return wrapper;
}

function selectTournament(tournament, marker) {
  const selectionChanged = state.selectedTournament !== tournament;

  state.selectedTournament = tournament;
  state.selectedMarker = marker;

  if (selectionChanged) {
    clearRouteSummary();
    clearRouteLayers();
  }

  updateSelectionMessage();
  updateSubmitState();
  syncUpcomingTableSelection();
}

function updateSelectionMessage() {
  if (!ui.message || !state.selectedTournament) return;

  const location = state.selectedTournament.location ? ` in ${state.selectedTournament.location}` : "";
  setFeedbackMessage(`${localize({ de: "Ziel ausgewählt", en: "Destination selected" })}: ${state.selectedTournament.title}${location}.`);
}

function updateSubmitState(isLoading = false) {
  if (!ui.submitButton || !ui.originInput) return;

  const hasOrigin = ui.originInput.value.trim().length > 0;
  const canSubmit = Boolean(state.selectedTournament && hasOrigin && !isLoading);

  ui.submitButton.disabled = !canSubmit;
  ui.submitButton.classList.toggle("button--primary", hasOrigin);
  ui.submitButton.classList.toggle("button--text", !hasOrigin);
  ui.submitButton.textContent = isLoading
    ? localize({ de: "Route wird geladen...", en: "Loading route..." })
    : localize({ de: "Route berechnen", en: "Calculate route" });
}

async function handleRouteSubmit(event) {
  event.preventDefault();

  if (!state.selectedTournament || !ui.originInput) {
    setFeedbackMessage(routeMessages.idle, true);
    clearRouteSummary();
    clearRouteLayers();
    updateSubmitState();
    return;
  }

  const origin = ui.originInput.value.trim();
  if (!origin) {
    setFeedbackMessage(localize({ de: "Bitte gib eine Startadresse ein.", en: "Please enter a starting address." }), true);
    clearRouteSummary();
    clearRouteLayers();
    updateSubmitState();
    return;
  }

  updateSubmitState(true);
  setFeedbackMessage(routeMessages.loading);
  clearRouteSummary();
  clearRouteLayers();

  try {
    const response = await fetch(endpoints.route, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildRoutePayload(origin, state.selectedTournament))
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      handleRouteError(payload);
      return;
    }

    renderRoute(payload);
  } catch (error) {
    window.Sentry?.captureException(error);
    console.error(error);
    handleRouteError();
  } finally {
    updateSubmitState(false);
  }
}

function buildRoutePayload(origin, tournament) {
  const payload = {
    origin,
    destination: buildDestinationPayload(tournament)
  };

  const date = tournament?.dates?.startTournament;
  if (typeof date === "string" && date.trim()) {
    payload.date = date;
  }

  return payload;
}

function buildDestinationPayload(tournament) {
  return {
    lat: Number(tournament.coords.lat),
    lng: Number(tournament.coords.lng),
    address: tournament.address || tournament.location || tournament.title,
    name: tournament.title,
    station: tournament.station || tournament.location || tournament.title
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

function handleRouteError(payload = {}) {
  clearRouteLayers();
  clearRouteSummary();

  const code = payload?.error?.code || payload?.code;
  const message = routeMessages[code] || routeMessages.default;
  setFeedbackMessage(message, true);
}

function renderRoute(payload) {
  const coordinates = payload?.route?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    handleRouteError();
    return;
  }

  clearRouteLayers();

  const latLngs = coordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lng, lat]) => [lat, lng]);

  state.routeLayer = L.polyline(latLngs, {
    color: "#2563eb",
    weight: 5,
    opacity: 0.85
  }).addTo(state.map);

  const resolvedOrigin = payload?.resolvedPoints?.origin;
  const resolvedDestination = payload?.resolvedPoints?.destination;
  const routeMarkers = [];

  if (resolvedOrigin?.lat && resolvedOrigin?.lng) {
    routeMarkers.push(L.circleMarker([resolvedOrigin.lat, resolvedOrigin.lng], {
      radius: 7,
      weight: 2,
      color: "#0f172a",
      fillColor: "#f8fafc",
      fillOpacity: 1
    }).bindTooltip("Start", { direction: "top" }));
  }

  if (resolvedDestination?.lat && resolvedDestination?.lng) {
    routeMarkers.push(L.circleMarker([resolvedDestination.lat, resolvedDestination.lng], {
      radius: 7,
      weight: 2,
      color: "#0f172a",
      fillColor: "#fde68a",
      fillOpacity: 1
    }).bindTooltip("Ziel", { direction: "top" }));
  }

  if (routeMarkers.length) {
    state.routeMarkersLayer = L.featureGroup(routeMarkers).addTo(state.map);
  }

  const boundsGroup = L.featureGroup([state.routeLayer]);
  if (state.selectedMarker) {
    boundsGroup.addLayer(state.selectedMarker);
  }

  state.map.fitBounds(boundsGroup.getBounds(), {
    padding: [40, 40]
  });

  renderRouteSummary(payload);
  setFeedbackMessage(localize({
    de: `Route zu ${state.selectedTournament.title} geladen.`,
    en: `Route to ${state.selectedTournament.title} loaded.`
  }));
}

function renderRouteSummary(payload) {
  if (!ui.summary || !ui.selected || !ui.distance || !ui.duration || !ui.originConfirmation || !ui.trainLink) return;

  ui.summary.hidden = false;
  ui.selected.textContent = state.selectedTournament?.title || "";
  ui.distance.textContent = formatDistance(payload?.route?.distanceMeters);
  ui.duration.textContent = formatDuration(payload?.route?.durationSeconds);

  const normalizedOrigin = payload?.resolvedPoints?.origin?.text;
  ui.originConfirmation.textContent = normalizedOrigin ? `${localize({ de: "Startadresse bestätigt als", en: "Starting address confirmed as" })}: ${normalizedOrigin}` : "";

  const trainUrl = payload?.train?.url;
  if (trainUrl) {
    ui.trainLink.href = trainUrl;
    ui.trainLink.hidden = false;
  } else {
    ui.trainLink.hidden = true;
    ui.trainLink.removeAttribute("href");
  }
}

function clearRouteSummary() {
  if (!ui.summary || !ui.selected || !ui.distance || !ui.duration || !ui.originConfirmation || !ui.trainLink) return;

  ui.summary.hidden = true;
  ui.selected.textContent = "";
  ui.distance.textContent = "";
  ui.duration.textContent = "";
  ui.originConfirmation.textContent = "";
  ui.trainLink.hidden = true;
  ui.trainLink.removeAttribute("href");
}

function clearRouteLayers() {
  if (!state.map) return;

  if (state.routeLayer) {
    state.map.removeLayer(state.routeLayer);
    state.routeLayer = null;
  }

  if (state.routeMarkersLayer) {
    state.map.removeLayer(state.routeMarkersLayer);
    state.routeMarkersLayer = null;
  }
}

function setFeedbackMessage(message, isError = false) {
  if (!ui.message || !ui.feedback) return;

  ui.message.textContent = message;
  ui.feedback.dataset.state = isError ? "error" : "default";
}

function formatDistance(distanceMeters) {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters)) return "";
  return `${new Intl.NumberFormat(PAGE_LOCALE, {
    maximumFractionDigits: distanceMeters >= 100000 ? 0 : 1
  }).format(distanceMeters / 1000)} km`;
}

function formatDuration(durationSeconds) {
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds)) return "";

  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const minuteUnit = localize({ de: "Min.", en: "min" });
  const hourUnit = localize({ de: "Std.", en: "h" });
  if (!hours) return `${minutes} ${minuteUnit}`;
  if (!minutes) return `${hours} ${hourUnit}`;
  return `${hours} ${hourUnit} ${minutes} ${minuteUnit}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(PAGE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function renderUpcomingTournaments(tournaments) {
  if (!ui.upcomingStatus || !ui.upcomingTableWrapper || !ui.upcomingBody) return;

  ui.upcomingBody.innerHTML = "";

  const upcomingTournaments = Array.isArray(tournaments)
    ? tournaments
      .filter(isUpcomingTournament)
      .sort(sortByTournamentDate)
    : [];

  if (!upcomingTournaments.length) {
    ui.upcomingStatus.textContent = localize({ de: "Zurzeit konnten keine anstehenden offiziellen Turniere geladen werden.", en: "No upcoming official tournaments could be loaded right now." });
    ui.upcomingTableWrapper.hidden = true;
    return;
  }

  const fragment = renderTournamentWeeks(upcomingTournaments, 6, (tournament) => {
    const row = document.createElement("tr");
    row.dataset.eventId = String(tournament.event_id || "");
    row.dataset.href = tournament.link || "";
    row.tabIndex = tournament.link ? 0 : -1;
    row.setAttribute("role", tournament.link ? "link" : "row");
    const rowTitle = tournament.title || localize({ de: "Turnier", en: "Tournament" });
    row.setAttribute("aria-label", tournament.link ? localize({ de: `${rowTitle} öffnen`, en: `Open ${rowTitle}` }) : rowTitle);

    const badgeMarkup = tournament.badge
      ? `<span class="pill tournaments-table__badge" data-tournament-badge="${escapeAttribute(tournament.badge)}">${escapeHtml(tournament.badge)}</span>`
      : "";
    const freeSpots = getFreeSpots(tournament);
    const spotsLabel = tournament?.spots?.overall
      ? `${freeSpots} / ${tournament.spots.overall}`
      : localize({ de: "k. A.", en: "n/a" });
    const registrationStatus = getTournamentRegistrationStatus(tournament, freeSpots);
    const avatarColor = createTournamentAvatarColor(tournament);
    const initials = getTournamentInitials(tournament.title);

    row.innerHTML = [
      `<td data-label="Status"><span class="tournaments-table__indicator${registrationStatus ? " is-active" : ""}" data-registration-status="${escapeAttribute(registrationStatus)}" aria-label="${escapeAttribute(registrationStatus || "n/a")}"></span></td>`,
      `<td data-label="${localize({ de: "Turnier", en: "Tournament" })}"><div class="tournaments-table__name-cell"><span class="avatar tournaments-table__avatar" style="background-color: ${escapeAttribute(avatarColor)};"><span>${escapeHtml(initials)}</span></span><div class="tournaments-table__heading">${badgeMarkup}<div class="tournaments-table__title">${escapeHtml(tournament.title || localize({ de: "Unbenanntes Turnier", en: "Untitled tournament" }))}</div></div></div></td>`,
      `<td data-label="${localize({ de: "Datum", en: "Date" })}">${formatDateCell(tournament)}</td>`,
      `<td data-label="${localize({ de: "Ort", en: "Location" })}">${escapeHtml(tournament.location || UNKNOWN)}</td>`,
      `<td data-label="${localize({ de: "Plätze", en: "Spots" })}">${escapeHtml(spotsLabel)}</td>`,
      `<td data-label="${localize({ de: "Aktion", en: "Action" })}"><div class="tournaments-table__actions"><button type="button" class="button button--text tournaments-table__select-button" data-select-event="${escapeAttribute(tournament.event_id || "")}">Route</button></div></td>`
    ].join("");

    if (tournament.link) {
      row.addEventListener("click", handleUpcomingRowClick);
      row.addEventListener("keydown", handleUpcomingRowKeydown);
    }

    return row;
  });

  ui.upcomingBody.append(fragment);
  ui.upcomingTableWrapper.hidden = false;
  ui.upcomingStatus.textContent = localize({
    de: `${upcomingTournaments.length} Turniere gefunden.`,
    en: `${upcomingTournaments.length} tournaments found.`
  });
  ui.upcomingBody.querySelectorAll("[data-select-event]").forEach((button) => {
    button.addEventListener("click", handleUpcomingSelection);
  });
  syncUpcomingTableSelection();
}

function handleUpcomingSelection(event) {
  event.stopPropagation();

  const eventId = Number(event.currentTarget.dataset.selectEvent);

  if (!Number.isFinite(eventId) || !state.map) return;

  const markerMatch = findMarkerByEventId(eventId);
  if (!markerMatch) return;

  const { marker, tournament } = markerMatch;
  selectTournament(tournament, marker);

  if (marker.getLatLng) {
    state.map.flyTo(marker.getLatLng(), Math.max(state.map.getZoom(), 8), {
      duration: 0.5
    });
    marker.openPopup();
  }

  ui.originInput?.focus();
}

function handleUpcomingRowClick(event) {
  const interactiveElement = event.target.closest("button, a, input, select, textarea");
  if (interactiveElement) return;

  const href = event.currentTarget.dataset.href;
  if (!href) return;

  window.open(href, "_blank", "noopener");
}

function handleUpcomingRowKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  handleUpcomingRowClick(event);
}

function findMarkerByEventId(eventId) {
  if (!state.map || !Number.isFinite(eventId)) return null;

  let markerMatch = null;

  state.map.eachLayer((layer) => {
    if (markerMatch || !layer?.eachLayer) return;

    layer.eachLayer((candidate) => {
      if (markerMatch) return;

      const tournament = candidate?.options?.tournamentData;
      if (tournament?.event_id === eventId) {
        markerMatch = {
          marker: candidate,
          tournament
        };
      }
    });
  });

  return markerMatch;
}

function syncUpcomingTableSelection() {
  if (!ui.upcomingBody) return;

  ui.upcomingBody.querySelectorAll("tr").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.eventId === String(state.selectedTournament?.event_id || ""));
  });
}

function isUpcomingTournament(tournament) {
  const endDate = tournament?.dates?.endTournament || tournament?.dates?.startTournament;
  if (!endDate) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return new Date(endDate) >= startOfToday;
}

function sortByTournamentDate(a, b) {
  const aDate = new Date(a?.dates?.startTournament || a?.dates?.endTournament || 0).getTime();
  const bDate = new Date(b?.dates?.startTournament || b?.dates?.endTournament || 0).getTime();

  return aDate - bDate;
}

function formatDateRange(tournament) {
  const start = tournament?.dates?.startTournament;
  const end = tournament?.dates?.endTournament;

  if (!start) return NOT_YET_KNOWN;
  if (!end || start === end) return formatDate(start);

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatDateCell(tournament) {
  const start = tournament?.dates?.startTournament;
  const end = tournament?.dates?.endTournament;

  if (!start) {
    return `<span class="tournaments-table__date">${NOT_YET_KNOWN}</span>`;
  }

  if (!end || start === end) {
    return `<span class="tournaments-table__date">${escapeHtml(formatDate(start))}</span>`;
  }

  return `<div class="tournaments-table__date tournaments-table__date--range"><span>${escapeHtml(formatDate(start))}</span><span>${escapeHtml(formatDate(end))}</span></div>`;
}

function formatRegistrationStatus(tournament) {
  const registrationDate = tournament?.dates?.startRegistration;
  if (!registrationDate) return localize({ de: "noch nicht bekannt", en: "not yet known" });

  const now = new Date();
  const registrationStartsAt = new Date(registrationDate);
  const prefix = registrationStartsAt > now ? localize({ de: "ab", en: "from" }) : localize({ de: "seit", en: "since" });
  return `${prefix} ${formatDate(registrationDate)}`;
}
