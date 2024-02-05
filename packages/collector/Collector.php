<?php
/*
Plugin Name: Collector
Plugin URI: https://github.com/WordPress/playground-tools/tree/trunk/packages/collector
Description: Packages your WordPress install and sends it to Playground.
Author: WordPress Contributors
Version: 0.0.1
*/

defined('ABSPATH') || exit;

const COLLECTOR_DOWNLOAD_PATH = '?page=collector_download_package';
const COLLECTOR_ADMIN_PAGE_SLUG = 'collector_render_playground_page';
const COLLECTOR_PLAYGROUND_PACKAGE = 'https://playground.wordpress.net/client/index.js';
const TRANSLATE_DOMAIN = 'playground-collector';
const ADMIN_PAGE_CAPABILITY = 'manage_options';

global $wp_version;

define('COLLECTOR_VERSION', $wp_version);
define('COLLECTOR_WP_VERSION', $wp_version);
define('COLLECTOR_PHP_VERSION', implode('.', sscanf(phpversion(), '%d.%d')));

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/src/collector-content.php';
require __DIR__ . '/src/collector-db.php';
require __DIR__ . '/src/collector-zip.php';

add_action('admin_menu', 'collector_plugin_menu');
add_action('admin_init', 'collector_init');
add_action('plugins_loaded', 'collector_plugins_loaded');

function collector_init()
{
	add_action('admin_enqueue_scripts', 'collector_enqueue_scripts');
	add_filter('plugin_install_action_links', 'collector_plugin_install_action_links', 10, 2);
	add_filter('plugins_api_args', 'collector_plugins_api_args', 10, 2);
}

function collector_enqueue_scripts($current_screen_id)
{
	if ($current_screen_id !== 'admin_page_collector_render_playground_page') {
		return;
	}
	wp_enqueue_style('collector', plugin_dir_url(__FILE__) . 'assets/css/collector.css', [], COLLECTOR_VERSION);
	wp_register_script('collector', plugin_dir_url(__FILE__) . 'assets/js/collector.js', [], COLLECTOR_VERSION, true);
	wp_localize_script('collector', 'collector', [
		'zipUrl' => esc_url(get_collector_admin_page_url()),
		'wpVersion' => COLLECTOR_WP_VERSION,
		'phpVersion' => COLLECTOR_PHP_VERSION,
		'playgroundPackageUrl' => COLLECTOR_PLAYGROUND_PACKAGE,
	]);
	wp_enqueue_script('collector');
}

function get_collector_admin_page_url()
{
	return admin_url(COLLECTOR_DOWNLOAD_PATH);
}

function collector_plugins_loaded()
{
	if (!current_user_can(ADMIN_PAGE_CAPABILITY)) {
		return;
	}

	if (home_url($_SERVER['REQUEST_URI']) === get_collector_admin_page_url()) {
		collector_zip_collect();
		exit();
	}
}

function collector_plugin_menu()
{
	add_submenu_page(
		NULL,
		__('Collector', TRANSLATE_DOMAIN),
		__('Collector', TRANSLATE_DOMAIN),
		ADMIN_PAGE_CAPABILITY,
		COLLECTOR_ADMIN_PAGE_SLUG,
		'collector_render_playground_page',
		NULL
	);
}

function collector_render_playground_page()
{
	include __DIR__ . '/templates/playground-page.php';
}

function collector_plugin_install_action_links($action_links, $plugin)
{
	if (empty($plugin['blueprints'])) {
		return $action_links;
	}

	$blueprint = $plugin['blueprints'][0];

	$retUrl = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) . urlencode('?' . http_build_query($_GET));

	$preview_url = add_query_arg(
		[
			'blueprintUrl' => esc_url($blueprint['url']),
			'returnUrl'    => esc_attr($retUrl),
		],
		admin_url('admin.php?page=' . COLLECTOR_ADMIN_PAGE_SLUG)
	);

	$preview_button = sprintf(
		'<a class="preview-now button" data-slug="%s" href="%s" aria-label="%s" data-name="%s">%s</a>',
		esc_attr($plugin['slug']),
		$preview_url,
		esc_attr(
			sprintf(
				/* translators: %s: Plugin name. */
				_x('Preview %s now', 'plugin'),
				$plugin['name']
			)
		),
		esc_attr($plugin['name']),
		__('Preview Now', TRANSLATE_DOMAIN)
	);

	array_unshift($action_links, $preview_button);

	return $action_links;
}

function collector_plugins_api_args($args, $action)
{
	if ($action === 'query_plugins') {
		$args->fields = ($args->fields ?? '') . 'blueprints';
	}

	return $args;
}
