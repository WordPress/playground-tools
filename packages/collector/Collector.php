<?php
/**
 * @package Collector
 * @version 0.0.0
 */
/*
Plugin Name: Collector
Plugin URI: https://github.com/seanmorris/collector
Description: Packages your WordPress install and sends it to Playground.
Author: Sean Morris
Version: 0.0.0
Author URI: https://github.com/seanmorris/
*/
const COLLECTOR_DOWNLOAD_PATH = '?page=collector_download_package';
const COLLECTOR_PLAYGROUND_PACKAGE = 'https://playground.wordpress.net/client/index.js';
const TRANSLATE_DOMAIN = 'playground-collector';

global $wp_version;

define('COLLECTOR_WP_VERSION', $wp_version);
define('COLLECTOR_FINAL_ZIP', get_temp_dir() . '/collector-package.zip');
define('COLLECTOR_PHP_VERSION', implode('.',sscanf(phpversion(), '%d.%d')));

require __DIR__ . '/Collector_Content.php';
require __DIR__ . '/Collector_Db.php';
require __DIR__ . '/Collector_Helpers.php';
require __DIR__ . '/Collector_Zip.php';

add_action('admin_menu', 'collector_plugin_menu');
add_action('plugins_loaded', 'collector_plugins_loaded');
add_filter('plugin_install_action_links', 'collector_plugin_install_action_links', 10, 2);
add_filter('plugins_api_args', 'collector_plugins_api_args', 10, 2);

function get_collector_admin_page_url() {
	return admin_url(COLLECTOR_DOWNLOAD_PATH);
}

function collector_plugins_loaded()
{
	if(!current_user_can('manage_options'))
	{
		return;
	}

	if(home_url($_SERVER['REQUEST_URI']) === get_collector_admin_page_url())
	{
		collector_zip_collect();
		collector_zip_send();
		collector_zip_delete();
		exit();
	}
}

function collector_plugin_menu()
{
	add_submenu_page(
		NULL,
		'Collector',
		'Collector',
		'manage_options',
		'collector_render_playground_page',
		'collector_render_playground_page',
		NULL
	);
}

