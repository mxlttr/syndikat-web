<script>
  import { onDestroy, onMount, getContext, setContext } from "svelte";

  let {
    contextKey,
    name = "",
    checked = false,
    layerType,
    options = { maxClusterRadius: 40, showCoverageOnHover: false },
    children,
  } = $props();

  const parentContext = getContext(contextKey);
  const { getMap, getControl } = parentContext;

  let ready = $state(false);
  let clusterGroup = $state();
  let map = $derived(getMap?.());
  let controlLayers = $derived(getControl?.());

  onMount(() => {
    clusterGroup = window.L.markerClusterGroup(options);
    ready = true;
  });

  $effect(() => {
    if (!map || !clusterGroup) return;

    if (controlLayers) {
      if (layerType === "base") {
        if (checked) map.addLayer(clusterGroup);
        controlLayers.addBaseLayer(clusterGroup, name);
      } else {
        if (checked) map.addLayer(clusterGroup);
        controlLayers.addOverlay(clusterGroup, name);
      }

      controlLayers.addTo(map);
    } else {
      map.addLayer(clusterGroup);
    }
  });

  onDestroy(() => {
    clusterGroup?.remove();
    clusterGroup = undefined;
  });

  setContext(contextKey, { ...parentContext, getLayer: () => clusterGroup });
</script>

{#if ready}
  {@render children?.()}
{/if}
