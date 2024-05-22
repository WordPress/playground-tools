# Publishing

The `wp-now` package is part of a larger [monorepo](https://github.com/WordPress/playground-tools), sharing its space with other sibling packages.

To publish the `wp-now` package to [npm](https://www.npmjs.com/package/@wp-now/wp-now), you must first understand the automated release process facilitated by lerna.

> [!TIP]
> For more information on Lerna and other tools used in Playground, check out the [Architecture overview](https://wordpress.github.io/wordpress-playground/architecture/index) chapter over on Playground's comprehensive documentation site.

This process includes automatically incrementing the version number, creating a new tag, and publishing all modified packages to npm simultaneously. Notably, all published packages **share the same version number**.

Each package identifies a distinct organization in its `package.json` file.

To publish the `wp-now` package, you need access to the `@wp-now` npm organization.

To initiate the publishing process for `wp-now`, execute the following commands:

```bash
npm login # this is required only once and it will store the credentials in ~/.npmrc file.
npm run build
npm run release:wp-now
```
