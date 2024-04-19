<?php

namespace WordPress\Playground;

defined('ABSPATH') || exit;
?>
<div id="wp-playground-wrapper">
    <div id="wp-playground-toolbar">
        <p>
            <?php
            echo esc_attr(
                sprintf(
                    // translators: %s: Site name.
                    __(
                        'WordPress Playground preview of %s',
                        'playground'
                    ),
                    get_bloginfo('name')
                )
            );
            ?>
        </p>
        <a href="<?php echo esc_url(admin_url()); ?>" id="goBack" class="button">
            <?php esc_attr_e('Back', 'playground'); ?>
        </a>
    </div>
    <div id="wp-playground-main-area">
        <iframe credentialless id="wp-playground" title="<?php _e('WordPress Playground Sandbox', 'playground'); ?>"></iframe>
    </div>
</div>