<?php
/**
 * Plugin Name:       WordPress Playground Block
 * Description:       WordPress Playground as a Gutenberg block.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.2.6
 * Author:            Dawid Urbański, Adam Zieliński
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wordpress-playground-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

function playground_demo_block_init()
{
	$style_css = 'build/style-index.css';
	wp_register_style(
		'playground-block-style',
		plugins_url($style_css, __FILE__),
		array(
			'wp-components'
		),
		filemtime(plugin_dir_path(__FILE__) . $style_css)
	);

	register_block_type(
		__DIR__ . '/build',
		array(
			'style' => 'playground-block-style',
		)
	);
}
add_action( 'init', 'playground_demo_block_init' );
