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

/**
 * Render the Playground block as a full, dedicated page
 */
function playground_demo_render_full_page_block() {
	wp_head();
	$block = array(
		'blockName' => 'wordpress-playground/playground',
		'attrs' => playground_demo_parse_full_page_block_attrs( $_GET ),
		'innerBlocks' => array(),
		'innerHTML' => '',
		'innerContent' => array(),
	);
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo render_block( $block );
	wp_footer();
	die();
}

if ( isset( $_GET['playground-full-page'] ) ) {
	add_action( 'init', 'playground_demo_render_full_page_block', 9999 );
}

/**
 * Convert the query params to block attributes.
 *
 * @param array $query An associative array of query params.
 *
 * @return array An associative array of block attributes.
 */
function playground_demo_parse_full_page_block_attrs( $query ) {
	$attrs = array(
		'align' => 'wide',
		'inFullPageView' => true,
		'codeEditor' => isset( $query['code-editor'] ) && '1' === $query['code-editor'],
		'codeEditorErrorLog' =>
			isset( $query['error-log-included'] ) && '1' === $query['error-log-included'],
		'codeEditorReadOnly' => isset( $query['read-only'] ) && '1' === $query['read-only'],
		'codeEditorSideBySide' => isset( $query['side-by-side'] ) && '0' !== $query['side-by-side'],
		'codeEditorTranspileJsx' =>
			isset( $query['transpile-jsx'] ) && '1' === $query['transpile-jsx'],
		'requireLivePreviewActivation' =>
			isset( $query['require-preview-activation'] ) &&
			'0' !== $query['require-preview-activation'],
	);

	if ( isset( $query['blueprint-url'] ) ) {
		$attrs['blueprintUrl'] = $query['blueprint-url'];
	} elseif ( isset( $query['blueprint-json'] ) ) {
		$attrs['blueprint'] = $query['blueprint-json'];
	} else {
		$constants = (object) array(
			'WP_DEBUG' => true,
			'WP_SCRIPT_DEBUG' => true,
		);

		if (
			isset( $query['blueprint-constant-WP_DEBUG'] ) &&
			'0' === $query['blueprint-constant-WP_DEBUG']
		) {
			// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
			$constants->WP_DEBUG = false;
		}

		if (
			isset( $query['blueprint-constant-WP_SCRIPT_DEBUG'] ) &&
			'0' === $query['blueprint-constant-WP_SCRIPT_DEBUG']
		) {
			// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
			$constants->WP_SCRIPT_DEBUG = false;
		}

		$attrs = array_merge(
			$attrs,
			array(
				'constants' => $constants,
				'logInUser' =>
					isset( $query['blueprint-auto-login'] ) &&
					'0' !== $query['blueprint-auto-login'],
			)
		);

		if ( isset( $query['blueprint-landing-page'] ) ) {
			$attrs['landingPageUrl'] = $query['blueprint-landing-page'];
		}

		if (
			isset(
				$query['blueprint-create-post'],
				$query['blueprint-create-post-type'],
			) &&
			'1' === $query['blueprint-create-post'] &&
			in_array(
				$query['blueprint-create-post-type'],
				array( 'post', 'page' ),
				true,
			)
		) {
			$attrs['createNewPost'] = true;
			$attrs['createNewPostType'] = $query['blueprint-create-post-type'];

			if ( isset( $query['blueprint-create-post-title'] ) ) {
				$attrs['createNewPostTitle'] = $query['blueprint-create-post-title'];
			}
			if ( isset( $query['blueprint-create-post-content'] ) ) {
				$attrs['createNewPostContent'] = $query['blueprint-create-post-content'];
			}
			if ( isset( $query['blueprint-create-post-redirect'] ) ) {
				$attrs['redirectToPost'] = true;
				if (
					isset( $query['blueprint-create-post-redirect-target'] ) &&
					in_array(
						$query['blueprint-create-post-redirect-target'],
						array( 'front', 'editor' )
					)
				) {
					$attrs['redirectToPostType'] = $query['blueprint-create-post-redirect-target'];
				}
			}
		}
	}

	if ( isset( $query['files'] ) ) {
		$files = json_decode( base64_decode( $query['files'] ) );
		if ( playground_demo_files_structure_is_valid( $files ) ) {
			$attrs['files'] = $files;
		}
	}

	$attrs['files'] = $files;

	return $attrs;
}

/**
 * Check if a given files structure is valid.
 *
 * @param mixed $files The files structure to examine.
 *
 * @return boolean Whether or not the files structure appears to be valid.
 */
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
			// phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
			isset( $file->remoteUrl ) && gettype( $file->remoteUrl ) !== 'string'
		) {
			return false;
		}
	}

	return true;
}