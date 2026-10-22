<script>
  import { writable } from "svelte/store";
  import { onDestroy, onMount } from "svelte";
  import { fetchNewestProducts, streamProducts } from "../utils/api";
  import Awesomplete from "awesomplete";
  import Icon from "./Icon.svelte";
  import ProductCard from "./ProductCard.svelte";
  import Wishlist from "./Wishlist.svelte";

  export let shops;
  const activeShops = shops.filter((shop) => !shop.disabled);
  const shopHandles = activeShops.map((shop) => shop.handle);
  const products = writable([]);
  const newProducts = writable([]);
  const loading = writable(false);
  const loadingText = writable("");
  let initialProducts = [];
  let defaultState = true;
  let totalStores = shopHandles.length;
  let activeSource;
  let searchRun = 0;
  let completedStores = new Set();

  let shopCount = shopHandles.length;
  let sort = "default";
  let query = "";
  $: query = query.toLowerCase();
  $: progress = totalStores ? parseInt((shopCount / totalStores) * 100) : 0;

  let searchedQuery = "";
  let searchInputElement;
  let handlePopState;
  let handleAutocompleteSelect;
  let autocomplete;
  let autocompleteRequest;
  let destroyed = false;

  const wishlist = writable([]);
  let unsubscribeWishlist;

  const focusSearchInput = () => {
    searchInputElement?.focus();
  };

  const updateSearchUrl = (value, replace = false) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;

    if (replace) window.history.replaceState({}, "", nextUrl);
    else window.history.pushState({}, "", nextUrl);
  };

  const closeActiveSource = () => {
    if (activeSource) {
      activeSource.close();
      activeSource = null;
    }
  };

  const resetSearchProgress = () => {
    completedStores = new Set();
    totalStores = shopHandles.length;
    shopCount = 0;
    loadingText.set("");
  };

  const finishSearch = () => {
    closeActiveSource();
    loading.set(false);
    loadingText.set("");
  };

  const updateLoadingText = () => {
    if (!totalStores || shopCount >= totalStores) {
      loadingText.set("");
      return;
    }

    loadingText.set(`${shopCount}/${totalStores} Shops gescannt`);
  };

  const addProducts = (items) => {
    if (!items?.length) {
      handleSort();
      return;
    }

    initialProducts.push(...items);
    products.update((currentProducts) => [...currentProducts, ...items]);
    handleSort();
  };

  const markStoreCompleted = (store) => {
    if (!store || completedStores.has(store)) return;
    completedStores.add(store);
    shopCount = completedStores.size;
    updateLoadingText();
  };

  const clearProducts = () => {
    query = "";
    getProducts();
    focusSearchInput();
  };

  const getProducts = ({ updateUrl = true } = {}) => {
    const normalizedQuery = query.trim().toLowerCase();
    closeActiveSource();
    const currentRun = ++searchRun;

    if (updateUrl) updateSearchUrl(normalizedQuery);

    if (!normalizedQuery) {
      query = "";
      searchedQuery = "";
      initialProducts = [];
      defaultState = true;
      resetSearchProgress();
      loading.set(false);
      products.set([]);
      return;
    }

    initialProducts = [];
    defaultState = false;
    searchedQuery = normalizedQuery;

    products.set([]);
    resetSearchProgress();
    loading.set(true);
    updateLoadingText();

    activeSource = streamProducts(normalizedQuery, {
      onStart: ({ stores = [] }) => {
        if (currentRun !== searchRun) return;
        totalStores = stores.length || shopHandles.length;
        shopCount = 0;
        updateLoadingText();
      },
      onStore: ({ store, products: streamedProducts = [] }) => {
        if (currentRun !== searchRun) return;
        markStoreCompleted(store);
        addProducts(streamedProducts);
      },
      onStoreError: ({ store }) => {
        if (currentRun !== searchRun) return;
        markStoreCompleted(store);
      },
      onEnd: () => {
        if (currentRun !== searchRun) return;
        shopCount = totalStores;
        finishSearch();
      },
      onServerError: () => {
        if (currentRun !== searchRun) return;
        finishSearch();
      },
      onStreamError: () => {
        if (currentRun !== searchRun) return;
        finishSearch();
      },
    });

    if (!activeSource) {
      console.error("Streaming search is not supported in this browser.");
      finishSearch();
    }
  };

  const handleSort = () => {
    if (sort === "price-descending") return ($products = sortProducts($products, "price"));
    if (sort === "price-ascending") return ($products = sortProducts($products, "price", true));
    if (sort === "availability") return ($products = sortProducts($products, "stockStatus", true));
    return ($products = initialProducts);
  };

  const handleSortChange = () => {
    try {
      localStorage.setItem("sort", sort);
    } catch {
      // Sorting still works when browser storage is unavailable.
    }

    handleSort();
  };

  const handleAutocompleteSelection = (event) => {
    const selectedQuery = event.text?.value;
    if (!selectedQuery) return;

    query = selectedQuery;
    getProducts();
  };

  function sortProducts(products, key, reverse) {
    const result = [...products].sort((a, b) => {
      if (a[key] < b[key]) return 1;
      if (a[key] >= b[key]) return -1;
      return 0;
    });

    return reverse ? result.reverse() : result;
  }

  function getDiscLabel(disc) {
    let label = `${disc.brand} ${disc.name}`;
    if (disc.category) label += `<span class="disc-category">${disc.category}</span>`;
    if (disc.speed && disc.glide && disc.turn && disc.fade) {
      label += `
        <div class="disc-flightnumbers">
          <span class="disc-speed">${disc.speed}</span>
          <span class="disc-glide">${disc.glide}</span>
          <span class="disc-turn">${disc.turn}</span>
          <span class="disc-fade">${disc.fade}</span>
        </div>
      `;
    }

    return label;
  }

  const loadAutocomplete = async () => {
    if (searchInputElement?.value.trim().length < 3 || autocompleteRequest) return;

    autocompleteRequest = fetch("/discs-autocomplete.json").then((response) => {
      if (!response.ok) throw new Error(`Could not load disc suggestions: ${response.status}`);
      return response.json();
    });

    try {
      const discs = await autocompleteRequest;
      if (destroyed) return;

      autocomplete = new Awesomplete(searchInputElement, {
        list: discs.map((disc) => ({
          label: getDiscLabel(disc),
          value: disc.name,
        })),
        filter: (suggestion, input) => Awesomplete.FILTER_CONTAINS(suggestion.value, input),
        minChars: 3,
        maxItems: 20,
        autoFirst: false,
        tabSelect: true,
      });
      handleAutocompleteSelect = handleAutocompleteSelection;
      searchInputElement.addEventListener("awesomplete-selectcomplete", handleAutocompleteSelect);
      autocomplete.evaluate();
    } catch (error) {
      autocompleteRequest = null;
      window.Sentry?.captureException(error);
    }
  };

  onMount(async () => {
    try {
      const savedSort = localStorage.getItem("sort");
      if (["default", "availability", "price-ascending", "price-descending"].includes(savedSort)) {
        sort = savedSort;
      }
    } catch {
      // Use the default sort when browser storage is unavailable.
    }

    handlePopState = () => {
      const nextQuery = new URLSearchParams(window.location.search).get("q") || "";
      if (nextQuery.trim().toLowerCase() === searchedQuery) {
        query = nextQuery;
        return;
      }

      query = nextQuery;
      getProducts({ updateUrl: false });
    };
    window.addEventListener("popstate", handlePopState);

    const savedQuery = new URLSearchParams(window.location.search).get("q") || "";
    if (savedQuery.trim()) {
      query = savedQuery;
      getProducts({ updateUrl: false });
    }

    let savedWishlist = [];

    try {
      const saved = JSON.parse(localStorage.getItem("wishlist") || "[]");
      if (Array.isArray(saved)) savedWishlist = saved;
    } catch {
      // Keep an empty wishlist if the saved data is malformed.
    }

    wishlist.set(savedWishlist);

    unsubscribeWishlist = wishlist.subscribe((products) => {
      try {
        localStorage.setItem("wishlist", JSON.stringify(products));
      } catch {
        // Wishlist changes remain available for this page when storage is unavailable.
      }
    });

    const newest = (await fetchNewestProducts()).slice(0, 6);
    newProducts.set(newest);

    focusSearchInput();
    loadAutocomplete();
  });

  onDestroy(() => {
    destroyed = true;
    autocomplete?.destroy();
    if (handlePopState && typeof window !== "undefined") {
      window.removeEventListener("popstate", handlePopState);
    }
    searchInputElement?.removeEventListener("awesomplete-selectcomplete", handleAutocompleteSelect);
    unsubscribeWishlist?.();
    closeActiveSource();
  });
