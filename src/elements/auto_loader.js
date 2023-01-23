/* eslint-env browser */
import { normalizeBasePath, CustomError } from "../util.js";

// adapted from blynx's experiment <https://github.com/blynx/custom-element-autoload>
export class CustomElementsAutoLoader extends HTMLElement {
	connectedCallback() {
		let scope = document.body; // TODO: configurable?
		requestIdleCallback(() => {
			this.discover(scope);
		});

		let observer = this._observer = new MutationObserver(mutations => {
			for(let { addedNodes } of mutations) {
				for(let node of addedNodes) {
					requestIdleCallback(() => {
						this.discover(node);
					});
				}
			}
		});
		observer.observe(scope, { subtree: true, childList: true });
	}

	disconnectedCallback() {
		this._observer.disconnect();
	}

	discover(scope) {
		let candidates = [scope, ...scope.querySelectorAll("*")];
		for(let el of candidates) {
			let tag = el.localName;
			if(tag.includes("-") && !customElements.get(tag)) {
				this.load(tag);
			}
		}
	}

	load(tag) {
		let el = document.createElement("script");
		let res = new Promise((resolve, reject) => {
			el.addEventListener("load", ev => {
				resolve(null);
			});
			el.addEventListener("error", ev => {
				reject(new CustomError("ERR_LAZY_CE",
						"failed to locate custom-element definition"));
			});
		});
		el.src = `${this.rootDir}/${tag}.js`; // TODO: configurable
		document.head.appendChild(el);
		return res;
	}

	get rootDir() {
		let uri = this.getAttribute("root-dir");
		return normalizeBasePath(uri);
	}
}
