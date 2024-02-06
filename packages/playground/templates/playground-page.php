<?php

defined('ABSPATH') || exit;

?>
<div id="wp-playground-wrapper">
    <div id="wp-playground-toolbar">
        <span>
            <?php
            printf(
                __(
                    'WordPress Playground preview for %s',
                    TRANSLATE_DOMAIN
                ),
                get_bloginfo('name')
            );
            ?>
        </span>
        <a href="<?php echo admin_url('plugin-install.php'); ?>" id="goBack">
            <?php _e('Go Back', TRANSLATE_DOMAIN); ?>
        </a>
    </div>
    <div id="wp-playground-main-area">
        <iframe id="wp-playground"></iframe>
    </div>
</div>