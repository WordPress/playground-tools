/**
 * Encodes the Express request with files into multipart/form-data request body.
 */
export async function encodeAsMultipart(req: Express.Request) {
	const boundary = `----${Math.random().toString(36).slice(2)}`;
	const contentType = `multipart/form-data; boundary=${boundary}`;

	const textEncoder = new TextEncoder();
	const parts: (string | Uint8Array)[] = [];
	const data = (req as any).body as Record<string, string>;
	for (const [name, value] of Object.entries(data)) {
		parts.push(`--${boundary}\r\n`);
		parts.push(`Content-Disposition: form-data; name="${name}"`);
		parts.push(`\r\n`);
		parts.push(`\r\n`);
		parts.push(value);
		parts.push(`\r\n`);
	}
	const files = req.files;
	for (const [name, value] of Object.entries(files)) {
		if (!Array.isArray(value)) {
			parts.push(`--${boundary}\r\n`);
			parts.push(`Content-Disposition: form-data; name="${name}"`);
			parts.push(`; filename="${value.name}"`);
			parts.push(`\r\n`);
			parts.push(`Content-Type: application/octet-stream`);
			parts.push(`\r\n`);
			parts.push(`\r\n`);
			parts.push(value.data);
			parts.push(`\r\n`);
		}
	}
	parts.push(`--${boundary}--\r\n`);

	const length = parts.reduce((acc, part) => acc + part.length, 0);
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const part of parts) {
		bytes.set(
			typeof part === 'string' ? textEncoder.encode(part) : part,
			offset
		);
		offset += part.length;
	}

	return { bytes, contentType };
}
