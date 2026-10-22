import js from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: [".astro/**", "dist/**", "src/assets/vendors/**"] },
  js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: { URL: "readonly" },
    },
  },
  {
    rules: {
      "max-len": [
        "warn",
        {
          code: 120,
          comments: 120,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
];
