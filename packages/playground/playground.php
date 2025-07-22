<?php
/**
 * Plugin Name: Sandbox Site powered by Playground 
 * Plugin URI: https://github.com/WordPress/playground-tools/tree/trunk/packages/playground
 * Description: Clone your WordPress site in Playground. Preview plugins and safely experiment without affecting your live site.
 * Author: WordPress Contributors
 * Version: 0.1.8
 * Requires PHP: 8.0
 * License: GPLv2
 * Text Domain: playground
 */

namespace WordPress\Playground;

defined('ABSPATH') || exit;

const PLAYGROUND_ADMIN_PAGE_SLUG = 'playground';
const ADMIN_PAGE_CAPABILITY = 'manage_options';

global $wp_version;

define('PLAYGROUND_VERSION', $wp_version);
define('PLAYGROUND_WP_VERSION', $wp_version);
define('PLAYGROUND_PHP_VERSION', implode('.', sscanf(phpversion(), '%d.%d')));

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/src/playground-zip.php';
require __DIR__ . '/src/playground-export.php';

add_action('admin_menu', __NAMESPACE__ . '\plugin_menu');
add_action('admin_init', __NAMESPACE__ . '\init');
add_action('plugins_loaded', __NAMESPACE__ . '\plugins_loaded');

/**
 * Initialize the plugin.
 */
function init()
{
	add_action('admin_enqueue_scripts', __NAMESPACE__ . '\enqueue_scripts');
	add_filter('plugin_install_action_links', __NAMESPACE__ . '\plugin_install_action_links', 10, 2);
}

/**
 * Enqueue scripts and styles for the plugin.
 *
 * @param string $current_screen_id The current screen ID.
 */
function enqueue_scripts($current_screen_id)
{
	if ($current_screen_id !== 'tools_page_' . PLAYGROUND_ADMIN_PAGE_SLUG) {
		return;
	}
	wp_enqueue_style('playground', plugin_dir_url(__FILE__) . 'assets/css/playground.css', [], PLAYGROUND_VERSION);
	wp_register_script('playground', plugin_dir_url(__FILE__) . 'assets/js/playground.js', [], PLAYGROUND_VERSION, true);
	wp_localize_script('playground', 'playground', [
		'zipUrl' => esc_url(get_download_page_url()),
		'wpVersion' => PLAYGROUND_WP_VERSION,
		'phpVersion' => PLAYGROUND_PHP_VERSION,
		'playgroundPackageUrl' => apply_filters(
			'playground_package_url',
			esc_url('https://playground.wordpress.net/client/index.js'),
		),
		'playgroundRemoteUrl' => apply_filters(
			'playground_remote_url',
			esc_url('https://playground.wordpress.net/remote.html'),
		),
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		'pluginSlug' => isset($_GET['pluginSlug']) ? sanitize_text_field($_GET['pluginSlug']) : false,
		'userId' => get_current_user_id(),
	]);
	wp_enqueue_script('playground');
}

/**
 * Get the URL to download the playground package.
 *
 * @return string The URL to download the playground package.
 */
function get_download_page_url()
{
	return add_query_arg(
		[
			'download' => 1,
		],
		admin_url('tools.php?page=' . PLAYGROUND_ADMIN_PAGE_SLUG)
	);
}

/**
 * Collect the WordPress package and package it into a zip file.
 */
function plugins_loaded()
{
	global $pagenow;
	if ('tools.php' !== $pagenow) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if (!isset($_GET['page']) || PLAYGROUND_ADMIN_PAGE_SLUG !== $_GET['page']) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if (!isset($_GET['download'])) {
		return;
	}

	download_snapshot();
}

/**
 * Download the Playground snapshot.
 */
function download_snapshot()
{
	if (!is_admin()) {
		return;
	}
	if (!current_user_can(ADMIN_PAGE_CAPABILITY)) {
		return;
	}

	zip_collect();
	wp_die();
}

/**
 * Add the WordPress Playground page to the Tools menu.
 */
function plugin_menu()
{
	add_submenu_page(
		'tools.php',
		'WordPress Playground',
		'Sandbox Site',
		ADMIN_PAGE_CAPABILITY,
		PLAYGROUND_ADMIN_PAGE_SLUG,
		__NAMESPACE__ . '\render_playground_page',
		NULL
	);

	add_menu_page(
		'WordPress Playground Redirect',
		'Sandbox Site (experimental)',
		ADMIN_PAGE_CAPABILITY,
		PLAYGROUND_ADMIN_PAGE_SLUG . '_redirect',
		__NAMESPACE__ . '\redirect_playground_page',
		NULL
	);
}

/**
 * Redirect to the WordPress Playground page.
 */
function redirect_playground_page()
{
	$target = admin_url('tools.php?page=' . PLAYGROUND_ADMIN_PAGE_SLUG);
	echo "<script>window.location = '$target';</script>";
	exit;
}

/**
 * Render the WordPress Playground page.
 */
function render_playground_page()
{
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if (isset($_GET['download'])) {
		return;
	}
	include __DIR__ . '/templates/playground-page.php';
}

/**
 * Add a "Preview Now" button to the plugin install screen.
 *
 * @param array $action_links An array of plugin action links.
 * @param array $plugin The plugin data.
 * @return array The modified array of plugin action links.
 */
function plugin_install_action_links($action_links, $plugin)
{
	$preview_url = add_query_arg(
		[
			'pluginSlug' => esc_attr($plugin['slug']),
		],
		admin_url('tools.php?page=' . PLAYGROUND_ADMIN_PAGE_SLUG)
	);

	$preview_button = sprintf(
		'<a class="preview-now button" data-slug="%s" href="%s" aria-label="%s" data-name="%s">%s</a>',
		esc_attr($plugin['slug']),
		$preview_url,
		esc_attr(
			sprintf(
				/* translators: %s: Plugin name. */
				__('Preview %s now', 'playground'),
				$plugin['name']
			)
		),
		esc_attr($plugin['name']),
		__('Preview in Sandbox', 'playground')
	);

	array_unshift($action_links, $preview_button);

	return $action_links;
}