function collector_render_playground_page()
{?>
	<div id = "wp-playground-wrapper">
		<div id = "wp-playground-toolbar">
			<span>
				<?php
				printf(
					__(
						'WordPress Playground preview for %s',
						TRANSLATE_DOMAIN
					),
					get_bloginfo('name')
				);
				?>
			</span>
			<a href="<?php echo admin_url( 'plugin-install.php' ); ?>" id = "goBack">
				<?php _e('Go Back', TRANSLATE_DOMAIN); ?>
			</a>
		</div>
		<div id = "wp-playground-main-area">
			<iframe id = "wp-playground"></iframe>
		</div>
	</div>
	<script type = "text/javascript">
		const frame  = document.getElementById('wp-playground');
		const zipUrl = '<?= esc_url( get_collector_admin_page_url() ); ?>';

		const query = new URLSearchParams(window.location.search);

		const username   = <?=json_encode(htmlspecialchars(wp_get_current_user()->user_login, ENT_QUOTES, 'UTF-8'));?>;
		const fakepass   = <?=json_encode(collector_get_fakepass());?>;
		const blueprintUrl = query.get('blueprintUrl');

		(async () => {
			const  { startPlaygroundWeb } = await import(<?=json_encode(COLLECTOR_PLAYGROUND_PACKAGE);?>);
			const blueprint = await (await fetch(blueprintUrl)).json();

			blueprint.steps = blueprint.steps || [];

			blueprint.steps.unshift(
				{
					step: 'writeFile',
					path: '/data.zip',
					data: {
						'resource': 'url',
						'url': zipUrl,
					},
				},
				{
					step: 'unzip',
					zipPath: '/data.zip',
					extractToPath: '/wordpress',
				},
				{
					step: 'rm',
					path: '/data.zip',
				},
				{
					step: 'runSql',
					sql: {
						resource: 'vfs',
						path: '/wordpress/schema/_Schema.sql',
					}
				},
				{
					step: 'login',
					username: username,
					password: fakepass,
				},
			);

			blueprint.preferredVersions = {
				wp: <?=json_encode(COLLECTOR_WP_VERSION);?>,
				php: <?=json_encode(COLLECTOR_PHP_VERSION);?>,
			};

			const client = await startPlaygroundWeb({
				iframe: document.getElementById('wp-playground'),
				remoteUrl: `https://playground.wordpress.net/remote.html`,
				blueprint
			});

			await client.isReady();

			client.goTo('/wp-admin/plugins.php');
		})();

		const goBack = document.getElementById('goBack');
		const goBackClicked = event => {

			const qsUrl  = new URLSearchParams(window.location.search).get('returnUrl');
			const drUrl  = new URL(document.referrer).pathname;

			if (qsUrl && qsUrl.substr(0,7) !== 'http://' && qsUrl.substr(0,8) !== 'https://' && qsUrl.substr(0,2) !== '//') {
				window.location.assign(qsUrl);
				event.preventDefault();
			}
			else if (drUrl && drUrl.substr(0,7) !== 'http://' && drUrl.substr(0,8) !== 'https://' && drUrl.substr(0,2) !== '//') {
				window.location.assign(drUrl);
				event.preventDefault();
			}
		};

		goBack.addEventListener('click', goBackClicked);

	</script>

	<a href = "<?= get_collector_admin_page_url();?>">
		<?php _e('Download Zip', TRANSLATE_DOMAIN); ?>
	</a>

	<style type = "text/css">
		#wp-playground-toolbar {
			background-color: #eaaa00; font-weight: bold; text-align: center; font-size: 1rem; padding: 0.75em;
			display: flex; flex-direction: row; align-items: center; justify-content: center;
			box-shadow: 0 4px 4px rgba(0,0,0,0.25); position: relative; z-index:1999999;
			animation: collector-fade-in 0.25s 0.65s cubic-bezier(0.175, 0.885, 0.5, 1.85) 1 forwards; transform:translateY(-100%);
		}
		#wp-playground-toolbar > a { text-transform: capitalize; font-size: 0.8rem; padding: 0 0.5rem; }
		#wpbody-content, #wpcontent { padding-left: 0px !important; }
		#wpwrap, #wpbody, #wpbody-content {padding-bottom: 0px; height: 100%;}
		#wpwrap, #wpbody { position: initial; }
		#wp-playground-main-area { position: relative; display: flex; flex: 1; }
		#wp-playground, #wp-playground-wrapper {
			position: absolute; top: 0; left: 0; width:100%; height:100%; z-index:999999; background-color: #FFF;
			display: flex; flex-direction: column;
		}
		@keyframes collector-fade-in { from{transform:translateY(-100%)} to{transform:translateY(0)} }
	</style>
<?php
}

function collector_plugin_install_action_links($action_links, $plugin)
{
	if(!$plugin['blueprints'])
	{
		return $action_links;
	}

	foreach($plugin['blueprints'] as $blueprint)
	{
		$retUrl = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) . urlencode('?' . http_build_query($_GET));

		$preview_url = add_query_arg(
			[
				'blueprintUrl' => esc_url($blueprint['url']),
				'returnUrl'    => esc_attr($retUrl),
			],
			admin_url('admin.php?page=collector_render_playground_page')
		);

		$preview_button = sprintf(
			'<a class="preview-now button" data-slug="%s" href="%s" aria-label="%s" data-name="%s">%s</a>',
			esc_attr( $plugin['slug'] ),
			$preview_url,
			/* translators: %s: Plugin name and version. */
			esc_attr( sprintf( _x( 'Preview %s now', 'plugin' ), $plugin['name'] ) ),
			esc_attr( $plugin['name'] ),
			__( 'Preview Now', TRANSLATE_DOMAIN )
		);

		array_unshift($action_links, $preview_button);

		// Use only a single Blueprint json for now:
		break;
	}


	return $action_links;
}

function collector_plugins_api_args($args, $action)  {

	if ($action === 'query_plugins') {
		$args->fields = ($args->fields ?? '') . 'blueprints';
	}

	return $args;

}
