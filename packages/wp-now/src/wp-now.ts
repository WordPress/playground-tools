import path from 'path';
import { rootCertificates } from 'tls';
import fs from 'fs-extra';
import { createNodeFsMountHandler, loadNodeRuntime } from '@php-wasm/node';
import {
	PHP,
	PHPRequestHandler,
	proxyFileSystem,
	rotatePHPRuntime,
	setPhpIniEntries,
	UnmountFunction,
} from '@php-wasm/universal';
import {
	wordPressRewriteRules,
	getFileNotFoundActionForWordPress,
} from '@wp-playground/wordpress';
import { SQLITE_FILENAME } from './constants';
import {
	downloadMuPlugins,
	downloadSqliteIntegrationPlugin,
	downloadWordPress,
} from './download';
import {
	StepDefinition,
	activatePlugin,
	activateTheme,
	compileBlueprint,
	defineWpConfigConsts,
	login,
	runBlueprintSteps,
} from '@wp-playground/blueprints';
import { WPNowOptions, WPNowMode } from './config';
import {
	hasIndexFile,
	isPluginDirectory,
	isThemeDirectory,
	isWpContentDirectory,
	isWordPressDirectory,
	isWordPressDevelopDirectory,
	getPluginFile,
	readFileHead,
	resolveWordPressVersion,
} from './wp-playground-wordpress';
import { output } from './output';
import getWpNowPath from './get-wp-now-path';
import getWordpressVersionsPath from './get-wordpress-versions-path';
import getSqlitePath, { getSqliteDbCopyPath } from './get-sqlite-path';

function mountWithHandler(
	php: PHP,
	virtualFSPath: string,
	hostPath: string
): Promise<UnmountFunction> {
	// Must ensure target exists for both folder *and* file
	php.mkdir(virtualFSPath);
	return php.mount(virtualFSPath, createNodeFsMountHandler(hostPath));
}

export default async function startWPNow(
	options: Partial<WPNowOptions> = {}
): Promise<{ php: PHP; options: WPNowOptions }> {
	const { documentRoot } = options;

	const requestHandler = new PHPRequestHandler({
		phpFactory: async ({ isPrimary, requestHandler }) => {
			const { php } = await getPHPInstance(options);

			if (requestHandler) {
				php.requestHandler = requestHandler;
			}
			if (isPrimary) {
				/**
				 * @TODO: Mount /internal/shared/mu-plugins instead of altering
				 * the installed WordPress site. Refer to @wp-playground/wordpress.
				 * https://github.com/WordPress/wordpress-playground/blob/19e64f5782631e94ffeb6dd2e552c3868c6dc29d/packages/playground/wordpress/src/boot.ts#L127-L143
				 */
			} else {
				// Proxy the filesystem for all secondary PHP instances
				proxyFileSystem(await requestHandler.getPrimaryPhp(), php, [
					'/tmp',
					requestHandler.documentRoot,
					'/internal/shared',
				]);
			}
			return php;
		},
		documentRoot,
		absoluteUrl: options.absoluteUrl,
		maxPhpInstances: options.numberOfPhpInstances,
		rewriteRules: wordPressRewriteRules,
		getFileNotFoundAction: getFileNotFoundActionForWordPress,
	});

	const php = await requestHandler.getPrimaryPhp();

	prepareDocumentRoot(php, options);

	output?.log(`directory: ${options.projectPath}`);
	output?.log(`mode: ${options.mode}`);
	output?.log(`php: ${options.phpVersion}`);
	if (options.mode === WPNowMode.INDEX) {
		runIndexMode(php, options);
		return { php, options };
	}

	const { resolvedWordPressVersion, isDeveloperBuild } =
		await resolveWordPressVersion(options.wordPressVersion);

	let wpVersionOutput = resolvedWordPressVersion;

	if (resolvedWordPressVersion !== options.wordPressVersion) {
		const originalWordPressVersion = options.wordPressVersion;
		options.wordPressVersion = resolvedWordPressVersion;
		wpVersionOutput += ` (resolved from alias: ${originalWordPressVersion})`;
	}

	output?.log(`wp: ${wpVersionOutput}`);
	await Promise.all([
		downloadWordPress(options.wordPressVersion, { isDeveloperBuild }),
		downloadMuPlugins(),
		downloadSqliteIntegrationPlugin(),
	]);

	if (options.reset) {
		fs.removeSync(options.wpContentPath);
		output?.log(
			'Created a fresh SQLite database and wp-content directory.'
		);
	}

	const isFirstTimeProject = !fs.existsSync(options.wpContentPath);

	await prepareWordPress(php, options);

	if (options.blueprintObject) {
		output?.log(`blueprint steps: ${options.blueprintObject.steps.length}`);
		const compiled = compileBlueprint(options.blueprintObject, {
			onStepCompleted: (result, step: StepDefinition) => {
				output?.log(`Blueprint step completed: ${step.step}`);
			},
		});
		await runBlueprintSteps(compiled, php);
	}

	await installationStep2(php);
	try {
		await login(php, {
			username: 'admin',
			password: 'password',
		});
	} catch (e) {
		// It's okay if the user customized the username and password
		// and the login fails now.
		output?.error('Login failed');
	}

	if (
		isFirstTimeProject &&
		[WPNowMode.PLUGIN, WPNowMode.THEME].includes(options.mode)
	) {
		await activatePluginOrTheme(php, options);
	}

	rotatePHPRuntime({
		php,
		cwd: requestHandler.documentRoot,
		recreateRuntime: async () => {
			output?.log('Recreating and rotating PHP runtime');
			const { php, runtimeId } = await getPHPInstance(
				options,
				true,
				requestHandler
			);
			prepareDocumentRoot(php, options);
			await prepareWordPress(php, options);
			return runtimeId;
		},
		maxRequests: 400,
	});

	return {
		php,
		options,
	};
}

