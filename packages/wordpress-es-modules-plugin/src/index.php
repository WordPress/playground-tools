<?php
/**
 * Plugin Name: Playground ES Modules Support
 * Version: 0.0.1
 */

// Here's what a developer would do in the code editor.
// Comment this out when you're develop the wordpress-es-modules-plugin:
add_action('init', function () {
    wp_register_script('my-es-module', plugins_url('test-es-module.js', __FILE__), [
        '@wordpress/block-library',
        '@wordpress/element',
    ]);
    wp_enqueue_script('my-es-module');
});

// And here's the actual code for wordpress-es-modules-plugin:
// -----------

/**
 * Wire everything together.
 */
add_action('init', function () {
    // Bale out on the wordpress-es-modules wp admin page
    if (isset($_GET['page']) && $_GET['page'] === 'wordpress-es-modules') {
        return;
    }

    global $script_to_js_global;
    // Register a fake script that will be used to load the import map
    // @see render_import_map
    wp_register_script('esmodules-import-map', plugins_url('bogus-empty-script.js', __FILE__));

    foreach ($script_to_js_global as $script_name => $global_name) {
        // Register fake ES module scripts that just point to a bogus JS
        // file. They only exist to trigger WordPress script dependency
        // resolution.
        $module_name = str_replace('wp-', '@wordpress/', $script_name);
        wp_register_script(
            $module_name,
            plugins_url('bogus-empty-script.js', __FILE__),
            [$script_name]
        );

        // Make sure all WordPress core scripts depend on the import map
        if (isset(wp_scripts()->registered[$script_name])) {
            wp_scripts()->registered[$script_name]->deps[] = 'esmodules-import-map';
        }
    }
});

/**
 * Maps core script handles to the global variable that they export
 * via `window.wp`.
 * 
 * For example, `wp-blob` exports `window.wp.blob`.
 */
$script_to_js_global = [
    'wp-admin-manifest' => 'adminManifest',
    'wp-a11y' => 'a11y',
    'wp-annotations' => 'annotations',
    'wp-api-fetch' => 'apiFetch',
    'wp-autop' => 'autop',
    'wp-base-styles' => 'baseStyles',
    'wp-blob' => 'blob',
    'wp-custom-templated-path-webpack-plugin' => 'customTemplatedPathWebpackPlugin',
    'wp-block-directory' => 'blockBirectory',
    'wp-edit-navigation' => 'edit-navigation',
    'wp-block-editor' => 'blockEditor',
    'wp-block-library' => 'blockLibrary',
    'wp-block-serialization-default-parser' => 'blockSerializationDefaultParser',
    'wp-block-serialization-spec-parser' => 'blockSerializationSpecParser',
    'wp-blocks' => 'blocks',
    'wp-browserslist-config' => 'browserslistConfig',
    'wp-commands' => 'commands',
    'wp-components' => 'components',
    'wp-compose' => 'compose',
    'wp-core-commands' => 'core-commands',
    'wp-core-data' => 'coreData',
    'wp-create-block-interactive-template' => 'createBlockInteractiveTemplate',
    'wp-create-block-tutorial-template' => 'createBlockTutorialTemplate',
    'wp-create-block' => 'create-block',
    'wp-customize-widgets' => 'customizeWidgets',
    'wp-data-controls' => 'dataControls',
    'wp-experiments' => 'experiments',
    'wp-data' => 'data',
    'wp-dataviews' => 'dataviews',
    'wp-date' => 'date',
    'wp-dependency-extraction-webpack-plugin' => 'dependencyExtractionWebpack-plugin',
    'wp-deprecated' => 'deprecated',
    'wp-docgen' => 'docgen',
    'wp-dom-ready' => 'domReady',
    'wp-dom' => 'dom',
    'wp-edit-post' => 'editPost',
    'wp-edit-site' => 'editSite',
    'wp-edit-widgets' => 'editWidgets',
    'wp-editor' => 'blockEditor',
    'wp-library-export-default-webpack-plugin' => 'libraryExportDefaultWebpackPlugin',
    'wp-element' => 'element',
    'wp-escape-html' => 'escapeHtml',
    'wp-eslint-plugin' => 'eslintPlugin',
    'wp-format-library' => 'formatLibrary',
    'wp-hooks' => 'hooks',
    'wp-html-entities' => 'htmlEntities',
    'wp-i18n' => 'i18n',
    'wp-icons' => 'icons',
    'wp-interactivity' => 'interactivity',
    'wp-interface' => 'interface',
    'wp-is-shallow-equal' => 'isShallowEqual',
    'wp-keyboard-shortcuts' => 'keyboardShortcuts',
    'wp-keycodes' => 'keycodes',
    'wp-lazy-import' => 'lazyImport',
    'wp-list-reusable-blocks' => 'listReusableBlocks',
    'wp-media-utils' => 'mediaUtils',
    'wp-notices' => 'notices',
    'wp-nux' => 'nux',
    'wp-patterns' => 'patterns',
    'wp-plugins' => 'plugins',
    'wp-postcss-plugins-preset' => 'postcssPluginsPreset',
    'wp-postcss-themes' => 'postcssThemes',
    'wp-preferences-persistence' => 'preferencesPersistence',
    'wp-preferences' => 'preferences',
    'wp-prettier-config' => 'prettierConfig',
    'wp-primitives' => 'primitives',
    'wp-priority-queue' => 'priorityQueue',
    'wp-private-apis' => 'privateApis',
    'wp-project-management-automation' => 'projectManagementAutomation',
    'wp-react-i18n' => 'reactI18n',
    'wp-redux-routine' => 'reduxRoutine',
    'wp-reusable-blocks' => 'reusableBlocks',
    'wp-rich-text' => 'richText',
    'wp-router' => 'router',
    'wp-scripts' => 'scripts',
    'wp-server-side-render' => 'serverSideRender',
    'wp-shortcode' => 'shortcode',
    'wp-style-engine' => 'styleEngine',
    'wp-stylelint-config' => 'stylelintConfig',
    'wp-sync' => 'sync',
    'wp-token-list' => 'tokenList',
    'wp-undo-manager' => 'undoManager',
    'wp-url' => 'url',
    'wp-viewport' => 'viewport',
    'wp-warning' => 'warning',
    'wp-widgets' => 'widgets',
    'wp-wordcount' => 'wordcount',
];

