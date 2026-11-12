import discs from "../assets/discs.json";

export function GET() {
  const suggestions = discs.map(({ brand, name, category, speed, glide, turn, fade }) => ({
    brand,
    name,
    category,
    speed,
    glide,
    turn,
    fade,
  }));

  return new Response(JSON.stringify(suggestions), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