async function getPHPInstance(
	options: WPNowOptions
): Promise<{ php: PHP; runtimeId: number }> {
	const id = await loadNodeRuntime(options.phpVersion);
	const php = new PHP(id);

	await setPhpIniEntries(php, {
		memory_limit: '256M',
		disable_functions: '',
		allow_url_fopen: '1',
		'openssl.cafile': '/internal/shared/ca-bundle.crt',
	});

	return { php, runtimeId: id };
}

function prepareDocumentRoot(php: PHP, options: WPNowOptions) {
	php.mkdir(options.documentRoot);
	php.chdir(options.documentRoot);
	php.writeFile(
		`${options.documentRoot}/index.php`,
		`<?php echo 'Hello wp-now!';`
	);
	php.writeFile(
		'/internal/shared/ca-bundle.crt',
		rootCertificates.join('\n')
	);
}

async function prepareWordPress(php: PHP, options: WPNowOptions) {
	switch (options.mode) {
		case WPNowMode.WP_CONTENT:
			await runWpContentMode(php, options);
			break;
		case WPNowMode.WORDPRESS_DEVELOP:
			await runWordPressDevelopMode(php, options);
			break;
		case WPNowMode.WORDPRESS:
			await runWordPressMode(php, options);
			break;
		case WPNowMode.PLUGIN:
			await runPluginOrThemeMode(php, options);
			break;
		case WPNowMode.THEME:
			await runPluginOrThemeMode(php, options);
			break;
		case WPNowMode.PLAYGROUND:
			await runWpPlaygroundMode(php, options);
			break;
	}
}

async function runIndexMode(
	php: PHP,
	{ documentRoot, projectPath }: WPNowOptions
) {
	await mountWithHandler(php, documentRoot, projectPath);
}

async function runWpContentMode(
	php: PHP,
	{
		documentRoot,
		wordPressVersion,
		wpContentPath,
		projectPath,
		absoluteUrl,
	}: WPNowOptions
) {
	const wordPressPath = path.join(
		getWordpressVersionsPath(),
		wordPressVersion
	);
	await mountWithHandler(php, documentRoot, wordPressPath);
	await initWordPress(php, wordPressVersion, documentRoot, absoluteUrl);
	fs.ensureDirSync(wpContentPath);

	await mountWithHandler(php, `${documentRoot}/wp-content`, projectPath);

	await mountSqlitePlugin(php, documentRoot);
	await mountSqliteDatabaseDirectory(php, documentRoot, wpContentPath);
	await mountMuPlugins(php, documentRoot);
}