/**
 * Adds a custom wp-admin page to create the ES module files.
 * 
 * For documentation, go to:
 * @see wordpress_es_modules_admin_page
 */
function admin_menu()
{
    add_menu_page(
        'WordPress ES Modules',
        'WordPress ES Modules',
        'manage_options',
        'wordpress-es-modules',
        'wordpress_es_modules_admin_page',
        'dashicons-admin-generic',
        6
    );
}
// Uncomment to develop this plugin:
// add_action('admin_menu', 'admin_menu');

/**
 * This admin page loads the requested WordPress scripts, grabs their
 * exports, and creates the ES module files via a REST API request.
 * 
 * For example, the `wp-autop` script appends two variables to window.wp.autop:
 * `autop` and `removep`.
 * 
 * We iterate over that here, and create the following ES module file:
 * 
 * export const autop = window.wp.autop.autop;
 * export const removep = window.wp.autop.removep;
 * 
 * @see wordpress_es_modules_rest_api_modules
 * 
 * @return void
 */
function wordpress_es_modules_admin_page()
{
    global $script_to_js_global;
    $requested_script_names = array_filter(
        $_GET['scripts'] ?? array('wp-block-editor', 'wp-block-library'),
        function ($script) use ($script_to_js_global) {
            return array_key_exists($script, $script_to_js_global);
        }
    );

    // Compute the entire dependency tree for the requested scripts
    $resolved_script_names = [];
    $deps = $requested_script_names;
    while ($deps) {
        $dep = array_pop($deps);
        if (!array_key_exists($dep, wp_scripts()->registered)) {
            continue;
        }
        // Only compute dependencies for WordPress scripts that can be modularized
        if (!array_key_exists($dep, $script_to_js_global)) {
            continue;
        }
        $resolved_script_names[] = $dep;
        array_push(
            $deps,
            ...wp_scripts()->registered[$dep]->deps
        );
    }
    $resolved_script_names = array_values(array_unique(array_reverse($resolved_script_names)));
    $scripts_for_js = [];
    // Enqueue all the scripts
    foreach ($resolved_script_names as $script_name) {
        wp_enqueue_script($script_name);
        $scripts_for_js[] = [$script_name, $script_to_js_global[$script_name]];
    }

    // We need to load the wp-api-fetch script to make the API call
    wp_enqueue_script('wp-api-fetch');
    $js_scripts = json_encode($scripts_for_js);

    // Enqueue an inline script
    $last_script = end($requested_script_names) ?? 'wp-api-fetch';
    wp_add_inline_script($last_script, <<<SCRIPT
    const modularizeScripts = $js_scripts;
    const modules = {};
    for(const [scriptName, globalName] of modularizeScripts) {
        const moduleName = scriptName.replace("wp-", "@wordpress/");
        if(!window.wp[globalName]) {
            console.log("Skipping", scriptName, globalName);
            continue;
        }
        const moduleSource = Object.keys(window.wp[globalName]).map(exportName => 
            `export const \${exportName} = window.wp.\${globalName}.\${exportName};`
        );

        modules[scriptName] = moduleSource.join("\\n");
    }

    console.log("Running api fetch", modules);
    window.wp.apiFetch({
        path: "/wordpress-es-modules/v1/modules",
        method: "POST",
        body: JSON.stringify(modules),
    });
SCRIPT
    );
}