</script>

<Wishlist {wishlist} />

<form class="search__group" on:submit|preventDefault={() => getProducts()}>
  {#if query && !$loading}
    <button type="button" class="search__close" on:click={() => clearProducts()}>
      <Icon name="x" />
    </button>
  {/if}
  <label for="js-product-input" class="screen-reader-text">Suche nach Produkten</label>
  <input
    type="text"
    class="search__text"
    id="js-product-input"
    bind:this={searchInputElement}
    bind:value={query}
    on:input={loadAutocomplete}
    placeholder="Suche eine Scheibe …"
  />
  <button type="submit" class="button button--primary">
    <Icon name="search" />
  </button>
</form>

<div class="products-headline animate">
  <h2>
    {#if $loading || $products.length}
      Produkte
    {:else}
      Los geht's!
    {/if}
    {#if $loading && shopCount < totalStores}
      <svg width="24" height="24" viewBox="0 0 24 24" class="circular-progress" style="--progress: {progress}">
        <circle class="bg"></circle>
        <circle class="fg"></circle>
      </svg>
    {:else if $products.length}
      <span class="product-count">({$products.length})</span>
    {/if}
  </h2>

  {#if $loadingText}
    <div class="currently-fetching">{$loadingText}</div>
  {/if}

  {#if $products.length}
    <select bind:value={sort} on:change={handleSortChange}>
      <option value="default">Standard</option>
      <option value="availability">Verfügbarkeit</option>
      <option value="price-ascending">Preis aufsteigend</option>
      <option value="price-descending">Preis absteigend</option>
    </select>
  {/if}
</div>

<div class="row animate">
  {#each $products as product}
    <ProductCard {product} {shops} {wishlist} />
  {:else}
    {#if defaultState || !query}
      <div class="col col-12">
        <p>Nutze die Suche oben, um Preise und Verfügbarkeiten zu vergleichen.</p>
      </div>

      {#if $newProducts.length}
        <div class="col col-12">
          <h3>Neuheiten und Restocks</h3>
          <div class="row">
            {#each $newProducts as product}
              <ProductCard {product} {wishlist} {shops} />
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="col">
        <p>Keine Produkte für {searchedQuery} gefunden.</p>
      </div>
    {/if}
  {/each}
</div>

<style>
  form {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
  }

  h2 {
    margin-bottom: 0;
  }

  h2 span {
    font-size: 0.75em;
    color: var(--text-alt-color);
  }

  button.search__close {
    right: 100px;
    z-index: 1;
  }

  .products-headline {
    display: flex;
    gap: 1rem;
    margin-bottom: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .circular-progress {
    --size: 24px;
    --half-size: calc(var(--size) / 2);
    --stroke-width: 3px;
    --radius: calc((var(--size) - var(--stroke-width)) / 2);
    --circumference: calc(var(--radius) * pi * 2);
    --dash: calc((var(--progress) * var(--circumference)) / 100);
    animation: progress-animation 5s linear 0s 1 forwards;
  }

  .circular-progress circle {
    cx: var(--half-size);
    cy: var(--half-size);
    r: var(--radius);
    stroke-width: var(--stroke-width);
    fill: none;
    stroke-linecap: round;
  }

  .circular-progress circle.bg {
    stroke: var(--background-alt-color);
  }

  .circular-progress circle.fg {
    transform: rotate(-90deg);
    transform-origin: var(--half-size) var(--half-size);
    stroke-dasharray: var(--dash) calc(var(--circumference) - var(--dash));
    transition: stroke-dasharray 0.3s linear 0s;
    stroke: var(--button-background-hover);
  }

  @property --progress {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
  }

  .currently-fetching {
    font-size: 10px;
    flex: 1;
    display: none;
  }

  @media screen and (min-width: 769px) {
    .currently-fetching {
      display: block;
    }
  }
</style>
