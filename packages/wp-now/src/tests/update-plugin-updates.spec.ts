import startWPNow from '../wp-now';
import { getWpNowPath } from '../';
import getWpNowConfig from '../config';
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
		`;
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
		`;
		const result = await php.run({
			code,
		});

		expect(result.text).toMatch('Path: wp-content/plugins/akismet');
		expect(result.text).toMatch('exists before true');
		expect(result.text).toMatch('deleted true');
		expect(result.text).toMatch('exists after false');
	});

	test('update plugin', async () => {
		const {
			php,
			options: { projectPath },
		} = await copyWordPressAndStart(
			tmpExampleDirectory,
			'wordpress-plugin-update'
		);

		const akismetExistsBeforeUpdate = fs.existsSync(
			path.join(projectPath, 'wp-content/plugins/akismet/akismet.php')
		);
		expect(akismetExistsBeforeUpdate).toBe(true);

		const code = `<?php
				require_once 'wp-load.php';
				require_once 'wp-admin/includes/misc.php';
				require_once 'wp-admin/includes/plugin.php';
				require_once 'wp-admin/includes/class-wp-upgrader.php';
				require_once 'wp-admin/includes/file.php';

				WP_Filesystem();
				global $wp_filesystem;

				$plugin = 'akismet/akismet.php';
				$plugin_file_path = 'wp-content/plugins/akismet/akismet.php';

				$result = $wp_filesystem->exists($plugin_file_path);
				echo "exists before update " . ($result ? 'true' : 'false') . "\n";

				// Replace the akismet/akismet.php to a lower version to force an update
				$plugin_file_content = $wp_filesystem->get_contents($plugin_file_path);
				$plugin_file_content = preg_replace('/Version: (d|.)+/', 'Version: 5.3.1', $plugin_file_content);
				$wp_filesystem->put_contents($plugin_file_path, $plugin_file_content);

				wp_update_plugins();

				$upgrader = new Plugin_Upgrader();
				$upgrader->upgrade( $plugin );

				echo "\n";
				$result = $wp_filesystem->exists($plugin_file_path);
				echo "exists after update " . ($result ? 'true' : 'false') . "\n";
			`;

		const result = await php.run({
			code,
		});

		/* Example response:
			exists before update true
			<div class="wrap"><h1></h1><p>Downloading update from <span class="code pre">https://downloads.wordpress.org/plugin/akismet.5.3.2.zip</span>&#8230;</p>
			<p>Unpacking the update&#8230;</p>
			<p>Installing the latest version&#8230;</p>
			<p>Removing the old version of the plugin&#8230;</p>
			<p>Could not remove the old plugin.</p>
			<p>Plugin update failed.</p>
			</div>
			exists after update true
		*/

		const akismetExistsAfterUpdate = fs.existsSync(
			path.join(projectPath, 'wp-content/plugins/akismet/akismet.php')
		);
		expect(akismetExistsAfterUpdate).toBe(true);

		expect(result.text).toMatch('exists before update true');
		expect(result.text).toMatch('Removing the old version of the plugin');
		expect(result.text).not.toMatch('Could not remove the old plugin');
		expect(result.text).not.toMatch('Plugin update failed');
		expect(result.text).toMatch('exists after update true');
	});
});