/**
 * Registers a REST API endpoint that creates the ES module files.
 */
add_action('rest_api_init', function () {
    // Register a new REST API endpoint that creates a JS file in wp-content
    // that contains the module source code
    register_rest_route('wordpress-es-modules/v1', '/modules', [
        'methods' => 'POST',
        'callback' => 'wordpress_es_modules_rest_api_modules',
        'permission_callback' => '__return_true'
    ]);
});

/**
 * Creates the ES module files in wp-content/plugins/playground-esmodules/js
 */
function wordpress_es_modules_rest_api_modules()
{
    $json_string = file_get_contents('php://input');
    $modules = json_decode($json_string, true);
    foreach ($modules as $module_name => $module_source) {
        $module_path = __DIR__ . '/js/' . $module_name . '.js';
        // @TODO: Handle that in JavaScript as it will be much faster there
        //        ...or will it? I'm testing with the local OPFS sync mode which
        //        is kind of slow. Maybe in MEMFS this will be fast enough?
        if (!file_exists($module_path)) {
            file_put_contents($module_path, $module_source);
        }
    }
    echo json_encode(['success' => true]);
}

/**
 * Renders the import map with all the `@wordpress` scripts.
 * This replaces the script tag for the `esmodules-import-map`
 * script.
 */
function render_import_map($tag, $handle, $src)
{
    if ($handle !== 'esmodules-import-map') {
        return $tag;
    }

    global $script_to_js_global;
    $imports = [];
    foreach ($script_to_js_global as $script_name => $global_name) {
        $module_name = str_replace('wp-', '@wordpress/', $script_name);
        $imports[$module_name] = plugins_url('js/' . $script_name . '.js', __FILE__);
    }
    $imports = apply_filters('wp_esm_import_map', $imports);
    $encoded_import_map = json_encode($imports);
    return <<<SCRIPT
<script type="importmap">
  {
    "imports": $encoded_import_map
  }
</script>
SCRIPT;
}
add_filter('script_loader_tag', 'render_import_map', 10, 3);

// This hook can be removed once Gutenberg exposes add_script_dependency_to_module in
// addition to `gutenberg_enqueue_module` and `gutenberg_register_module`.
// @see https://github.com/WordPress/gutenberg/pull/56143
function add_type_attribute($tag, $handle, $src)
{
    $deps = wp_scripts()->registered[$handle]->deps;
    foreach ($deps as $dep) {
        if (str_starts_with($dep, '@wordpress/')) {
            return '<script type="module" src="' . esc_url($src) . '"></script>';
        }
    }
    return $tag;
}
add_filter('script_loader_tag', 'add_type_attribute', 10, 3);

