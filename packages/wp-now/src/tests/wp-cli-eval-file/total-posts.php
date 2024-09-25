<?php
function count_all_published_posts() {
    $count_posts = wp_count_posts();
    $published_posts = $count_posts->publish;
    return $published_posts;
}

$published_post_count = count_all_published_posts();
echo 'Total published posts: ' . $published_post_count;
?>
