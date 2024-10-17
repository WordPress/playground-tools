export async function downloadWithTimer(name, fn) {
	console.log(`Downloading ${name}...`);
	console.time(name);
	await fn();
	console.log(`${name} downloaded.`);
	console.timeEnd(name);
}
