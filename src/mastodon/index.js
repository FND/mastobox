/* eslint-env browser */
import { MastodonClient } from "./client.js";
import { CustomError } from "../util.js";

let CLIENT_NAME = "Mastobox";
let STORAGE_PREFIX = CLIENT_NAME.toLowerCase(); // XXX: key storage to server?
let CACHE_KEY = `${STORAGE_PREFIX}_cache`;
let TOKEN_KEY = `${STORAGE_PREFIX}_token`;

export function deauth() {
	localStorage.removeItem(CACHE_KEY);
	localStorage.removeItem(TOKEN_KEY);
}

// 1. register application
// 2. redirect to Mastodon server for user confirmation
// 3. return to application with auth code
// 4. retrieve access token
// 5. launch application
//
// adapted from libodonjs (MIT) <https://github.com/Zatnosk/libodonjs>
export async function auth(serverURL = null) {
	let token = localStorage.getItem(TOKEN_KEY);
	if(token) { // ready
		let { serverURL, token: _token } = JSON.parse(token);
		return makeClient(serverURL, _token.access_token);
	}

	let authCode = new URLSearchParams(document.location.search).get("code");
	if(authCode) { // exchange code for token
		await concludeAuth(authCode);
		let url = new URL(document.location.toString());
		url.search = "";
		history.replaceState(null, "", url.toString());
		return auth(serverURL);
	}

	if(!serverURL) {
		return false; // XXX: hacky way to communicate current auth state
	}

	// start auth process
	let url = await startAuth(serverURL);
	document.location = url;
}

async function startAuth(serverURL) {
	let client = makeClient(serverURL);
	try {
		var { url, registration } = await client.auth(); // eslint-disable-line no-var
	} catch(err) { // XXX: `err.message` might leak internals?
		throw new CustomError("ERR_AUTH_REGISTRATION", err.message);
	}
	// cache auth context for post-redirect processing
	localStorage.setItem(CACHE_KEY, JSON.stringify({ serverURL, registration }));
	return url;
}

async function concludeAuth(authCode) {
	let cache = localStorage.getItem(CACHE_KEY);
	if(!cache) {
		throw new CustomError("ERR_AUTH_CODE", "missing auth credentials");
	}
	let { serverURL, registration } = JSON.parse(cache);

	let client = makeClient(serverURL);
	let token = await client.auth(authCode, registration);
	localStorage.removeItem(CACHE_KEY);
	localStorage.setItem(TOKEN_KEY, JSON.stringify({ serverURL, token }));
}

function makeClient(serverURL, token) {
	let self = new URL(document.location.toString());
	self.search = "";
	return new MastodonClient(CLIENT_NAME, serverURL, self.toString(), token);
}