async function runWordPressDevelopMode(
	php: PHP,
	{ documentRoot, projectPath, absoluteUrl }: WPNowOptions
) {
	await runWordPressMode(php, {
		documentRoot,
		projectPath: projectPath + '/build',
		absoluteUrl,
	});
}

async function runWordPressMode(
	php: PHP,
	{ documentRoot, wpContentPath, projectPath, absoluteUrl }: WPNowOptions
) {
	await mountWithHandler(php, documentRoot, projectPath);

	const { initializeDefaultDatabase } = await initWordPress(
		php,
		'user-provided',
		documentRoot,
		absoluteUrl
	);

	if (
		initializeDefaultDatabase ||
		fs.existsSync(path.join(wpContentPath, 'database'))
	) {
		await mountSqlitePlugin(php, documentRoot);
		await mountSqliteDatabaseDirectory(php, documentRoot, wpContentPath);
	}

	await mountMuPlugins(php, documentRoot);
}

async function runPluginOrThemeMode(
	php: PHP,
	{
		wordPressVersion,
		documentRoot,
		projectPath,
		wpContentPath,
		absoluteUrl,
		mode,
	}: WPNowOptions
) {
	const wordPressPath = path.join(
		getWordpressVersionsPath(),
		wordPressVersion
	);
	await mountWithHandler(php, documentRoot, wordPressPath);
	await initWordPress(php, wordPressVersion, documentRoot, absoluteUrl);

	fs.ensureDirSync(wpContentPath);
	fs.copySync(
		path.join(getWordpressVersionsPath(), wordPressVersion, 'wp-content'),
		wpContentPath
	);
	await mountWithHandler(php, `${documentRoot}/wp-content`, wpContentPath);

	const pluginName = path.basename(projectPath);
	const directoryName = mode === WPNowMode.PLUGIN ? 'plugins' : 'themes';
	await mountWithHandler(
		php,
		`${documentRoot}/wp-content/${directoryName}/${pluginName}`,
		projectPath
	);
	if (mode === WPNowMode.THEME) {
		const templateName = getThemeTemplate(projectPath);
		if (templateName) {
			// We assume that the theme template is in the parent directory
			const templatePath = path.join(projectPath, '..', templateName);
			if (fs.existsSync(templatePath)) {
				await mountWithHandler(
					php,
					`${documentRoot}/wp-content/${directoryName}/${templateName}`,
					templatePath
				);
			} else {
				output?.error(
					`Parent for child theme not found: ${templateName}`
				);
			}
		}
	}
	await mountSqlitePlugin(php, documentRoot);
	await mountMuPlugins(php, documentRoot);
}

async function runWpPlaygroundMode(
	php: PHP,
	{ documentRoot, wordPressVersion, wpContentPath, absoluteUrl }: WPNowOptions
) {
	const wordPressPath = path.join(
		getWordpressVersionsPath(),
		wordPressVersion
	);
	await mountWithHandler(php, documentRoot, wordPressPath);
	await initWordPress(php, wordPressVersion, documentRoot, absoluteUrl);

	fs.ensureDirSync(wpContentPath);
	fs.copySync(
		path.join(getWordpressVersionsPath(), wordPressVersion, 'wp-content'),
		wpContentPath
	);
	await mountWithHandler(php, `${documentRoot}/wp-content`, wpContentPath);

	await mountSqlitePlugin(php, documentRoot);
	await mountMuPlugins(php, documentRoot);
}

/**
 * Initialize WordPress
 *
 * Initializes WordPress by copying sample config file to wp-config.php if it doesn't exist,
 * and sets up additional constants for PHP.
 *
 * It also returns information about whether the default database should be initialized.
 *
 * @param php
 * @param wordPressVersion
 * @param vfsDocumentRoot
 * @param siteUrl
 */
