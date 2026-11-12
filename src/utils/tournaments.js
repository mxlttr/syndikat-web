import { formatDate } from "./dates";

export function getExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function getTournamentPopupViewModel(tournament) {
  const dates = tournament?.dates ?? {};
  const startDate = dates.startTournament;
  const endDate = dates.endTournament;
  const isOneDay = Boolean(startDate && endDate && startDate === endDate);
  const overallSpots = Number(tournament?.spots?.overall);
  const usedSpots = Number(tournament?.spots?.used ?? 0);

  return {
    title: tournament?.title ?? "",
    badge: tournament?.badge ?? "",
    location: tournament?.location || "Unbekannt",
    gameDayLabel: isOneDay ? "Spieltag" : "Erster Spieltag",
    gameDay: startDate ? formatDate(startDate) : "noch unbekannt",
    lastGameDay: endDate && !isOneDay ? formatDate(endDate) : null,
    registrationDate: dates.startRegistration ? formatDate(dates.startRegistration) : null,
    availableSpots:
      dates.startRegistration && Number.isFinite(overallSpots) && overallSpots > 0 && Number.isFinite(usedSpots)
        ? `${overallSpots - usedSpots}/${overallSpots}`
        : null,
    relatedTournaments: (tournament?.relatedTournaments ?? [])
      .filter((item) => item?.id != null)
      .map((item) => ({
        href: `https://discgolfmetrix.com/${encodeURIComponent(String(item.id))}`,
        round: item.round ?? "",
      })),
    link: getExternalUrl(tournament?.link),
  };
}

export function getTournamentCoordinates(tournament) {
  const { lat, lng } = tournament?.coords ?? {};
  const hasValue = (value) => value !== null && value !== undefined && value !== "";
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (
    !hasValue(lat) ||
    !hasValue(lng) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { lat: latitude, lng: longitude };
}

export function getTournamentAvatarColor(tournament) {
  const source = String(tournament?.event_id || tournament?.title || "0");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 70% 34%)`;
}

export function getTournamentMarkerColor() {
  const lightness = Math.floor(Math.random() * (70 - 50 + 1) + 50);
  return `hsl(220deg 50% ${lightness}%)`;
}

function getTournamentWeek(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => Number(parts.find((item) => item.type === type)?.value);
  const monday = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const formatDate = (value) =>
    value.toLocaleDateString("de-DE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return {
    key: monday.toISOString(),
    label: `${formatDate(monday)} – ${formatDate(sunday)}`,
  };
}

function compareTournamentDates(left, right) {
  const leftDate = new Date(left?.dates?.startTournament).getTime();
  const rightDate = new Date(right?.dates?.startTournament).getTime();

  if (!Number.isFinite(leftDate)) return Number.isFinite(rightDate) ? 1 : 0;
  if (!Number.isFinite(rightDate)) return -1;
  return leftDate - rightDate;
}

export function groupTournamentWeeks(tournaments = []) {
  const groups = new Map();

  for (const tournament of tournaments) {
    const week = getTournamentWeek(tournament?.dates?.startTournament);
    const key = week?.key ?? "unknown";

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: week?.label ?? "Datum noch unbekannt",
        tournaments: [],
      });
    }

    groups.get(key).tournaments.push(tournament);
  }

  return [...groups.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((group) => ({
      ...group,
      tournaments: group.tournaments.sort(compareTournamentDates),
    }));
}
