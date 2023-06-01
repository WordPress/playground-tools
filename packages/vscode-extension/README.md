# WordPress Playground for VS Code

Run WordPress development server without any dependencies. Yes, you read that right!

This extension bundles [WordPress Playground](https://github.com/WordPress/wordpress-playground), a WebAssembly-based WordPress runtime, and starts a local WordPress development server with a click of a button. That's it! No need to install PHP, MySQL, Apache, or anything else.

## Getting Started

Using the WordPress Playground VS Code Extension is just a few steps:

1. Open VS Code.
2. Search for and install the 'WordPress Playground' extension.
3. In your VS Code Activity Bar, click on the WordPress icon, and then hit the "Start WordPress Server" button.

Et voilà! WordPress is now running in your default browser with whatever project you currently have open.

### Automatic Modes

The WordPress Playground VS Code Extension automatically operates in a few different modes. The selected mode depends on the project directory in which it is executed:

-   **plugin**, **theme**, or **wp-content**: Loads the project files into a virtual filesytem with WordPress and a SQLite-based database. Everything (including WordPress core files, the database, `wp-config.php`, etc.) is stored in the user's home directory and loaded into the virtual filesystem. Here are the heuristics for each mode:
    -   **plugin** mode: Presence of a PHP file with 'Plugin Name:' in its contents.
    -   **theme** mode: Presence of a `style.css` file with 'Theme Name:' in its contents.
    -   **wp-content** mode: Presence of `plugins` or `themes` subdirectories in the immediate directory, or within a `wp-content` subdirectory.
-   **wordpress**: Runs the directory as a WordPress installation when WordPress files are detected. An existing `wp-config.php` file will be used if it exists; if it doesn't exist, it will be created along with a SQLite database.
-   **wordpress-develop**: Same as `wordpress` mode, except the `build` directory is served as the web root.
-   **index**: When an `index.php` file is present, starts a PHP webserver in the working directory and simply passes requests to the `index.php`.
-   **playground**: If no other conditions are matched, launches a completely virtualized WordPress site.

## Known Issues

-   The extension has only been tested on macOS. It may not work on Windows.
-   The extension currently only takes into account plugins, not themes.
-   The extension currently expects that the command is run while within a file in the root directory of the plugin. A WordPress playground will still be created and mounted, but the plugin will not be functional if the command is run from an unintended directory.
-   Some requests may not succeed. This is likely due to the fact that we have a minimally implemented server translation layer.

## Contributing

We welcome contributions from the community!

In order to contribute to the WordPress Playground VS Code Extension, you'll need to have Node.js version 16 or greater installed on your system.

Once you have Node installed, you can start using the repo:

```bash
git clone git@github.com:WordPress/playground-tools.git
cd playground-tools
npm install
```

After the repo is configured, head back to your VS Code Editor:

1. Enable the Activity Bar, if it isn't enabled already, under View -> Appearance.
2. Within the Activity Bar, enable 'Run and Debug if it isn't enabled already.

<img width="856" alt="Run and Debug in the Activity Bar" src="https://github.com/WordPress/playground-tools/assets/36432/81c230d9-ff42-461d-880e-53093319f163">

'Run and Debug' is where the magic happens. First, feel free to make whatever changes to `packages/vscode-extension`. Then go to the Debug tab in your VS Code and run the "Debug Playground for VS Code" configuration. It will build the extension and start a new VS Code window with your changes reflected. The WordPress Playground VS Code Extension will appear as a new item in your Activity Bar.

<img width="1290" alt="WordPress Playground VS Code Extension in the Activity Bar" src="https://github.com/WordPress/playground-tools/assets/36432/1f88edb9-ebf7-43c2-87d1-c438c6d6176b">

Any time you make change to the the code, click the reload button at the top of your editor to apply the changes:

<img width="630" alt="Reload button at the top of the editor" src="https://github.com/WordPress/playground-tools/assets/36432/3b9b512c-9b1e-4cb6-b36b-97cff4b2a8df">

[vscode-webview-ui-toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/docs/getting-started.md) is used for UI.

## Debugging

1. Follow the three steps above.
2. Open the "Debug Console" tab in the original VS Code window for errors and console.log() outputs.
3. Run the `Developer: Toggle Developer Tools` command in the child window to debug UI elements and WebView errors.

## Publishing

The WordPress Playground VS Code Extension is published independently of the other projects in this repository. However, to ensure they're using the same codebase, a new version of `wp-now` should be released prior to publishing the VS Code Extension.

[@adamziel](https://github.com/adamziel) and [@danielbachhuber](https://github.com/danielbachhuber/) have permissions to publish. The extension is managed in the [VS Code extension marketplace](https://marketplace.visualstudio.com/manage/publishers/wordpressplayground).

Publish a new version by following these steps:

1. Generate a Personal Access Token on https://dev.azure.com/wordpress-playground/_usersSettings/tokens
2. Login with `vsce login WordPressPlayground` and the token you generated
3. Build and publish the extension with `nx publish vscode-extension`.

Once you've published the extension, please install it and verify the new version launches a WordPress server as expected.

## Release Notes

### 0.0.17

-   Restore this README.md file.
-   Add the ability to switch between WordPress and PHP versions.

### 0.0.16

-   Rewrite the extension to use the new WordPress Playground API.
-   Add a UI sidebar.

### 0.0.2

Hopefully fix the bug.

### 0.0.1

Initial release of WordPress Playground for VS Code.
