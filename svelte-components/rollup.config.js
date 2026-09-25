import path from 'node:path';
import { fileURLToPath } from 'node:url';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import { minify } from 'rollup-plugin-esbuild-minify';
import resolve from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-only';
import replace from '@rollup/plugin-replace';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = !process.env.ROLLUP_WATCH;

export default {
	input: path.resolve(__dirname, 'src/main.js'),
	output: {
		sourcemap: !production,
		format: 'iife',
		name: 'app',
		file: path.resolve(__dirname, '../assets/svelte-bundle.js'),
		globals: {
			'tippy.js': 'tippy'
		}
	},
	external: ['tippy.js'],
	plugins: [
		svelte({
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production
			}
		}),
		// we'll extract any component CSS out into
		// a separate file - better for performance
		css({ output: 'svelte-bundle.css' }),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte'],
			exportConditions: ['svelte']
		}),
		commonjs(),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && minify(),

		replace({
			'process.env.API_URL': JSON.stringify(process.env.API_URL),
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
			preventAssignment: true,
		},
		)
	],
	watch: {
		clearScreen: false
	}
};
