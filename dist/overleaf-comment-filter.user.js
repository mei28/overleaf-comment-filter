// ==UserScript==
// @name         Overleaf Comment Filter
// @namespace    https://github.com/mei28/overleaf-comment-filter
// @version      0.2.0
// @author       mei28
// @description  List unresolved Overleaf comment threads sorted by created or last activity time.
// @license      MIT
// @homepageURL  https://github.com/mei28/overleaf-comment-filter
// @supportURL   https://github.com/mei28/overleaf-comment-filter/issues
// @downloadURL  https://raw.githubusercontent.com/mei28/overleaf-comment-filter/main/dist/overleaf-comment-filter.user.js
// @updateURL    https://raw.githubusercontent.com/mei28/overleaf-comment-filter/main/dist/overleaf-comment-filter.meta.js
// @match        https://www.overleaf.com/project/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	function describeValue(value) {
		if (value === void 0) return "missing";
		if (value === null) return "null";
		if (Array.isArray(value)) return "array";
		if (typeof value === "boolean") return String(value);
		return typeof value;
	}
	var ShapeError = class extends Error {
		constructor(path, expected, actual, options) {
			super(`${path}: expected ${expected}, got ${actual}`, options);
			this.name = "ShapeError";
		}
	};
	function expectObject(value, path) {
		const actual = describeValue(value);
		if (actual !== "object") throw new ShapeError(path, "object", actual);
		return value;
	}
	function expectArray(value, path) {
		if (!Array.isArray(value)) throw new ShapeError(path, "array", describeValue(value));
		return value;
	}
	function expectString(value, path) {
		if (typeof value !== "string") throw new ShapeError(path, "string", describeValue(value));
		return value;
	}
	function expectNumber(value, path) {
		if (typeof value !== "number") throw new ShapeError(path, "number", describeValue(value));
		return value;
	}
	function parseJson(text, path) {
		try {
			return JSON.parse(text);
		} catch (cause) {
			throw new ShapeError(path, "JSON", "unparsable text", { cause });
		}
	}
	function decodeThreads(json) {
		const root = expectObject(json, "threads");
		const threads = new Map();
		for (const [threadId, value] of Object.entries(root)) threads.set(threadId, decodeThread(value, `threads.${threadId}`));
		return threads;
	}
	function decodeThread(value, path) {
		const thread = expectObject(value, path);
		const rawMessages = expectArray(thread.messages, `${path}.messages`);
		if (rawMessages.length === 0) throw new ShapeError(`${path}.messages`, "non-empty array", "empty array");
		const messages = rawMessages.map((message, index) => decodeMessage(message, `${path}.messages[${index}]`));
		expectAscendingTimestamps(messages, `${path}.messages`);
		return {
			messages,
			resolved: decodeResolved(thread.resolved, path)
		};
	}
	function decodeResolved(value, path) {
		if (value === void 0) return false;
		if (value === true) return true;
		throw new ShapeError(`${path}.resolved`, "true or missing", describeValue(value));
	}
	function expectAscendingTimestamps(messages, path) {
		messages.forEach((message, index) => {
			const previous = messages[index - 1];
			if (previous !== void 0 && message.timestamp < previous.timestamp) throw new ShapeError(`${path}[${index}].timestamp`, `not earlier than messages[${index - 1}]`, "earlier");
		});
	}
	function decodeMessage(value, path) {
		const message = expectObject(value, path);
		return {
			content: expectString(message.content, `${path}.content`),
			timestamp: expectNumber(message.timestamp, `${path}.timestamp`),
			user: message.user === void 0 ? void 0 : decodeUser(message.user, `${path}.user`)
		};
	}
	function decodeUser(value, path) {
		const raw = expectObject(value, path);
		const user = {};
		if (raw.first_name !== void 0) user.firstName = expectString(raw.first_name, `${path}.first_name`);
		if (raw.last_name !== void 0) user.lastName = expectString(raw.last_name, `${path}.last_name`);
		if (raw.email !== void 0) user.email = expectString(raw.email, `${path}.email`);
		return user;
	}
	var HttpError = class extends Error {
		constructor(path, status) {
			super(`GET ${path} failed: HTTP ${status}`);
			this.name = "HttpError";
		}
	};
	async function getJson(path) {
		const response = await fetch(path, { headers: { Accept: "application/json" } });
		if (!response.ok) throw new HttpError(path, response.status);
		return parseJson(await response.text(), path);
	}
	async function loadProjectThreads(projectId) {
		return decodeThreads(await getJson(`/project/${projectId}/threads`));
	}
	var OWN_MARK = "[data-ocf]";
	function isOwnChange(record) {
		const nodes = [...record.addedNodes, ...record.removedNodes];
		return record.target.closest?.(OWN_MARK) != null || nodes.length > 0 && nodes.every((node) => node.matches?.(OWN_MARK));
	}
	function watchPage(doc, onChange) {
		const observer = new MutationObserver((records) => {
			if (records.every(isOwnChange)) return;
			onChange();
		});
		observer.observe(doc.body, {
			childList: true,
			subtree: true
		});
		return () => observer.disconnect();
	}
	function errorMessage(error) {
		return error instanceof Error ? error.message : String(error);
	}
	var SETTINGS = {
		latestReply: {
			key: "lastActivity",
			order: "desc"
		},
		oldestReply: {
			key: "lastActivity",
			order: "asc"
		},
		newestComment: {
			key: "created",
			order: "desc"
		},
		oldestComment: {
			key: "created",
			order: "asc"
		}
	};
	function presetSetting(preset) {
		return SETTINGS[preset];
	}
	var TIME_PRESETS = [
		"latestReply",
		"oldestReply",
		"newestComment",
		"oldestComment"
	];
	var PRESET_LABELS = {
		document: "Document order",
		latestReply: "Latest reply first",
		oldestReply: "Oldest reply first",
		newestComment: "Newest comment first",
		oldestComment: "Oldest comment first"
	};
	function isTimePreset(value) {
		return TIME_PRESETS.includes(value);
	}
	var OverleafUiError = class extends Error {
		constructor(message) {
			super(message);
			this.name = "OverleafUiError";
		}
	};
	function requireElement(root, selector, purpose) {
		const found = root.querySelector(selector);
		if (found === null) throw new OverleafUiError(`${purpose}: ${selector} not found`);
		return found;
	}
	var SELECTORS = {
		currentFileRoot: "#review-panel-current-file",
		currentFileEntries: "#review-panel-current-file > div",
		reviewPanelFooter: ".review-panel-footer",
		overviewRoot: "#review-panel-overview",
		overviewFileEntries: ".review-panel-overview-file-entries",
		reviewEntry: ".review-panel-entry",
		commentEntry: ".review-panel-entry-comment",
		reviewHeaderActions: ".review-panel-header .rail-panel-header-actions"
	};
	var HEADER_ICON_BUTTON_CLASSES = [
		"d-inline-grid",
		"rail-panel-header-button-subdued",
		"icon-button-small",
		"btn"
	];
	var MATERIAL_SYMBOL_CLASSES = ["material-symbols", "icon-small"];
	var TIME_OF = {
		lastActivity: (times) => times.lastActivityAt,
		created: (times) => times.createdAt
	};
	function sortByTime(items, timesOf, { key, order }) {
		const timeOf = (item) => TIME_OF[key](timesOf(item));
		const direction = order === "asc" ? 1 : -1;
		return items.toSorted((a, b) => direction * (timeOf(a) - timeOf(b)));
	}
	function orderEntries(container, setting, timesOf, readThreadId) {
		const unknownThreadIds = [];
		const timed = [];
		const untimed = [];
		const others = [];
		for (const el of container.children) {
			if (!el.matches(SELECTORS.commentEntry)) {
				others.push(el);
				continue;
			}
			const threadId = readThreadId(el);
			const times = timesOf(threadId);
			if (times === void 0) {
				unknownThreadIds.push(threadId);
				untimed.push(el);
			} else timed.push({
				el,
				times
			});
		}
		[
			...sortByTime(timed, (entry) => entry.times, setting).map((entry) => entry.el),
			...untimed,
			...others
		].forEach((el, index) => {
			el.style.order = String(index);
		});
		return { unknownThreadIds };
	}
	function clearEntriesOrder(container) {
		for (const el of container.children) el.style.removeProperty("order");
	}
	function orderOverviewEntries(overview, setting, timesOf, readThreadId) {
		const unknownThreadIds = [];
		for (const group of overview.querySelectorAll(SELECTORS.overviewFileEntries)) {
			const result = orderEntries(group, setting, timesOf, readThreadId);
			unknownThreadIds.push(...result.unknownThreadIds);
		}
		return { unknownThreadIds };
	}
	function clearOverviewOrder(overview) {
		for (const group of overview.querySelectorAll(SELECTORS.overviewFileEntries)) clearEntriesOrder(group);
	}
	function createCurrentFileSorting({ doc, times, readThreadId, renderAll, openDocId, listHeight, reloadDelayMs, onStatus }) {
		let preset = "document";
		let root = null;
		let renderedDocId;
		let rendering = false;
		let failed = false;
		let observer;
		let reloadTimer;
		const order = async (tab) => {
			if (!isTimePreset(preset)) return;
			const docId = openDocId();
			if (docId !== renderedDocId) {
				if (rendering) return;
				rendering = true;
				onStatus({ kind: "loading" });
				try {
					await renderAll();
				} finally {
					rendering = false;
				}
				renderedDocId = docId;
			}
			const known = times.current() ?? await times.load();
			if (!isTimePreset(preset)) return;
			tab.dataset.ocfMode = "time";
			tab.style.setProperty("--ocf-list-height", `${listHeight()}px`);
			const { unknownThreadIds } = orderEntries(requireElement(tab, SELECTORS.currentFileEntries, "Current file tab"), presetSetting(preset), (threadId) => known.get(threadId), readThreadId);
			onStatus({ kind: "idle" });
			await times.refreshForUnknown(unknownThreadIds);
		};
		const fail = (tab, error) => {
			failed = true;
			console.error("[overleaf-comment-filter]", error);
			onStatus({
				kind: "error",
				message: errorMessage(error)
			});
			restoreLayout(tab);
		};
		const apply = () => {
			if (root === null) return;
			const tab = root;
			if (!isTimePreset(preset)) {
				restoreLayout(tab);
				onStatus({ kind: "idle" });
				return;
			}
			order(tab).catch((error) => fail(tab, error));
		};
		times.subscribe(() => {
			if (!failed) apply();
		});
		const observe = (tab) => {
			observer?.disconnect();
			observer = new MutationObserver((records) => {
				const changes = records.filter((record) => !isOwnChange(record));
				if (changes.length === 0 || !isTimePreset(preset) || failed) return;
				apply();
				if (changes.some(isInsideEntry$1)) {
					clearTimeout(reloadTimer);
					reloadTimer = setTimeout(() => times.refresh().catch((error) => fail(tab, error)), reloadDelayMs);
				}
			});
			observer.observe(tab, {
				childList: true,
				subtree: true
			});
		};
		return {
			sync() {
				const current = doc.querySelector(SELECTORS.currentFileRoot);
				const tabChanged = current !== root;
				root = current;
				if (tabChanged) {
					if (root === null) observer?.disconnect();
					else observe(root);
				}
				if (tabChanged) {
					apply();
					return;
				}
				if (root === null || !isTimePreset(preset) || failed) return;
				let docChanged;
				try {
					docChanged = openDocId() !== renderedDocId;
				} catch (error) {
					fail(root, error);
					return;
				}
				if (docChanged) apply();
			},
			setPreset(next) {
				preset = next;
				failed = false;
				apply();
			},
			resize() {
				if (root?.dataset.ocfMode !== "time") return;
				root.style.setProperty("--ocf-list-height", `${listHeight()}px`);
			}
		};
	}
	function restoreLayout(tab) {
		delete tab.dataset.ocfMode;
		tab.style.removeProperty("--ocf-list-height");
		for (const entry of tab.querySelectorAll(SELECTORS.reviewEntry)) entry.style.removeProperty("order");
	}
	function isInsideEntry$1(record) {
		return record.target.closest?.(SELECTORS.reviewEntry) != null;
	}
	var PURPOSE$1 = "Overleaf editor";
	function store(win) {
		const found = win.overleaf?.unstable?.store;
		if (found === void 0) throw new OverleafUiError(`${PURPOSE$1}: window.overleaf.unstable.store not found`);
		return found;
	}
	function readEditorScroller(win) {
		const view = store(win).get("editor.view");
		if (!(view?.scrollDOM instanceof HTMLElement)) throw new OverleafUiError(`${PURPOSE$1}: editor.view.scrollDOM not found`);
		return view.scrollDOM;
	}
	function readOpenDocId(win) {
		const docId = store(win).get("editor.open_doc_id");
		if (typeof docId !== "string") throw new OverleafUiError(`${PURPOSE$1}: editor.open_doc_id not found`);
		return docId;
	}
	function readEditorView(win) {
		const view = store(win).get("editor.view");
		for (const key of ["dom", "scrollDOM"]) if (!(view?.[key] instanceof HTMLElement)) throw new OverleafUiError(`${PURPOSE$1}: editor.view.${key} not found`);
		for (const key of ["scrollSnapshot", "dispatch"]) if (typeof view?.[key] !== "function") throw new OverleafUiError(`${PURPOSE$1}: editor.view.${key} not found`);
		return view;
	}
	function currentFileListHeight(doc, win) {
		const tabBar = requireElement(doc, SELECTORS.reviewPanelFooter, "Review panel tab bar");
		return readEditorScroller(win).clientHeight - tabBar.offsetHeight;
	}
	var STEP_RATIO = .8;
	async function renderAllComments(editor, waitForPaint, onProgress) {
		const snapshot = editor.scrollSnapshot();
		const { scrollDOM } = editor;
		const step = Math.max(1, Math.floor(scrollDOM.clientHeight * STEP_RATIO));
		const stepsNeeded = () => Math.floor(scrollDOM.scrollHeight / step) + 1;
		for (let index = 0; index < stepsNeeded(); index += 1) {
			scrollDOM.scrollTop = index * step;
			await waitForPaint();
			onProgress(index + 1, stepsNeeded());
		}
		editor.dispatch({ effects: snapshot });
		await waitForPaint();
	}
	function element(tag, className, ...children) {
		const node = document.createElement(tag);
		node.className = className;
		node.append(...children);
		return node;
	}
	function showScanOverlay(doc, area) {
		const progress = element("p", "ocf-scan-progress", "Starting…");
		const spinner = element("div", "spinner-border spinner-border-sm");
		spinner.setAttribute("aria-hidden", "true");
		const overlay = element("div", "ocf-scan-overlay", element("div", "ocf-scan-card", spinner, element("p", "ocf-scan-title", "Collecting comments to sort…"), element("p", "ocf-scan-hint", "Please don't scroll or type until this finishes. You will be returned to where you were."), progress));
		overlay.dataset.ocf = "scan-overlay";
		overlay.setAttribute("role", "status");
		overlay.setAttribute("aria-live", "polite");
		overlay.setAttribute("aria-busy", "true");
		const rect = area.getBoundingClientRect();
		Object.assign(overlay.style, {
			position: "fixed",
			top: `${rect.top}px`,
			left: `${rect.left}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`
		});
		const holdKey = (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		const focused = doc.activeElement;
		focused?.blur();
		doc.addEventListener("keydown", holdKey, true);
		doc.body.append(overlay);
		return {
			update(done, total) {
				progress.textContent = `Step ${done} of ${total}`;
			},
			remove() {
				doc.removeEventListener("keydown", holdKey, true);
				overlay.remove();
				focused?.focus({ preventScroll: true });
			}
		};
	}
	async function scanCurrentFile(doc, win, waitForPaint) {
		const view = readEditorView(win);
		const overlay = showScanOverlay(doc, view.dom);
		try {
			await renderAllComments(view, waitForPaint, overlay.update);
		} finally {
			overlay.remove();
		}
	}
	var LABEL = "Sort comments";
	function ensureSortButton(doc, onClick) {
		const actions = doc.querySelector(SELECTORS.reviewHeaderActions);
		if (actions === null) return void 0;
		const existing = actions.querySelector("[data-ocf='sort-button']");
		if (existing !== null) return existing;
		const button = element("button", [...HEADER_ICON_BUTTON_CLASSES, "ocf-sort-toggle"].join(" "), iconElement("sort"));
		button.type = "button";
		button.dataset.ocf = "sort-button";
		button.setAttribute("aria-label", LABEL);
		button.setAttribute("aria-pressed", "false");
		button.title = LABEL;
		button.addEventListener("click", () => onClick(button));
		actions.prepend(button);
		return button;
	}
	function showSortState(button, preset, status) {
		button.setAttribute("aria-pressed", String(preset !== "document"));
		if (status.kind === "idle") delete button.dataset.ocfState;
		else button.dataset.ocfState = status.kind;
		button.title = status.kind === "error" ? `Sorting unavailable: ${status.message}` : LABEL;
	}
	function iconElement(name) {
		const icon = element("span", MATERIAL_SYMBOL_CLASSES.join(" "), name);
		icon.setAttribute("aria-hidden", "true");
		return icon;
	}
	var GAP = 4;
	var MARGIN = 8;
	function popoverPlacement(anchor, width, viewport) {
		const top = anchor.bottom + GAP;
		return {
			top,
			left: Math.min(anchor.left, viewport.width - width - MARGIN),
			maxHeight: viewport.height - top - MARGIN
		};
	}
	var PRESETS = ["document", ...TIME_PRESETS];
	var WIDTH = 220;
	function createSortMenu(onSelect) {
		const items = new Map(PRESETS.map((preset) => {
			const item = element("button", "dropdown-item ocf-sort-item");
			item.type = "button";
			item.setAttribute("role", "menuitemradio");
			item.addEventListener("click", () => {
				close();
				onSelect(preset);
			});
			return [preset, item];
		}));
		const statusLine = element("li", "ocf-sort-status");
		statusLine.setAttribute("role", "status");
		statusLine.hidden = true;
		const menu = element("ul", "dropdown-menu show ocf-sort-menu", ...[...items.values()].map((item) => element("li", "", item)), statusLine);
		menu.dataset.ocf = "sort-menu";
		menu.setAttribute("role", "menu");
		menu.hidden = true;
		let anchor;
		const onPointerDown = (event) => {
			const target = event.target;
			if (menu.contains(target) || anchor?.contains(target)) return;
			close();
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") close();
		};
		const open = (button) => {
			anchor = button;
			const placement = popoverPlacement(button.getBoundingClientRect(), WIDTH, {
				width: window.innerWidth,
				height: window.innerHeight
			});
			Object.assign(menu.style, {
				position: "fixed",
				top: `${placement.top}px`,
				left: `${placement.left}px`,
				width: `${WIDTH}px`
			});
			menu.hidden = false;
			button.setAttribute("aria-expanded", "true");
			document.addEventListener("pointerdown", onPointerDown, true);
			document.addEventListener("keydown", onKeyDown);
		};
		function close() {
			menu.hidden = true;
			anchor?.setAttribute("aria-expanded", "false");
			anchor = void 0;
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown);
		}
		return {
			element: menu,
			update(preset, status) {
				statusLine.hidden = status.kind === "idle";
				statusLine.textContent = statusText(status);
				for (const [itemPreset, item] of items) {
					const checked = itemPreset === preset;
					item.setAttribute("aria-checked", String(checked));
					item.replaceChildren(...checked ? [checkIcon()] : [], PRESET_LABELS[itemPreset]);
				}
			},
			toggle(button) {
				if (anchor === void 0) open(button);
				else close();
			},
			closeIfDetached() {
				if (anchor !== void 0 && !anchor.isConnected) close();
			}
		};
	}
	function checkIcon() {
		const icon = element("span", [...MATERIAL_SYMBOL_CLASSES, "ocf-sort-check"].join(" "), "check");
		icon.setAttribute("aria-hidden", "true");
		return icon;
	}
	function statusText(status) {
		switch (status.kind) {
			case "idle": return "";
			case "loading": return "Loading comments…";
			case "error": return `Sorting unavailable: ${status.message}`;
		}
	}
	var FIBER_KEY_PREFIX = "__reactFiber$";
	var PURPOSE = "Overview comment entry";
	var MAX_LEVELS = 5;
	function readCommentThreadId(entry) {
		let fiber = fiberOf(entry);
		for (let level = 0; level < MAX_LEVELS && fiber !== null; level += 1) {
			const thread = threadIdOf(fiber.memoizedProps);
			if (thread !== void 0) return thread;
			fiber = fiber.return;
		}
		throw new OverleafUiError(`${PURPOSE}: no comment props within ${MAX_LEVELS} React levels`);
	}
	function fiberOf(entry) {
		const key = Object.keys(entry).find((name) => name.startsWith(FIBER_KEY_PREFIX));
		if (key === void 0) throw new OverleafUiError(`${PURPOSE}: React fiber not found (${FIBER_KEY_PREFIX}*)`);
		return entry[key] ?? null;
	}
	function threadIdOf(props) {
		const threadId = (props?.comment)?.op?.t;
		return typeof threadId === "string" ? threadId : void 0;
	}
	function createOverviewSorting({ doc, times, readThreadId, reloadDelayMs, onStatus }) {
		let preset = "document";
		let root = null;
		let observer;
		let reloadTimer;
		let failed = false;
		const fail = (error) => {
			failed = true;
			console.error("[overleaf-comment-filter]", error);
			onStatus({
				kind: "error",
				message: errorMessage(error)
			});
			if (root !== null) clearOverviewOrder(root);
		};
		const apply = () => {
			if (root === null) return;
			if (!isTimePreset(preset)) {
				clearOverviewOrder(root);
				onStatus({ kind: "idle" });
				return;
			}
			const known = times.current();
			if (known === void 0) {
				onStatus({ kind: "loading" });
				times.load().catch(fail);
				return;
			}
			let unknownThreadIds;
			try {
				({unknownThreadIds} = orderOverviewEntries(root, presetSetting(preset), (threadId) => known.get(threadId), readThreadId));
			} catch (error) {
				fail(error);
				return;
			}
			onStatus({ kind: "idle" });
			times.refreshForUnknown(unknownThreadIds).catch(fail);
		};
		times.subscribe(() => {
			if (!failed) apply();
		});
		const observe = (overview) => {
			observer?.disconnect();
			observer = new MutationObserver((records) => {
				const changes = records.filter((record) => !isOwnChange(record));
				if (changes.length === 0 || failed) return;
				apply();
				if (isTimePreset(preset) && changes.some(isInsideEntry)) {
					clearTimeout(reloadTimer);
					reloadTimer = setTimeout(() => times.refresh().catch(fail), reloadDelayMs);
				}
			});
			observer.observe(overview, {
				childList: true,
				subtree: true
			});
		};
		return {
			sync() {
				const current = doc.querySelector(SELECTORS.overviewRoot);
				if (current === root) return;
				root = current;
				if (root === null) {
					observer?.disconnect();
					return;
				}
				observe(root);
				apply();
			},
			setPreset(next) {
				preset = next;
				failed = false;
				apply();
			}
		};
	}
	function isInsideEntry(record) {
		return record.target.closest?.(SELECTORS.reviewEntry) != null;
	}
	var EDITOR_PATH = /^\/project\/([0-9a-f]{24})$/;
	function parseEditorProjectId(pathname) {
		return EDITOR_PATH.exec(pathname)?.[1];
	}
	function combineStatuses(statuses) {
		return statuses.find((status) => status.kind === "error") ?? statuses.find((status) => status.kind === "loading") ?? { kind: "idle" };
	}
	function threadTimes({ messages }) {
		return {
			createdAt: messages[0].timestamp,
			lastActivityAt: messages.at(-1).timestamp
		};
	}
	function timesByThread(threads) {
		return new Map([...threads].map(([threadId, thread]) => [threadId, threadTimes(thread)]));
	}
	function createThreadTimesSource(loadThreads) {
		let times;
		let inFlight;
		const listeners = [];
		const requested = new Set();
		const fetchTimes = () => {
			inFlight ??= loadThreads().then((threads) => {
				times = timesByThread(threads);
				for (const listener of listeners) listener();
				return times;
			}).finally(() => {
				inFlight = void 0;
			});
			return inFlight;
		};
		return {
			current: () => times,
			load: () => times !== void 0 ? Promise.resolve(times) : fetchTimes(),
			refresh: fetchTimes,
			async refreshForUnknown(threadIds) {
				const fresh = threadIds.filter((id) => !requested.has(id));
				if (fresh.length === 0) return void 0;
				for (const id of fresh) requested.add(id);
				return fetchTimes();
			},
			subscribe(listener) {
				listeners.push(listener);
			}
		};
	}
	var styles_default = ".ocf-sort-toggle[aria-pressed=true]{color:var(--bg-accent-01)}.ocf-sort-toggle[data-ocf-state=loading]{opacity:.5}.ocf-sort-toggle[data-ocf-state=error]{color:var(--content-danger-themed)}.ocf-sort-menu{z-index:1000}.ocf-sort-item{align-items:center;gap:var(--spacing-02);padding-left:calc(var(--spacing-04) + 20px + var(--spacing-02));display:flex}.ocf-sort-item[aria-checked=true]{padding-left:var(--spacing-04)}.ocf-sort-status{padding:var(--spacing-02) var(--spacing-04) 0;color:var(--content-secondary);font-size:var(--font-size-01);overflow-wrap:anywhere}#review-panel-current-file[data-ocf-mode=time]{height:var(--ocf-list-height);padding:var(--spacing-02);display:block;position:sticky;top:0;overflow-y:auto}#review-panel-current-file[data-ocf-mode=time]>div{gap:var(--spacing-02);flex-direction:column;display:flex}#review-panel-current-file[data-ocf-mode=time] .review-panel-entry{width:100%;margin-left:0;visibility:visible!important;position:relative!important;top:auto!important}#review-panel-current-file[data-ocf-mode=time] .review-panel-more-comments-button-container{display:none}.ocf-scan-overlay{z-index:1000;background:color-mix(in srgb, var(--bg-primary-themed) 75%, transparent);cursor:progress;justify-content:center;align-items:center;display:flex}.ocf-scan-card{max-width:360px;padding:var(--spacing-06) var(--spacing-08);border:1px solid var(--border-divider-themed);border-radius:var(--border-radius-medium);background:var(--bg-secondary-themed);color:var(--content-primary-themed);text-align:center}.ocf-scan-title{margin:var(--spacing-04) 0 var(--spacing-02);font-size:var(--font-size-03);font-weight:600}.ocf-scan-hint,.ocf-scan-progress{margin:0 0 var(--spacing-02);color:var(--content-secondary-themed);font-size:var(--font-size-02)}";
	var STYLE_ID = "ocf-styles";
	function injectStyles(doc) {
		if (doc.getElementById(STYLE_ID) !== null) return;
		const style = doc.createElement("style");
		style.id = STYLE_ID;
		style.textContent = styles_default;
		doc.head.append(style);
	}
	var SETTLE_MS = 80;
	function waitForPaint() {
		return new Promise((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, SETTLE_MS)));
		});
	}
	var RELOAD_DELAY_MS = 1e3;
	var projectId = parseEditorProjectId(location.pathname);
	if (projectId !== void 0) start(projectId);
	function start(projectId) {
		injectStyles(document);
		const times = createThreadTimesSource(() => loadProjectThreads(projectId));
		let preset = "document";
		const statuses = {
			currentFile: { kind: "idle" },
			overview: { kind: "idle" }
		};
		let button;
		const menu = createSortMenu((next) => {
			preset = next;
			currentFile.setPreset(next);
			overview.setPreset(next);
			showState();
		});
		document.body.append(menu.element);
		const showState = () => {
			const status = combineStatuses(Object.values(statuses));
			menu.update(preset, status);
			if (button !== void 0) showSortState(button, preset, status);
		};
		const currentFile = createCurrentFileSorting({
			doc: document,
			times,
			readThreadId: readCommentThreadId,
			renderAll: () => scanCurrentFile(document, window, waitForPaint),
			openDocId: () => readOpenDocId(window),
			listHeight: () => currentFileListHeight(document, window),
			reloadDelayMs: RELOAD_DELAY_MS,
			onStatus: (status) => {
				statuses.currentFile = status;
				showState();
			}
		});
		const overview = createOverviewSorting({
			doc: document,
			times,
			readThreadId: readCommentThreadId,
			reloadDelayMs: RELOAD_DELAY_MS,
			onStatus: (status) => {
				statuses.overview = status;
				showState();
			}
		});
		const sync = () => {
			const current = ensureSortButton(document, (anchor) => menu.toggle(anchor));
			if (current !== button) {
				button = current;
				showState();
			}
			menu.closeIfDetached();
			currentFile.sync();
			overview.sync();
		};
		window.addEventListener("resize", () => currentFile.resize());
		window.addEventListener("editor:geometry-change", () => currentFile.resize());
		showState();
		watchPage(document, sync);
		sync();
	}
})();
