/**
 * Adds redirection adding a trailing slash, when a request matches a given path.
 * @param path - The path to add a trailing slash to. E.g. '/wp-admin'
 * @returns  - Returns a middleware function that may redirect adding a trailing slash to the given path. E.g. '/wp-admin/'
 */
export function addTrailingSlash(path) {
	return (req, res, next) => {
		if (req.url === path) {
			res.redirect(301, `${path}/`);
		} else {
			next();
		}
	};
}
