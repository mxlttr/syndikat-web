<script>
  import { dice } from "../data/dice";

  const pools = dice.map((data) => data.flatMap((item) => Array(item.quantity).fill(item.name)));

  let results = $state(["🎲", "🎲"]);
  let rolling = $state(false);
  const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

  function rollDice() {
    rolling = true;
    results = ["...", "..."];

    pools.forEach((pool, index) => {
      setTimeout(
        () => {
          results[index] = randomItem(pool);
          if (index === pools.length - 1) rolling = false;
        },
        index === 0 ? 1000 : 2000,
      );
    });
  }
</script>

<div class="dice-wrapper">
  <p>
    Drück den Button und lass den Zufall entscheiden wie der nächste Wurf aussieht! Der erste Würfel gibt den Wurf an,
    der Zweite die Art der Scheibe. Viel Spaß beim Spielen!
  </p>
  <div class="dice">
    {#each results as result}
      <div class="die">{result}</div>
    {/each}
  </div>

  <button onclick={rollDice} disabled={rolling} class="button button--primary" data-umami-event="dice_roll">
    Roll the dice
  </button>
</div>
