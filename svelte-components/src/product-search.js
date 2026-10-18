import ProductSearch from './ProductSearch.svelte';

const target = document.querySelector('#product-search-app');

if (target) {
  new ProductSearch({ target });
}
