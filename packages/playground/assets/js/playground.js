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
				step: 'writeFile',
				path: '/wordpress/wp-content/mu-plugins/0-login.php',
				data: `<?php
					add_action( 'setup_theme', function() {
						if ( is_user_logged_in() ) {
							return;
						}
						$user = get_user_by( 'id', ${playground.userId} );
						if( $user ) {
							wp_set_current_user( $user->ID, $user->user_login );
							wp_set_auth_cookie( $user->ID );
							do_action( 'wp_login', $user->user_login, $user );
						}
					} );
				`,
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
	await client.goTo('/');

	// if (playground.pluginSlug) {
	// 	await client.goTo('/wp-admin/plugins.php');
	// } else {
	// 	await client.goTo('/wp-admin/');
	// }
})();
