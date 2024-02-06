(function () {
	const query = new URLSearchParams(window.location.search);

	const blueprintUrl = query
		.get('blueprintUrl')
		.replace('https://wordpress.org', 'http://localhost:8010/proxy');
	(async () => {
		const { startPlaygroundWeb } = await import(
			playground.playgroundPackageUrl
		);
		const blueprint = await (await fetch(blueprintUrl)).json();

		blueprint.steps = blueprint.steps || [];
		blueprint.steps = [
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
			...blueprint.steps,
		];

		blueprint.preferredVersions = {
			wp: playground.wpVersion,
			php: playground.phpVersion,
		};

		const client = await startPlaygroundWeb({
			iframe: document.getElementById('wp-playground'),
			remoteUrl: `https://playground.wordpress.net/remote.html`,
			blueprint,
		});

		await client.isReady();

		client.goTo('/wp-admin/plugins.php');
	})();
})();
