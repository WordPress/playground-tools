<?php

namespace WordPress\Playground;

defined('ABSPATH') || exit;

const EXPORT_SLUG = 'playground-snapshot';

add_action('export_filters',  __NAMESPACE__ . '\add_playground_snapshot_filters');
add_action('export_wp', __NAMESPACE__ . '\export_playground_snapshot');

/**
 * Add an export filter for the Playground snapshot.
 *
 * @return void
 */
function add_playground_snapshot_filters()
{
?>
    <p>
        <label for="<?php echo esc_attr(EXPORT_SLUG); ?>">
            <input type="radio" value="<?php echo esc_attr(EXPORT_SLUG); ?>" name="content" id="<?php echo esc_attr(EXPORT_SLUG); ?>" />
            <?php _e('Playground snapshot', 'playground'); ?>
        </label>
    </p>
<?php
}

/**
 * Download the Playground snapshot if requested.
 *
 * @param array $args
 * @return void
 */
function export_playground_snapshot($args)
{
    if (!isset($args['content'])) {
        return;
    }

    if ($args['content'] !== EXPORT_SLUG) {
        return;
    }

    download_snapshot();
    wp_die();
}
