import Ratings from '../Ratings.svelte';

const target = document.querySelector('#ratings-app');

if (target) {
  new Ratings({ target });
}
