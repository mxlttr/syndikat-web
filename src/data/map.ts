export const DEFAULT_VIEW = {
  center: [51, 9.5],
  zoom: 6,
};

export const routeMessages = {
  idle: "Wähle ein Turnier auf der Karte, um die Route zu planen.",
  loading: "Route wird berechnet...",
  INVALID_REQUEST: "Die Anfrage war unvollständig. Bitte prüfe deine Eingabe noch einmal.",
  INVALID_ADDRESS: "Startadresse nicht gefunden. Bitte gib eine vollständige Straßenadresse ein.",
  NO_ROUTE_FOUND: "Für diese Strecke konnte keine befahrbare Route gefunden werden.",
  UPSTREAM_QUOTA_EXCEEDED: "Die Routenberechnung ist gerade ausgelastet. Bitte versuche es später noch einmal.",
  UPSTREAM_ERROR: "Die Routenberechnung ist im Moment nicht verfügbar. Bitte versuche es später erneut.",
  default: "Die Route konnte nicht geladen werden. Bitte versuche es noch einmal.",
};

export const iconOptions = {
  iconUrl: "/assets/marker.svg",
  iconSize: [18, 26],
  iconAnchor: [9, 26],
  popupAnchor: [0, -20],
};
