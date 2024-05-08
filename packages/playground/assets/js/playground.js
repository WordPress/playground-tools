(async () => {
	const onError = (error) => {
		alert(
			`Playground couldn’t start. Please check the browser console for more information. ${error}`
		);
		const backButton = document.getElementById('goBack');
		if (backButton) {
			backButton.click();
		}
	};

	if (!window.playground) {
		onError('Playground script data not found.');
		return;
	}
	try {
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
						path: '/wordpress/wp-content/database/database.sql',
					},
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

		// Login as the current user without a password
		await client.writeFile(
			'/wordpress/playground-login.php',
			`<?php
			require_once( dirname( __FILE__ ) . '/wp-load.php' );
			if ( is_user_logged_in() ) {
				return;
			}
			$user = get_user_by( 'id', ${playground.userId} );
			if( $user ) {
				wp_set_current_user( $user->ID, $user->user_login );
				wp_set_auth_cookie( $user->ID );
				do_action( 'wp_login', $user->user_login, $user );
			}`
		);
		await client.request({
			url: '/playground-login.php',
		});
		await client.unlink('/wordpress/playground-login.php');

		if (playground.pluginSlug) {
			await client.goTo('/wp-admin/plugins.php');
		} else {
			await client.goTo('/wp-admin/');
		}
	} catch (error) {
		onError(error);
	}
})();
