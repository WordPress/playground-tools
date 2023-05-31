import { runCli } from './run-cli';

const requiredMajorVersion = 18;

const currentNodeVersion = parseInt(process.versions?.node?.split('.')?.[0]);

if (currentNodeVersion < requiredMajorVersion) {
	console.warn(
		`You are running Node.js version ${currentNodeVersion}, but this application requires at least Node.js ${requiredMajorVersion}. Please upgrade your Node.js version.`
	);
}

runCli();
