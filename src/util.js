export class CustomError extends Error {
	constructor(code, message) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
	}
}
