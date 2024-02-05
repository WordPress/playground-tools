(function () {
	const query = new URLSearchParams(window.location.search);

	const blueprintUrl = query.get('blueprintUrl');
	(async () => {
		const { startPlaygroundWeb } = await import(
			collector.playgroundPackageUrl
		);
		const blueprint = await (await fetch(blueprintUrl)).json();

		blueprint.steps = blueprint.steps || [];
		blueprint.steps = [
			...blueprint.steps,
			{
				step: 'unzip',
				zipFile: {
					resource: 'url',
					url: collector.zipUrl,
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
		];

		blueprint.preferredVersions = {
			wp: collector.wpVersion,
			php: collector.phpVersion,
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
