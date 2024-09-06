# WordPress Playground Block

`wordpress-playground-block` is a Gutenberg block that embeds WordPress Playground on your site.

![CleanShot 2023-11-19 at 16 20 53](https://github.com/WordPress/playground-tools/assets/12466568/f10695cf-fc71-4954-ba91-291ef36c1386)

## Table of Contents

-   [About the block](#about-the-block)
-   [All features](#all-features)
-   [Installation](#installation)
-   [Contributing](#contributing)
-   [Publishing](#publishing)
-   [Testing](#testing)
-   [Caveats](#caveats)
-   [Notes](#notes)

## About the block

With this highly customizable block, users can embed WordPress Playground within their posts or pages content.

![CleanShot 2023-11-19 at 16 27 16](https://github.com/WordPress/playground-tools/assets/12466568/ebbc1d01-86db-4e17-a111-2aaf6fc09ea7)

Possibility of adding files to the Playground instance from the code editor make this the easiest way of integrating Playground with your WordPress website.

![CleanShot 2023-11-21 at 10 14 24](https://github.com/WordPress/playground-tools/assets/12466568/f2ff13e3-392a-4de9-aaf3-45f077abc42c)

The code editor can be editable for users on the front-end so it may serve a role of interactive tutorial/guide.

![CleanShot 2023-11-21 at 10 17 31](https://github.com/WordPress/playground-tools/assets/12466568/2702bcca-455c-43c7-8abd-4de8001e8310)

## All features

-   Embed WordPress Playground
-   Log in automatically
-   Specify landing page
-   Create new post or page
-   Redirect to newly created post or page
-   Specify blueprint to apply on init (WIP)
-   Enable/disable code editor
-   Make code editor read-only
-   Allow multiple files in code editor
-   Specify mode:
    -   Plugin: add all files to a plugin and enable it in Playground
    -   Editor script: add script inline via `wp_add_inline_script`

## Installation

You can download the latest version of the plugin from the [releases page on GitHub](https://github.com/WordPress/playground-tools/releases).

If you want to install the plugin from source, see the [contributing](#contributing) section below for repo setup instructions. Once you have the repo set up, you can build the plugin by running the following command in the repo root:

```bash
npx nx build wordpress-playground-block
```

This will create a `wordpress-playground-block.zip` file in the `dist/wordpress-playground-block` directory. You can then install the plugin by uploading this zip file to your WordPress site.

## Contributing

We welcome contributions from the community!

In order to contribute to `wordpress-playground-block`, you'll need to first install a few global dependencies:

-   Make sure you have `nvm` installed. If you need to install it first,
    [follow these installation instructions](https://github.com/nvm-sh/nvm#installation).
-   Install wp-now globally to power the local development environment by running `npm install -g @wp-now/wp-now`    
-   Install `nx` by running `npm install -g nx`.

Once the global dependencies are installed, you can start using the repo:

```bash
git clone git@github.com:WordPress/playground-tools.git
cd playground-tools
nvm use
npm install
nx dev wordpress-playground-block
```

This will start:

-   A webpack development server for the `wordpress-playground-block` package
-   A new WordPress site with the `wordpress-playground-block` plugin activated

You can now visit the site in your browser to test the plugin.

## Testing

There are no automated unit tests for the `wordpress-playground-block` package yet. If you'd like to add some, please do!

## Publishing

The `wordpress-playground-block` package is part of a larger monorepo, sharing its space with other sibling packages. Even though it has a package.json file, it doesn't actually get published to NPM. Instead, it is a WordPress plugin that is published to the WordPress.org plugin repository.

To publish a new version of `wordpress-playground-block`, you'll need to have:

-   A local working copy of the SVN repo at http://plugins.svn.wordpress.org/interactive-code-block
-   A WordPress.org account with the appropriate permissions.

With those in place, the publishing process looks as follows:

1. Bump the version number in `wordpress-playground-block.php` in the SVN repo
2. Build the WordPress Playgorund block by running `npx nx build wordpress-playground-block` in the **git repo root**
3. Bump the stable tag in `trunk/README.txt` in the SVN repo
4. Copy the built files from `dist/packages/wordpress-playground-block` to the SVN repo's `tags/{new version}` directory.
5. Copy the built files from `dist/packages/wordpress-playground-block` to the SVN repo's `trunk` directory. Yes, there latest version should live both in `tags` and `trunk`.
6. Commit the SVN changes

## Caveats

-   This only works on sites with https (even locally) - Playground limitation
-   It's not going to work inside Playground itself - Unable to connect to playground remote, I didn't check with wp-now, it could work there but probably also going to fail because of lack of https
-   The block has to use `"apiVersion": 2` to prevent wrapping in iframe - it won't work inside another iframe for now - again Playground limitation
-   No build steps available (we are thinking about adding support for node in browser in the future)

## Notes

-   Blueprints support not yet implemented (but the control is added in `Edit` component),
-   This is just POC. `PlaygroundDemo.tsx` definitely requires some work (to split it into multiple components),
-   No internationalization in place,
-   We may change the refreshing behaviour in `InspectorControls` input fields from `onChange` to `onBlur` to prevent so many Playground inits,
-   Files management is a bit primitive for now, no folders or subfolders allowed yet,
-   Currently supported editor languages: JavaScript, JSON, PHP,
-   We may add option for dark theme in the code editor.
