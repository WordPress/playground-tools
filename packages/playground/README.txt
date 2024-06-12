=== Sandbox Site powered by Playground ===
Contributors: wordpressdotorg, antoniosejas, berislavgrgicak, zieladam
Tags: playground, staging, sandbox
Requires at least: 6.0
Tested up to: 6.6
Stable tag: 0.1.8
Requires PHP: 7.4
License: GPLv2
License URI: https://www.gnu.org/licenses/gpl-2.0.html

= Short description =

Enables running a sandbox of your site using WordPress Playground (https://github.com/WordPress/wordpress-playground)

== Description ==

With this plugin, you can:

* Create a copy of your site in a private WordPress Playground instance.
* Test plugins from the WordPress plugin directory without actually installing them on your site.

Your site is cloned in Playground by copying all the files and a database into WordPress Playground. It may sound scary, but your data stays safely with you and is **not** uploaded to any cloud service. Instead, your site's data is shipped directly to your web browser where it stays only as long as you keep your browser tab open. That’s right! WordPress Playground runs a copy of your site directly on your device.

== Usage ==

= Starting a sandbox =

- Open `/wp-admin/` on your site
- Click on _Sandbox Site_ in the _Tools_ menu to load WordPress Playground with a copy of your site content

= Testing a plugin =

- Open `/wp-admin/` on your site
- Click on _Add Plugins_ in the _Plugins_ menu
- Find a plugin you want to test
- Click the _Preview Now_ button
- The plugin will be installed and activated in WordPress Playground with a copy of your site content

== All features ==

- Start a sandbox of your site
- Preview a plugin installation from the WordPress.org repository
- Export Playground snapshots using Tools > Export

== Resources ==

- [Source code](https://github.com/WordPress/playground-tools/tree/trunk/packages/playground)
- [WordPress Playground](https://developer.wordpress.org/playground)
- [WordPress Playground repository](https://wordpress.github.io/wordpress-playground/)

== Support ==

For any issues or questions about the WordPress Playground plugin, please open a GitHub issue in the [playground-tools](https://github.com/WordPress/playground-tools) repository.

**This is an early preview to gather feedback and apply polish. This plugin isn't yet a well-rounded and feature-complete solution.**

== License ==

The WordPress Playground Plugin is licensed under the GNU General Public License v2.0. This is a free software license that allows you to use, modify, and distribute the software, provided you adhere to its terms and conditions.

== Changelog ==

= 0.1.0 =
* Add export support and error handling.

= 0.0.5 =
* Initial release.
