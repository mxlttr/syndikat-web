import { readdirSync, writeFileSync } from 'node:fs';
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
const assetPath = (file) => path.resolve(__dirname, '../assets', file);
const svelteEntriesPath = path.resolve(__dirname, 'src/entries');
const svelteEntries = readdirSync(svelteEntriesPath)
	.filter((entry) => entry.endsWith('.js'))
	.sort();
const svelteBundleNames = svelteEntries.map((entry) => path.basename(entry, '.js'));
const svelteBundleDataPath = path.resolve(__dirname, '../_data/svelte_bundles.json');

writeFileSync(svelteBundleDataPath, `${JSON.stringify(svelteBundleNames, null, 2)}\n`);

function environmentReplacements() {
	return replace({
		'process.env.API_URL': JSON.stringify(process.env.API_URL || ''),
		'process.env.SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN || ''),
		'process.env.SENTRY_ENVIRONMENT': JSON.stringify(
			process.env.SENTRY_ENVIRONMENT || process.env.CONTEXT || process.env.NODE_ENV || 'production',
		),
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (production ? 'production' : 'development')),
		preventAssignment: true,
	});
}

const sharedOutput = {
	sourcemap: true,
	format: 'iife',
};

function svelteBundle(entry) {
	const bundleName = path.basename(entry, '.js');
	const globalName = bundleName.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());

	return {
		input: path.resolve(svelteEntriesPath, entry),
		output: {
			...sharedOutput,
			name: globalName,
			file: assetPath(`${bundleName}-bundle.js`),
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
			css({ output: `${bundleName}-bundle.css` }),
			resolve({
				browser: true,
				dedupe: ['svelte'],
				exportConditions: ['svelte']
			}),
			commonjs(),
			production && minify(),
			environmentReplacements()
		],
		watch: {
			clearScreen: false
		}
	};
}

export default [
	...svelteEntries.map(svelteBundle),
	{
		input: path.resolve(__dirname, 'src/sentry.js'),
		output: {
			...sharedOutput,
			name: 'sentryBundle',
			file: assetPath('sentry-bundle.js')
		},
		plugins: [
			resolve({ browser: true }),
			commonjs(),
			production && minify(),
			environmentReplacements()
		],
		watch: {
			clearScreen: false
		}
	}
];
