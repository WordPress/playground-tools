(async () => {
	const { startPlaygroundWeb } = await import(
		playground.playgroundPackageUrl
	);
	const blueprint = {
		features: {
			networking: true,
		},
		preferredVersions: {
			wp: playground.wpVersion,
			php: playground.phpVersion,
		},
		steps: [
			{
				step: 'unzip',
				zipFile: {
					resource: 'url',
					url: playground.zipUrl,
				},
				extractToPath: '/wordpress',
			},
			{
				step: 'runSql',
				sql: {
					resource: 'vfs',
					path: '/wordpress/schema/_Schema.sql',
				},
			},
			{
				step: 'login',
			},
		],
	};

	if (playground.pluginSlug) {
		blueprint.steps.push({
			step: 'installPlugin',
			pluginZipFile: {
				resource: 'wordpress.org/plugins',
				slug: playground.pluginSlug,
			},
			options: {
				activate: true,
			},
		});
	}

	const client = await startPlaygroundWeb({
		iframe: document.getElementById('wp-playground'),
		remoteUrl: playground.playgroundRemoteUrl,
		blueprint,
	});

	await client.isReady();

	if (playground.pluginSlug) {
		client.goTo('/wp-admin/plugins.php');
	} else {
		client.goTo('/wp-admin');
	}
})();
