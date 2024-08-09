<?php
/**
 * Plugin Name:       WordPress Playground Block
 * Description:       WordPress Playground as a Gutenberg block.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.2.14
 * Author:            Dawid Urbański, Adam Zieliński
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       interactive-code-block
 *
 * @package WordPress/playground-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Enqueue block editor assets.
 *
 * @return void
 */
function playground_demo_block_init() {
	$style_css = 'build/style-index.css';
	wp_register_style(
		'playground-block-style',
		plugins_url( $style_css, __FILE__ ),
		array(
			'wp-components',
		),
		filemtime( plugin_dir_path( __FILE__ ) . $style_css )
	);

	register_block_type(
		__DIR__ . '/build',
		array(
			'style' => 'playground-block-style',
		)
	);
}
add_action( 'init', 'playground_demo_block_init' );

/**
 * Conditionally render the Playground block as a full, dedicated page.
 */
function playground_demo_maybe_render_full_page_block() {
	if (
		// Skip nonce verification because full-page Playground block
		// rendering does not require reading or writing server-side state.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		! isset( $_GET['playground-full-page'], $_GET['playground-attributes'] )
	) {
		return;
	}

	wp_head();
	$block = array(
		'blockName'    => 'wordpress-playground/playground',
		'attrs'        => array(),
		'innerBlocks'  => array(),
		'innerHTML'    => '',
		'innerContent' => array(),
	);
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo render_block( $block );
	wp_footer();
	die();
}
add_action( 'init', 'playground_demo_maybe_render_full_page_block', 9999 );
