# wp-now

`wp-now` streamlines the process of setting up a local WordPress environment.

It uses automatic mode detection to provide a fast setup process, regardless of whether you're working on a plugin or an entire site. You can easily switch between PHP and WordPress versions with a configuration flag. Under the hood, `wp-now` is powered by WordPress Playground and only requires Node.js.

![Demo GIF of wp-now](https://github.com/WordPress/playground-tools/assets/779993/d75cb2fe-c75a-489b-9db5-29258ff7e27f)

## Quickstart

### Launch wp-now in a plugin or theme directory

Running `wp-now` is as simple as accessing your plugin or theme directory and running the following command:

```bash
cd my-plugin-or-theme-directory
npx @wp-now/wp-now start
```

### Launch wp-now in the `wp-content` directory with options

You can also start `wp-now` from any `wp-content` folder. In this example, you pass parameters to change the PHP and WordPress versions and apply a Blueprint file.

```bash
cd my-wordpress-folder/wp-content
npx @wp-now/wp-now start  --wp=6.4 --php=8.0 --blueprint=path/to/blueprint-example.json
```

## Table of Contents

-   [Quickstart](#quickstart)
-   [Requirements](#requirements)
-   [Usage](#usage)
    -   [Automatic modes](#automatic-modes)
    -   [Arguments](#arguments)
-   [Technical details](#technical-details)
-   [Using Blueprints](#using-blueprints)
    -   [Define custom URLs in a Blueprint](#defining-custom-urls)
    -   [Define debugging constants in a Blueprint](#defining-debugging-constants)
-   [Known issues](#known-issues)
-   [Comparisons](#comparisons)
    -   [Laravel Valet](#laravel-valet)
    -   [wp-env](#wp-env)
-   [Contributing](#contributing)
-   [Testing](#testing)
-   [Publishing](#publishing)

## Requirements

The minimum supported version of Node.js is 18. For Blueprint support, install Node 20.

## Usage

<img src="https://raw.githubusercontent.com/WordPress/playground-tools/trunk/assets/wp-now-basics-diagram.png" width="600">

You don't have to install `wp-now`—you can run it with a single [npx](https://docs.npmjs.com/cli/v10/commands/npx) command. That's the recommended way to use `wp-now` and requires no installation or setup:

```bash
npx @wp-now/wp-now start
```

You can also install `@wp-now/wp-now` globally to run it from any directory:

```bash
npm install -g @wp-now/wp-now
```

Lastly, you can install `wp-now` via `git clone`. See [Contributing](#contributing) for more details.

Once installed, start a new server like so:

```bash
cd wordpress-plugin-or-theme
wp-now start
```

Use the `--php=<version>` and `--wp=<version>` arguments to switch to different versions on the fly:

```bash
wp-now start --wp=5.9 --php=7.4
```

In supported modes, `wp-now` creates a persistent SQLite database and `wp-content` directory in `~/.wp-now`.

Use the `--reset` argument to create a new project.

Use `wp-now php <file>` to execute a specific PHP file:

```bash
cd wordpress-plugin-or-theme
wp-now php my-file.php
```

### Automatic modes

`wp-now` operates in a few different modes for both the `start` and the `php` commands. The selected mode depends on the directory in which you execute the command:

-   **plugin**, **theme**, or **wp-content**: Loads the project files into a virtual filesystem with WordPress and a SQLite-based database. Everything (including WordPress core files, the database, `wp-config.php`, etc.) is stored in the user's home directory and loaded into the virtual file system (VFS). `wp-now` uses the latest WordPress version unless you define the `--wp=<version>` argument.

Here are the heuristics for each mode:
    -   **plugin** mode: Presence of a PHP file with "Plugin Name:" in its contents.
    -   **theme** mode: Presence of a `style.css` file with "Theme Name:" in its contents.
    -   **wp-content** mode: Presence of `plugins` and `themes` subdirectories.
-   **wordpress**: Runs the directory as a WordPress installation when WordPress files are detected. If it exists, `wp-now` will use the `wp-config.php` file or create one with a SQLite database.
-   **wordpress-develop**: Same as `wordpress` mode, except the `build` directory is the web root.
-   **index**: When an `index.php` file is present, `wp-now` starts a PHP web server in the working directory and passes requests to the file.
-   **playground**: If no other conditions are matched, `wp-now` launches a virtualized WordPress site.

### Arguments

You can run `wp-now` with the `--help` flag to get an overview of all the available options.

```bash
wp-now --help

# or
wp-now start --help

# or
wp-now php --help 
```

`wp-now start` supports the following optional arguments:

-   `--path=<path>`: The path to the PHP file or WordPress project to use. If not provided, it will use the current working directory.
-   `--php=<version>`: The version of PHP to use. The default version is `8.0`.
-   `--port=<port>`: The port number on which the server will listen. The default port number is `8881`. If it's in use, `wp-now` picks an open port number.
-   `--wp=<version>`: The version of WordPress to use. The default is the [latest WordPress version](https://wordpress.org/download/releases/).
-   `--blueprint=<path>`: The path to a JSON file with the Blueprint steps (requires Node 20). If provided, `wp-now` executes the steps. See [Using Blueprints](#using-blueprints) for more details.
-   `--reset`: Creates a fresh SQLite database and `wp-content` directory for modes that support persistence.

`wp-now php` supports the `--path=<path>` and `--php=<version>` arguments.

## Technical details

`wp-now` stores all relevant files in a hidden directory within your user home directory: `~/.wp-now`.

-   When running in **plugin**, **theme**, **wp-content**, and **playground** modes, the WordPress core files and `wp-content` will be available in `~/.wp-now/wp-content/${projectName}-${directoryHash}`. 'playground' mode shares the same `~/.wp-now/wp-content/playground` directory, regardless of where it runs.
-   For the database setup, `wp-now` uses [SQLite database integration plugin](https://wordpress.org/plugins/sqlite-database-integration/). The path to the database is ` ~/.wp-now/wp-content/${projectName}-${directoryHash}/database/.ht.sqlite`

## Using Blueprints

Blueprints are JSON files that define a list of steps to execute after starting `wp-now`. Blueprints automate the setup of a WordPress site, including defining wp-config constants, installing plugins and themes, and creating content.

Below is an example of a Blueprint that runs the latest versions of WordPress and PHP, installs [bundled PHP extensions](https://wordpress.github.io/wordpress-playground/blueprints-api/data-format#php-extensions), logs the user in as an Administrator, and opens a new post window.

```json
{
    "$schema": "https://playground.wordpress.net/blueprint-schema.json",
    "landingPage": "/wp-admin/post-new.php",
    "preferredVersions": {
        "php": "latest",
        "wp": "latest"
    },
    "phpExtensionBundles": ["kitchen-sink"],
    "steps": [
        {
            "step": "login",
            "username": "admin",
            "password": "password"
        }
    ]
}
```

You can prototype and test your Blueprint in a [dedicated online editor](https://playground.wordpress.net/builder/builder.html).

To run it, create a file named `blueprint-example.json` and run the following command:

```bash
wp-now start --blueprint=path/to/blueprint-example.json
```

### Define custom URLs in a Blueprint

As the building blocks of Playground, Blueprints offer advanced functionality, and we recommend you [learn more about how to use them](https://wordpress.github.io/wordpress-playground/blueprints-api/index) before you get started.

Here's an example of a Blueprint that defines a custom URL constant in `wp-config.php` using [`WP_HOME`](https://developer.wordpress.org/advanced-administration/wordpress/wp-config/#blog-address-url) and [`WP_SITEURL`](https://developer.wordpress.org/advanced-administration/wordpress/wp-config/#wp-siteurl).

Assuming you added `myurl.wpnow` to your `hosts` file, your site will be available at `http://myurl.wpnow`.

Note that the `method` is set to `define-before-run` to avoid modifying the shared `wp-config.php` file. The default method, `rewrite-wp-config`, _modifies_ the `wp-config.php` on the disk.

```json
{
  "steps": [
    {
      "step": "defineWpConfigConsts",
      "consts": {
        "WP_HOME": "http://myurl.wpnow:8881",
        "WP_SITEURL": "http://myurl.wpnow:8881"
      },
      "method": "define-before-run"
    }
  ]
}
```

You can use this instance with [`ngrok`](https://ngrok.com/docs):
1. Run `ngrok http 8881`
2. Copy the URL, and
3. Replace `WP_HOME` and `WP_SITEURL` in the Blueprint file.

You can also define a different port:

```bash
wp-now start --blueprint=path/to/blueprint-example.json --port=80
```

The Blueprint to listen on port `80` would look like this:

```json
{
  "steps": [
    {
      "step": "defineWpConfigConsts",
      "consts": {
        "WP_HOME": "http://myurl.wpnow",
        "WP_SITEURL": "http://myurl.wpnow"
      },
      "method": "define-before-run"
    }
  ]
}
```

### Define debugging constants in a Blueprint

Similarly, you can define [`WP_DEBUG`](https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/) constants and inspect the debug logs.

Here's the example Blueprint:

```json
{
  "steps": [
    {
      "step": "defineWpConfigConsts",
      "consts": {
        "WP_DEBUG": true
      }
    }
  ]
}
```

Because you didn't define a method for `defineWpConfigConsts`, the Blueprint uses the default `rewrite-wp-config` and updates the file stored in `~/.wp-now/wordpress-versions/latest/wp-config.php`.
The next time you execute `wp-now start` in any project, the variable `WP_DEBUG` will be set to true.

If you open `wp-config.php`, you'll see the following lines:

```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
```

You can find the `debug.log` file in the `~/.wp-now/wp-content/${projectName}/` directory.

#### Set a custom path for the `debug.log` file

The `php-wasm` server runs under a VFS where the default `documentRoot` for `wp-now` is always `/var/www/html`. So, a Blueprint executed from a theme named **atlas** would look like this:

```json
{
  "steps": [
    {
      "step": "defineWpConfigConsts",
      "consts": {
        "WP_DEBUG": true,
        "WP_DEBUG_LOG": "/var/www/html/wp-content/themes/atlas/example.log"
      },
      "method": "define-before-run"
    }
  ]
}
```

You can find the `example.log` file in your project's directory.

## Known issues

-   Running `wp-now start` in 'wp-content' or 'wordpress' mode creates empty directories. See [GitHub issue #32](https://github.com/WordPress/playground-tools/issues/32).
-   The `wp-now` NPM package may appear to have a random version number. See [GitHub issue #31](https://github.com/WordPress/playground-tools/issues/31).

## Comparisons

### Laravel Valet

Here's what you need to know if you're migrating from Laravel Valet:

-   `wp-now` handles the entire WordPress installation for you. Just run the `wp-now start` command.
-   `wp-now` works across all desktop platforms (Mac, Linux, Windows).
-   `wp-now` does not set up custom domains for you.
-   `wp-now` works with WordPress themes and plugins even if you don't have WordPress installed (see item #1 above).
-   `wp-now` allows you to switch the WordPress version with `wp-now start --wp=VERSION_NUMBER`(replace `VERSION_NUMBER` with the actual WordPress version).

### wp-env

Here's what you need to know if you're migrating from `wp-env`:

-   `wp-now` supports non-WordPress projects.
-   `wp-now` does not require Docker.
-   `wp-now` does not include Jest for automatic browser testing.

## Contributing

We welcome contributions from the community!

### Code contribution

Clone the repository, install the dependencies, build the project, and start `wp-now` in `preview` mode:

```bash
git clone git@github.com:WordPress/playground-tools.git
cd playground-tools
npm install
npm run build
npx nx preview wp-now start
```

To run the unit tests, use the following command:

```bash
npx nx test wp-now
```
