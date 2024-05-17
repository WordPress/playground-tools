import startWPNow from '../wp-now';
import { getWpNowPath } from '../';
import getWpNowConfig, { CliOptions } from '../config';
import fs from 'fs-extra';
import path from 'path';
import {
	downloadSqliteIntegrationPlugin,
	downloadWordPress,
} from '../download';
import os from 'os';
import crypto from 'crypto';
import { downloadWithTimer } from './download-with-timer';
import getWpNowTmpPath from '../get-wp-now-tmp-path';

const exampleDir = __dirname + '/mode-examples';

async function copyWordPressAndStart(tmpDirectory: string, folderName: string) {
	// Copy whole WordPress directory to a temporary directory
	const wordPressDir = path.join(
		getWpNowPath(),
		'wordpress-versions',
		'latest'
	);
	const projectPath = path.join(tmpDirectory, folderName);
	fs.copySync(wordPressDir, projectPath);

	const options = await getWpNowConfig({ path: projectPath });
	return await startWPNow(options);
}

describe('Test WordPress plugin updates', () => {
	let tmpExampleDirectory;

	/**
	 * Download an initial copy of WordPress
	 */
	beforeAll(async () => {
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

	test('move a directory', async () => {
		const { php } = await copyWordPressAndStart(
			tmpExampleDirectory,
			'wordpress-move-directory'
		);
		const code = `<?php
			require_once 'wp-load.php';
			require_once 'wp-admin/includes/file.php';

			WP_Filesystem();
			global $wp_filesystem;

			$path = 'wp-content/plugins/akismet';

			echo "Path: " . $path . "\n";

			$result = $wp_filesystem->exists($path);
			echo "exists before " . ($result ? 'true' : 'false') . "\n";

			$result = move_dir($path, "./wp-content/other-path", true);
			echo "moved " . ($result ? 'true' : 'false') . "\n";

			$result = $wp_filesystem->exists($path);
			echo "exists after " . ($result ? 'true' : 'false') . "\n";
		?>`;
		const result = await php.run({
			code,
		});

		expect(result.text).toMatch('Path: wp-content/plugins/akismet');
		expect(result.text).toMatch('exists before true');
		expect(result.text).toMatch('exists after false');
	});

	test('delete a directory', async () => {
		const { php } = await copyWordPressAndStart(
			tmpExampleDirectory,
			'wordpress-move-directory'
		);
		const code = `<?php
			require_once 'wp-load.php';
			require_once 'wp-admin/includes/file.php';

			WP_Filesystem();
			global $wp_filesystem;

			$path = 'wp-content/plugins/akismet';

			echo "Path: " . $path . "\n";

			$result = $wp_filesystem->exists($path);
			echo "exists before " . ($result ? 'true' : 'false') . "\n";

			$deleted = $wp_filesystem->delete( $path, true );
			echo "deleted " . ($deleted ? 'true' : 'false') . "\n";

			$result = $wp_filesystem->exists($path);
			echo "exists after " . ($result ? 'true' : 'false') . "\n";
		?>`;
		const result = await php.run({
			code,
		});

		expect(result.text).toMatch('Path: wp-content/plugins/akismet');
		expect(result.text).toMatch('exists before true');
		expect(result.text).toMatch('deleted true');
		expect(result.text).toMatch('exists after false');
	});
});
