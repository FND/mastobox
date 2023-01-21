/* eslint-env browser */
import { detoot } from "./mastodon/toot.js";
import { MastodonClient } from "./mastodon/client.js";

let TOOT_HTML = toot => `
<li data-id=${toot.id}>
	<a href="${encode(toot.url)}">🔗</a>
	<b>${encode(toot.author.name)}</b>
	<div>${toot.content}</div>
</li>
`.trim();

let RETOOT_HTML = ({ via, toot }) => `
<li data-id=${toot.id}>
	<a href="${encode(toot.url)}">🔗</a>
	<b>${encode(toot.author.name)}</b>
	<small>via ${encode(via.name)}</small>
	<div>${toot.content}</div>
</li>
`.trim();

let CLIENT_NAME = "Mastobox";
let STORAGE_PREFIX = CLIENT_NAME.toLowerCase(); // XXX: key storage to server?
let CACHE_KEY = `${STORAGE_PREFIX}_cache`;
let TOKEN_KEY = `${STORAGE_PREFIX}_token`;

let SETTINGS = document.querySelector("form"); // XXX: smell

let token = localStorage.getItem(TOKEN_KEY);
let authCode = new URLSearchParams(document.location.search).get("code");
if(token) {
	timeline(token);
} else if(authCode) {
	concludeAuth(authCode);
} else {
	SETTINGS.addEventListener("submit", onAuth);
	SETTINGS.hidden = false;
}

async function timeline(tokenCache) {
	let { serverURL, token } = JSON.parse(tokenCache);
	let client = makeClient(serverURL, token.access_token);

	let res = await client.timeline();
	let pagination = res.headers.get("Link");

	let toots = await res.json();
	let list = document.createElement("ol");
	for(let toot of toots) {
		toot = detoot(toot);
		let el = document.createElement("div"); // XXX: hacky
		el.innerHTML = toot.via ? RETOOT_HTML(toot) : TOOT_HTML(toot);
		list.appendChild(el.firstChild);
	}
	document.body.appendChild(list);
}

async function onAuth(ev) {
	ev.preventDefault();

	let serverURL = this.querySelector("[name=server]").value;

	let client = makeClient(serverURL);
	try {
		var { url, registration } = await client.auth(); // eslint-disable-line no-var
	} catch(err) {
		notify("error", err.message); // XXX: might leak internals?
		return;
	}

	// cache auth context for post-redirect processing
	localStorage.setItem(CACHE_KEY, JSON.stringify({ serverURL, registration }));
	document.location = url;
}

async function concludeAuth(authCode) {
	let cache = localStorage.getItem(CACHE_KEY);
	if(!cache) {
		notify("error", "missing auth credentials");
		return;
	}

	let { serverURL, registration } = JSON.parse(cache);
	let client = makeClient(serverURL);
	let token = await client.auth(authCode, registration);
	localStorage.removeItem(CACHE_KEY);
	localStorage.setItem(TOKEN_KEY, JSON.stringify({ serverURL, token }));
	document.location = client.clientURL;
}

function notify(type, msg) {
	let el = document.createElement("p");
	el.className = `alert is-${type}`;
	el.textContent = msg;
	let { body } = document;
	body.insertBefore(el, body.firstElementChild);
}

function makeClient(serverURL, token) {
	let self = new URL(document.location.toString());
	self.search = "";
	return new MastodonClient(CLIENT_NAME, serverURL, self.toString(), token);
}

// adapted from TiddlyWiki <http://tiddlywiki.com> and Python 3's `html` module
function encode(str, isAttribute) {
	let res = str.replace(/&/g, "&amp;").
		replace(/</g, "&lt;").
		replace(/>/g, "&gt;");
	if(isAttribute) {
		res = res.replace(/"/g, "&quot;").
			replace(/'/g, "&#x27;");
	}
	return res;
}
