/**
 * Base64 encoding and decoding functions.
 * We cannot just use `btoa` and `atob` because they do not
 * support Unicode characters.
 */

export const attributesToBase64 = [
	'blueprint',
	'blueprintUrl',
	'codeEditorErrorLog',
	'constants',
	'files',
];

export function base64EncodeBlockAttributes(
	blockAttributes: Record<string, any>
) {
	const base64Props: Record<string, string> = {};
	for (const key in blockAttributes) {
		if (
			!attributesToBase64.includes(key) ||
			typeof blockAttributes[key] === 'number' ||
			typeof blockAttributes[key] === 'boolean' ||
			typeof blockAttributes[key] === null ||
			typeof blockAttributes[key] === undefined
		) {
			base64Props[key] = blockAttributes[key];
			continue;
		}
		try {
			base64Props[key] = stringToBase64(
				JSON.stringify(blockAttributes[key])
			);
		} catch (error) {
			base64Props[key] = blockAttributes[key] as string;
		}
	}
	// The "files" attribute is of type array
	if ('files' in base64Props) {
		base64Props['files'] = [base64Props['files']] as any;
	}
	return base64Props;
}

export function base64DecodeBlockAttributes(
	base64Attributes: Record<string, any>
) {
	const attributes: Record<string, any> = {};
	// This is called in useMemo() on many re-renders,
	// let's never throw, bale out early if we can't decode,
	// and always return a valid object.
	for (const key in base64Attributes) {
		let valueToDecode = base64Attributes[key];
		// The "files" attribute is of type array
		if (key === 'files') {
			valueToDecode = valueToDecode[0];
		}
		if (
			!attributesToBase64.includes(key) ||
			!(typeof valueToDecode === 'string')
		) {
			attributes[key] = base64Attributes[key];
			continue;
		}
		if (key in base64Attributes) {
			try {
				attributes[key] = JSON.parse(base64ToString(valueToDecode));
			} catch (error) {
				// Ignore errors and keep the base64 encoded string.
				attributes[key] = base64Attributes[key];
			}
		}
	}
	return attributes;
}

export function stringToBase64(string: string) {
	return uint8ArrayToBase64(new TextEncoder().encode(string));
}

export function base64ToString(base64: string) {
	return new TextDecoder().decode(base64ToUint8Array(base64));
}

export function uint8ArrayToBase64(bytes: Uint8Array) {
	const binary = [];
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary.push(String.fromCharCode(bytes[i]));
	}
	return window.btoa(binary.join(''));
}

export function base64ToUint8Array(base64: string) {
	const binaryString = window.atob(base64); // This will convert base64 to binary string
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}
