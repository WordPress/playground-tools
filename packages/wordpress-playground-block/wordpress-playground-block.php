<?php
/**
 * Plugin Name:       WordPress Playground Block
 * Description:       WordPress Playground as a Gutenberg block.
 * Requires at least: 6.1
 * Requires PHP:      7.0
 * Version:           0.2.9
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

function playground_demo_render_full_page_block() {
	wp_head();
	$block = array(
		'blockName' => 'wordpress-playground/playground',
		'attrs' => playground_demo_parse_full_page_block_attrs(),
		'innerBlocks' => array (),
		'innerHTML' => '',
		'innerContent' => array (),
	);
	echo render_block( $block );
	wp_footer();
	die();
}

if ( isset( $_GET['playground-full-page'] ) ) {
	add_action( 'init', 'playground_demo_render_full_page_block', 9999 );
}

function playground_demo_parse_full_page_block_attrs( $config = false ) {
	if ( false === $config ) {
		$config = $_GET;
	}

	$attrs = array(
		'align' => 'wide',
		'inFullPageView' => true,
		'codeEditor' => isset( $config['code-editor'] ) && $config['code-editor'] === '1',
		'codeEditorErrorLog' =>
			isset( $config['error-log-included'] ) && $config['error-log-included'] === '1',
		'codeEditorReadOnly' => isset( $config['read-only'] ) && $config['read-only'] === '1',
		'codeEditorSideBySide' => isset( $config['side-by-side'] ) && $config['side-by-side'] !== '0',
		'codeEditorTranspileJsx' =>
			isset( $config['transpile-jsx'] ) && $config['transpile-jsx'] === '1',
		'requireLivePreviewActivation' =>
			isset( $config['require-preview-activation'] ) &&
			$config['require-preview-activation'] !== '0',
	);

	if ( isset( $config['blueprint-url'] ) ) {
		$attrs['blueprintUrl'] = $config['blueprint-url'];
	} elseif ( isset( $config['blueprint-json'] ) ) {
		$attrs['blueprint'] = $config['blueprint-json'];
	} else {
		$constants = (object) array(
			'WP_DEBUG' => true,
			'WP_SCRIPT_DEBUG' => true,
		);

		if (
			isset( $config['blueprint-constant-WP_DEBUG'] ) &&
			$config['blueprint-constant-WP_DEBUG'] === '0'
		) {
			$constants->WP_DEBUG = false;
		}

		if (
			isset( $config['blueprint-constant-WP_SCRIPT_DEBUG'] ) &&
			$config['blueprint-constant-WP_SCRIPT_DEBUG'] === '0'
		) {
			$constants->WP_SCRIPT_DEBUG = false;
		}

		$attrs = array_merge(
			$attrs,
			array(
				'constants' => $constants,
				'logInUser' =>
					isset( $config['blueprint-auto-login' ] ) &&
					$config['blueprint-auto-login'] !== '0',
			)
		);

		if ( isset( $config['blueprint-landing-page'] ) ) {
			$attrs['landingPageUrl'] = $config['blueprint-landing-page'];
		}

		if (
			isset(
				$config['blueprint-create-post'],
				$config['blueprint-create-post-type'],
			) &&
			$config['blueprint-create-post'] === '1' &&
			in_array(
				$config['blueprint-create-post-type'],
				array( 'post', 'page' ),
				true,
			)
		) {
			$attrs['createNewPost'] = true;
			$attrs['createNewPostType'] = $config['blueprint-create-post-type'];

			if ( isset( $config['blueprint-create-post-title' ] ) ) {
				$attrs['createNewPostTitle'] = $config['blueprint-create-post-title'];
			}
			if ( isset( $config['blueprint-create-post-content'] ) ) {
				$attrs['createNewPostContent'] = $config['blueprint-create-post-content'];
			}
			if ( isset( $config['blueprint-create-post-redirect'] ) ) {
				$attrs['redirectToPost'] = true;
				if (
					isset( $config['blueprint-create-post-redirect-target'] ) &&
					in_array(
						$config['blueprint-create-post-redirect-target'],
						array( 'front', 'editor' )
					)
				) {
					$attrs['redirectToPostType'] = $config['blueprint-create-post-redirect-target'];
				}
			}
		}
	}

	if ( isset( $config['files'] ) ) {
		$files = json_decode( base64_decode( $config['files'] ) );
		if ( playground_demo_files_structure_is_valid( $files ) ) {
			$attrs['files'] = $files;
		}
	}

	$attrs['files'] = $files;

	return $attrs;
}

function playground_demo_files_structure_is_valid( $files ) {
	if ( ! is_array( $files ) ) {
		return false;
	}

	foreach ( $files as $file ) {
		if ( ! is_object( $file ) ) {
			return false;
		}

		if ( ! isset( $file->name, $file->contents ) ) {
			return false;
		}

		if (
			gettype( $file->name ) !== 'string' ||
			gettype( $file->contents ) !== 'string'
		) {
			return false;
		}

		if (
			isset( $file->remoteUrl ) &&
			gettype( $file->remoteUrl ) !== 'string'
		) {
			return false;
		}
	}

	return true;
}