async function initWordPress(
	php: PHP,
	wordPressVersion: string,
	vfsDocumentRoot: string,
	siteUrl: string
) {
	let initializeDefaultDatabase = false;
	if (!php.fileExists(`${vfsDocumentRoot}/wp-config.php`)) {
		php.writeFile(
			`${vfsDocumentRoot}/wp-config.php`,
			php.readFileAsText(`${vfsDocumentRoot}/wp-config-sample.php`)
		);
		initializeDefaultDatabase = true;
	}

	const wpConfigConsts = {
		WP_HOME: siteUrl,
		WP_SITEURL: siteUrl,
	};
	if (wordPressVersion !== 'user-defined') {
		wpConfigConsts['WP_AUTO_UPDATE_CORE'] = wordPressVersion === 'latest';
	}
	await defineWpConfigConsts(php, {
		consts: wpConfigConsts,
		method: 'define-before-run',
	});
	return { initializeDefaultDatabase };
}

async function activatePluginOrTheme(
	php: PHP,
	{ projectPath, mode }: WPNowOptions
) {
	if (mode === WPNowMode.PLUGIN) {
		const pluginFile = getPluginFile(projectPath);
		await activatePlugin(php, { pluginPath: pluginFile });
	} else if (mode === WPNowMode.THEME) {
		const themeFolderName = path.basename(projectPath);
		await activateTheme(php, { themeFolderName });
	}
}

export function getThemeTemplate(projectPath: string) {
	const themeTemplateRegex = /^(?:[ \t]*<\?php)?[ \t/*#@]*Template:(.*)$/im;
	const styleCSS = readFileHead(path.join(projectPath, 'style.css'));
	if (themeTemplateRegex.test(styleCSS)) {
		const themeName = themeTemplateRegex.exec(styleCSS)[1].trim();
		return themeName;
	}
}

async function mountMuPlugins(php: PHP, vfsDocumentRoot: string) {
	await mountWithHandler(
		php,
		// VFS paths always use forward / slashes so
		// we can't use path.join() for them
		`${vfsDocumentRoot}/wp-content/mu-plugins`,
		path.join(getWpNowPath(), 'mu-plugins')
	);
}

function getSqlitePluginPath(vfsDocumentRoot: string) {
	return `${vfsDocumentRoot}/wp-content/mu-plugins/${SQLITE_FILENAME}`;
}

async function mountSqlitePlugin(php: PHP, vfsDocumentRoot: string) {
	const sqlitePluginPath = getSqlitePluginPath(vfsDocumentRoot);
	if (php.listFiles(sqlitePluginPath).length === 0) {
		await mountWithHandler(php, sqlitePluginPath, getSqlitePath());
		await mountWithHandler(
			php,
			`${vfsDocumentRoot}/wp-content/db.php`,
			getSqliteDbCopyPath()
		);
	}
}

/**
 * Create SQLite database directory in hidden utility directory and mount it to the document root
 *
 * @param php
 * @param vfsDocumentRoot
 * @param wpContentPath
 */
async function mountSqliteDatabaseDirectory(
	php: PHP,
	vfsDocumentRoot: string,
	wpContentPath: string
) {
	fs.ensureDirSync(path.join(wpContentPath, 'database'));
	await mountWithHandler(
		php,
		`${vfsDocumentRoot}/wp-content/database`,
		path.join(wpContentPath, 'database')
	);
}

export function inferMode(
	projectPath: string
): Exclude<WPNowMode, WPNowMode.AUTO> {
	if (isWordPressDevelopDirectory(projectPath)) {
		return WPNowMode.WORDPRESS_DEVELOP;
	} else if (isWordPressDirectory(projectPath)) {
		return WPNowMode.WORDPRESS;
	} else if (isWpContentDirectory(projectPath)) {
		return WPNowMode.WP_CONTENT;
	} else if (isPluginDirectory(projectPath)) {
		return WPNowMode.PLUGIN;
	} else if (isThemeDirectory(projectPath)) {
		return WPNowMode.THEME;
	} else if (hasIndexFile(projectPath)) {
		return WPNowMode.INDEX;
	}
	return WPNowMode.PLAYGROUND;
}

async function installationStep2(php: PHP) {
	return await php.requestHandler.request({
		url: '/wp-admin/install.php?step=2',
		method: 'POST',
		body: {
			language: 'en',
			prefix: 'wp_',
			weblog_title: 'My WordPress Website',
			user_name: 'admin',
			admin_password: 'password',
			admin_password2: 'password',
			Submit: 'Install WordPress',
			pw_weak: '1',
			admin_email: 'admin@localhost.com',
		},
	});
}
