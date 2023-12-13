# WordPress ES Modules Plugin

This plugin exposes WordPress scripts like `@wordpress/block-editor` as ES modules
to enable building Guteneberg blocks without any transpilation.

With this plugin in place, we can:

1. Put a code editor on a website
2. Prepopulate it with an ES6 block using imports
3. Enable the user to update the code in the editor
4. Render the block in a WordPress Playground instance with this plugin installed

Notably, this is a proof-of-concept, only intended for use in WordPress Playground.
