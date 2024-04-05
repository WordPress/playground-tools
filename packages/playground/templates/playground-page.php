<?php

namespace WordPress\Playground;

defined('ABSPATH') || exit;
?>
<div id="wp-playground-wrapper">
    <div id="wp-playground-toolbar">
        <span>
            <?php
            echo esc_attr(
                sprintf(
                    // translators: %s: Site name.
                    __(
                        'WordPress Playground preview for %s',
                        'playground'
                    ),
                    get_bloginfo('name')
                )
            );
            ?>
        </span>
        <a href="<?php echo esc_url(admin_url()); ?>" id="goBack">
            <?php esc_attr_e('Go Back', 'playground'); ?>
        </a>
    </div>
    <div id="wp-playground-main-area">
        <iframe credentialless id="wp-playground"></iframe>
    </div>
</div>