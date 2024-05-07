<?php
/**
 * Plugin Name:       WordPress Playground Block
 * Description:       WordPress Playground as a Gutenberg block.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.2.3
 * Author:            Dawid Urbański, Adam Zieliński
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wordpress-playground-block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

function playground_demo_block_init() {
	register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'playground_demo_block_init' );

// Allow uploading Playground ZIP snapshots
add_filter('upload_mimes', 'custom_upload_mimes');
function custom_upload_mimes ( $existing_mimes=array() ) {
    $existing_mimes['zip'] = 'application/zip';
    return $existing_mimes;
}
