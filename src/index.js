/* eslint-env browser */
import { auth, deauth } from "./mastodon/index.js";
import { detoot } from "./mastodon/toot.js";
import { CustomError } from "./util.js";

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

main();

async function main() {
	let client = await auth();
	if(client === false) { // user activation required
		let settings = document.querySelector("form"); // XXX: smell
		settings.addEventListener("submit", ev => {
			ev.preventDefault();
			let serverURL = settings.querySelector("[name=server]").value;
			auth(serverURL); // TODO: user feedback
		});
		settings.hidden = false;
		return;
	}

	timeline(client);
}

async function timeline(client) {
	let res = await client.timeline();
	if(res.status === 401) { // XXX: `err.message` might leak internals?
		deauth();
		throw new CustomError("ERR_AUTH_REJECTED", "invalid auth credentials");
	}
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

function notify(type, msg) {
	let el = document.createElement("p");
	el.className = `alert is-${type}`;
	el.textContent = msg;
	let { body } = document;
	body.insertBefore(el, body.firstElementChild);
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
