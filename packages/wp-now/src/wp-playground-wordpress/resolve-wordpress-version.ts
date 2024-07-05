function isVersionAlias(requestedWordPressVersion: string) {
	return ['latest', 'trunk', 'nightly'].includes(requestedWordPressVersion);
}

const VERSION_CHECKER_ENDPOINT =
	'https://api.wordpress.org/core/version-check/1.7';

export async function resolveWordPressVersion(wordPressVersion: string) {
	if (!isVersionAlias(wordPressVersion)) {
		return {
			resolvedWordPressVersion: wordPressVersion,
			isDeveloperBuild: false,
		};
	}

	const url = new URL(VERSION_CHECKER_ENDPOINT);

	const isDeveloperBuild = wordPressVersion !== 'latest';

	if (isDeveloperBuild) {
		url.searchParams.set('channel', 'development');
	}

	const response = await fetch(url);
	const data = await response.json();

	const version = data?.offers?.[0]?.version ?? null;

	if (version == null) {
		throw new Error(
			`Failed to fetch ${wordPressVersion} WordPress version`
		);
	}

	return {
		resolvedWordPressVersion: version as string,
		isDeveloperBuild,
	};
}
