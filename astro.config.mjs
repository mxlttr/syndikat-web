// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import mdx from "@astrojs/mdx";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  image: {
    layout: "constrained",
  },

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Jost",
      cssVariable: "--font-jost",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/Jost-400-Book.woff2"],
            weight: "400",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Jost-400-BookItalic.woff2"],
            weight: "400",
            style: "italic",
          },
          {
            src: ["./src/assets/fonts/Jost-500-Medium.woff2"],
            weight: "500",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Jost-700-Bold.woff2"],
            weight: "700",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/Jost-900-Black.woff2"],
            weight: "900",
            style: "normal",
          },
        ],
      },
    },
  ],

  integrations: [mdx(), svelte()],
});
