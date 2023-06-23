import startWPNow, { getThemeTemplate, inferMode } from '../wp-now';
import { startServer } from '../';
import getWpNowConfig, { CliOptions, WPNowMode, WPNowOptions } from '../config';
import fs from 'fs-extra';
import path from 'path';
import {
	isPluginDirectory,
	isThemeDirectory,
	isWpContentDirectory,
	isWordPressDirectory,
	isWordPressDevelopDirectory,
} from '../wp-playground-wordpress';
import {
	downloadSqliteIntegrationPlugin,
	downloadWPCLI,
	downloadWordPress,
} from '../download';
import os from 'os';
import crypto from 'crypto';
import getWpNowTmpPath from '../get-wp-now-tmp-path';
import getWpCliTmpPath from '../get-wp-cli-tmp-path';
import { executeWPCli } from '../execute-wp-cli';
import { runCli } from '../run-cli';

const exampleDir = __dirname + '/mode-examples';

async function downloadWithTimer(name, fn) {
	console.log(`Downloading ${name}...`);
	console.time(name);
	await fn();
	console.log(`${name} downloaded.`);
	console.timeEnd(name);
}

describe('Test starting different modes', () => {
	let tmpExampleDirectory;

	/**
	 * Download an initial copy of WordPress
	 */
	beforeAll(async () => {
		fs.rmSync(getWpNowTmpPath(), { recursive: true, force: true });
		await Promise.all([
			downloadWithTimer('wordpress', downloadWordPress),
			downloadWithTimer('sqlite', downloadSqliteIntegrationPlugin),
		]);
	});

	/**
	 * Copy example directory to a temporary directory
	 */
	beforeEach(() => {
		const tmpDirectory = os.tmpdir();
		const directoryHash = crypto.randomBytes(20).toString('hex');

		tmpExampleDirectory = path.join(
			tmpDirectory,
			`wp-now-tests-examples-${directoryHash}`
		);
		fs.ensureDirSync(tmpExampleDirectory);
		fs.copySync(exampleDir, tmpExampleDirectory);
	});

	/**
	 * Remove temporary directory
	 */
	afterEach(() => {
		fs.rmSync(tmpExampleDirectory, { recursive: true, force: true });
	});

	/**
	 * Remove wp-now hidden directory from temporary directory.
	 */
	afterAll(() => {
		fs.rmSync(getWpNowTmpPath(), { recursive: true, force: true });
	});

	/**
	 * Test blueprints execution.
	 */
	describe('blueprints', () => {
		const blueprintExamplesPath = path.join(__dirname, 'blueprints');

		afterEach(() => {
			// Clean the custom url from the SQLite database
			fs.rmSync(
				path.join(getWpNowTmpPath(), 'wp-content', 'playground'),
				{ recursive: true }
			);
		});

		test('setting wp-config variable WP_DEBUG_LOG through blueprint', async () => {
			const options = await getWpNowConfig({
				blueprint: path.join(blueprintExamplesPath, 'wp-debug.json'),
			});
			const { php, stopServer } = await startServer(options);
			php.writeFile(
				`${php.documentRoot}/print-constants.php`,
				`<?php echo WP_DEBUG_LOG;`
			);
			const result = await php.request({
				method: 'GET',
				url: '/print-constants.php',
			});
			expect(result.text).toMatch(
				'/var/www/html/wp-content/themes/fake/example.log'
			);
			await stopServer();
		});

		test('setting wp-config variable WP_SITEURL through blueprint', async () => {
			const options = await getWpNowConfig({
				blueprint: path.join(blueprintExamplesPath, 'wp-config.json'),
			});
			const { php, stopServer } = await startServer(options);
			expect(options.absoluteUrl).toBe('http://127.0.0.1');

			php.writeFile(
				`${php.documentRoot}/print-constants.php`,
				`<?php echo WP_SITEURL;`
			);
			const result = await php.request({
				method: 'GET',
				url: '/print-constants.php',
			});
			expect(result.text).toMatch('http://127.0.0.1');
			await stopServer();
		});
	});
});

/**
 * Test wp-cli command.
 */
describe('wp-cli command', () => {
	let consoleSpy;
	let output = '';

	beforeEach(() => {
		function onStdout(outputLine: string) {
			output += outputLine;
		}
		consoleSpy = vi.spyOn(console, 'log');
		consoleSpy.mockImplementation(onStdout);
	});

	afterEach(() => {
		output = '';
		consoleSpy.mockRestore();
	});

	beforeAll(async () => {
		await downloadWithTimer('wp-cli', downloadWPCLI);
	});

	afterAll(() => {
		fs.removeSync(getWpCliTmpPath());
	});

	/**
	 * Test wp-cli displays the version.
	 * We don't need the WordPress context for this test.
	 */
	test('wp-cli displays the version', async () => {
		await executeWPCli(['cli', 'version']);
		expect(output).toMatch(/WP-CLI (\d\.?)+/i);
	});
});
