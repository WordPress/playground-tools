(function () {
	const query = new URLSearchParams(window.location.search);
	const defaultBlueprint = {
		steps: [
			{
				step: 'login',
			},
		],
	};

	const blueprintUrl = query.get('blueprintUrl');
	(async () => {
		const { startPlaygroundWeb } = await import(
			playground.playgroundPackageUrl
		);
		const blueprint = blueprintUrl
			? await (await fetch(blueprintUrl)).json()
			: defaultBlueprint;

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
			remoteUrl: playground.playgroundRemoteUrl,
			blueprint,
		});

		await client.isReady();

		client.goTo('/wp-admin/plugins.php');
	})();
})();
