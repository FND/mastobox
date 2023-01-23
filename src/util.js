// removes trailing slash, if any
export function normalizeBasePath(uri) {
	return uri.endsWith("/") === false ? uri : uri.substring(0, uri.length - 1);
}

export class CustomError extends Error {
	constructor(code, message) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
	}
}
