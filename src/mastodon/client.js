import { normalizeBasePath } from "../util.js";

let SCOPE = "read";
let RESPONSE_TYPE = "code";
let GRANT_TYPE = "authorization_code";

// adapted from libodonjs (MIT)  <https://github.com/Zatnosk/libodonjs>
export class MastodonClient {
	constructor(clientName, serverURL, clientURL, accessToken = null) {
		this.clientName = clientName;
		this.clientURL = clientURL;
		this.serverURL = normalizeBasePath(serverURL);
		this.accessToken = accessToken;
	}

	timeline() {
		return this.apiRequest("GET", "/api/v1/timelines/home", {
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		});
	}

	async auth(code, registration) {
		if(!registration) { // start from scratch
			code = null;
			let res = await this.apiRequest("POST", "/api/v1/apps", {
				body: querify({
					client_name: this.clientName,
					response_type: RESPONSE_TYPE,
					scopes: SCOPE,
					redirect_uris: this.clientURL
				})
			});
			registration = await res.json();
		}

		if(!code) { // redirect
			let params = querify({
				response_type: RESPONSE_TYPE,
				client_id: registration.client_id,
				redirect_uri: registration.redirect_uri,
				scope: SCOPE
			});
			return {
				url: `${this.serverURL}/oauth/authorize?${params}`,
				registration
			};
		}

		let res = await this.apiRequest("POST", "/oauth/token", {
			body: querify({
				grant_type: GRANT_TYPE,
				client_id: registration.client_id,
				client_secret: registration.client_secret,
				redirect_uri: registration.redirect_uri,
				code
			})
		});
		let token = await res.json();
		if(token.error === "invalid_grant") {
			let details = token.error_description;
			throw new Error(`auth failed: invalid grant (${details})`);
		}
		return token;
	}

	apiRequest(method, uri, options) {
		return fetch(this.serverURL + uri, {
			method,
			mode: "cors",
			...options
		});
	}
}

function querify(params) { // TODO: rename
	let data = new URLSearchParams();
	for(let [name, value] of Object.entries(params)) {
		data.set(name, value);
	}
	return data;
}
