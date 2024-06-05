<?php
/**
 * Plugin Name: My First Block
 */
function register_my_first_block() {
	register_block_type( __DIR__ );
}
add_action( 'init', 'register_my_first_block' );
