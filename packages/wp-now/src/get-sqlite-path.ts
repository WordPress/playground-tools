import path from 'path';
import getWpNowPath from './get-wp-now-path';
import { SQLITE_FILENAME } from './constants';

/**
 * The full path to the "SQLite database integration" folder.
 */
export default function getSqlitePath() {
	return path.join(getWpNowPath(), 'mu-plugins', `${SQLITE_FILENAME}-main`);
}

/**
 * The full path to the "SQLite database integration" db.copy file.
 */
export function getSqliteDbCopyPath() {
	return path.join(getSqlitePath(), 'db.copy');
}
