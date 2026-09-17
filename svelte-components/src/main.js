import ProductSearch from './ProductSearch.svelte';
import Ratings from './Ratings.svelte';

if (document.querySelector('#product-search-app')) {
  new ProductSearch({
    target: document.querySelector('#product-search-app'),
  });
}

if (document.querySelector('#ratings-app')) {
  new Ratings({
    target: document.querySelector('#ratings-app'),
  });
}
