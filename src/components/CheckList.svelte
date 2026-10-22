<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";

  import items from "../data/checklist";
  const checkedItems = writable([]);
  onMount(() => {
    const saved = localStorage.getItem("checkedItems");

    if (saved) {
      checkedItems.set(JSON.parse(saved));
    }

    const unsubscribe = checkedItems.subscribe((values) => {
      localStorage.setItem("checkedItems", JSON.stringify(values));
    });

    return unsubscribe;
  });
</script>

<details>
  <summary>Turnier-Packliste zum Abhaken ausklappen</summary>

  {#each items as item}
    <div class="form__checkbox-group">
      <label class="form__label form__checkbox-group">
        <input type="checkbox" data-value={item} bind:group={$checkedItems} value={item} class="form__input" />{item}
      </label>
    </div>
  {/each}

  <button class="button" type="button" on:click={() => checkedItems.set([])}>Liste zurücksetzen</button>
</details>

<style>
  details {
    margin-bottom: 2rem;
    border-left: 4px solid var(--brand-color);
    padding: 10px 26px;
  }

  details .button {
    margin-top: 1rem;
  }
</style>
