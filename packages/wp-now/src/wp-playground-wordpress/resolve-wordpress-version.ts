import fs from 'fs-extra';
import path from 'path';
import getWpNowPath from '../get-wp-now-path';

const VERSION_CHECKER_ENDPOINT =
	'https://api.wordpress.org/core/version-check/1.7';
const OFFLINE_FALLBACK_FILE = path.join(
	getWpNowPath(),
	'wp-version-offline.json'
);

function isVersionAlias(requestedWordPressVersion: string): boolean {
	return ['latest', 'trunk', 'nightly'].includes(requestedWordPressVersion);
}

async function fetchWordPressVersion(
	isDeveloperBuild: boolean
): Promise<string | null> {
	const url = new URL(VERSION_CHECKER_ENDPOINT);
	if (isDeveloperBuild) {
		url.searchParams.set('channel', 'development');
	}

	const response = await fetch(url);
	const data = await response.json();

	return data?.offers?.[0]?.version ?? null;
}

async function readOfflineVersions(): Promise<Record<string, string>> {
	try {
		return await fs.readJson(OFFLINE_FALLBACK_FILE);
	} catch (error) {
		return {};
	}
}

async function writeOfflineVersions(
	offlineData: Record<string, string>
): Promise<void> {
	try {
		await fs.ensureFile(OFFLINE_FALLBACK_FILE);
		await fs.writeJson(OFFLINE_FALLBACK_FILE, offlineData, { spaces: 2 });
	} catch (error) {
		console.error('Failed to create offline fallback file:', error);
	}
}

async function getOfflineVersion(
	wordPressVersion: string
): Promise<string | null> {
	const offlineData = await readOfflineVersions();
	return offlineData[wordPressVersion] || null;
}

export async function resolveWordPressVersion(wordPressVersion: string) {
	if (!isVersionAlias(wordPressVersion)) {
		return {
			resolvedWordPressVersion: wordPressVersion,
			isDeveloperBuild: false,
		};
	}

	const isDeveloperBuild = wordPressVersion !== 'latest';

	try {
		const version = await fetchWordPressVersion(isDeveloperBuild);

		if (version) {
			const offlineData = await readOfflineVersions();
			offlineData[wordPressVersion] = version;
			await writeOfflineVersions(offlineData);

			return {
				resolvedWordPressVersion: version,
				isDeveloperBuild,
			};
		}
	} catch (error) {
		console.warn(
			'Failed to fetch WordPress version online. Trying offline version.'
		);
	}

	const offlineFallbackVersion = await getOfflineVersion(wordPressVersion);

	if (offlineFallbackVersion) {
		return {
			resolvedWordPressVersion: offlineFallbackVersion,
			isDeveloperBuild,
		};
	}

	throw new Error(
		`Failed to resolve ${wordPressVersion} WordPress version. Please check your internet connection or try again later.`
	);
}
