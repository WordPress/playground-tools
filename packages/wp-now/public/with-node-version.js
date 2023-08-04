#!/usr/bin/env node
import child_process from 'child_process';

// Set the minimum required/supported version of node here.
const minimum = {
	major: 18,
	minor: 0,
	patch: 0,
};

// Matches "v18.14.2", as an example.
const versionPattern = /^v(\d+)\.(\d+)\.(\d+)$/;
const [major, minor, patch] = versionPattern.exec(process.version).slice(1, 4);

const meetsMajor = major >= minimum.major;
const meetsMinor = meetsMajor && minor >= minimum.minor;
const meetsPatch = meetsMinor && patch >= minimum.patch;

if (!meetsPatch) {
	console.error(
		`This script is requires node version v${minimum.major}.${minimum.minor}.${minimum.patch} or above; found ${process.version}`
	);
	process.exit(1);
}

// Launch the wp-now process and pipe output through this wrappers streams.
child_process.spawn('node', process.argv.slice(2), {
	stdio: ['inherit', 'inherit', 'inherit'],
});
