// Page language from <html lang>, set per page by Jekyll.
export const lang = document.documentElement.lang === "en" ? "en" : "de";
export const locale = lang === "en" ? "en-GB" : "de-DE";

export function l(strings) {
  return strings[lang] ?? strings.de;
}
