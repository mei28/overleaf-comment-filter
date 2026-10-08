// ==UserScript==
// @name         Overleaf Comment Filter
// @namespace    https://github.com/mei28/overleaf-comment-filter
// @version      0.1.0
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
	var pad = (value) => String(value).padStart(2, "0");
	function formatDateTime(epochMs) {
		const date = new Date(epochMs);
		return `${`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}
	function element(tag, className, ...children) {
		const node = document.createElement(tag);
		node.className = className;
		node.append(...children);
		return node;
	}
	function timeElement(epochMs) {
		const time = document.createElement("time");
		time.dateTime = new Date(epochMs).toISOString();
		time.textContent = formatDateTime(epochMs);
		return time;
	}
	function createPanel(root) {
		const toggle = button("toggle", "Comments");
		toggle.setAttribute("aria-expanded", "false");
		const title = element("h2", "panel-title", "Unresolved comments");
		const close = button("close", "×");
		close.setAttribute("aria-label", "Close");
		const sortKey = element("select", "sort-key", option("lastActivity", "Last activity"), option("created", "Created"));
		sortKey.setAttribute("aria-label", "Sort by");
		const order = button("order", "Newest first");
		const reload = button("reload", "Reload");
		const body = element("div", "body");
		const panel = element("section", "panel", element("header", "panel-header", title, close), element("div", "controls", sortKey, order, reload), body);
		panel.hidden = true;
		root.append(toggle, panel);
		return {
			toggle,
			panel,
			title,
			close,
			sortKey,
			order,
			reload,
			body
		};
	}
	function button(className, label) {
		const node = element("button", className, label);
		node.type = "button";
		return node;
	}
	function option(value, label) {
		const node = element("option", "", label);
		node.value = value;
		return node;
	}
	var TIMESTAMP_OF = {
		lastActivity: (entry) => entry.lastMessage.timestamp,
		created: (entry) => entry.firstMessage.timestamp
	};
	function sortEntries(entries, key, order) {
		const timestampOf = TIMESTAMP_OF[key];
		const direction = order === "asc" ? 1 : -1;
		return entries.toSorted((a, b) => direction * (timestampOf(a) - timestampOf(b)));
	}
	function commentDeepLink(projectId, docId, threadId) {
		return `/project/${projectId}?${new URLSearchParams({
			doc: docId,
			comment: threadId
		})}`;
	}
	function renderEntry(entry, projectId) {
		const { firstMessage } = entry;
		const link = element("a", "entry-link", ...quote(entry.highlightedText), element("div", "entry-meta", firstMessage.authorName, " · ", timeElement(firstMessage.timestamp)), element("p", "entry-content", firstMessage.content), ...activity(entry));
		link.href = commentDeepLink(projectId, entry.docId, entry.threadId);
		return element("li", "entry", link);
	}
	function quote(highlightedText) {
		if (highlightedText === "") return [];
		return [element("blockquote", "entry-quote", highlightedText)];
	}
	function activity({ replyCount, lastMessage }) {
		if (replyCount === 0) return [];
		return [element("div", "entry-activity", `${replyCount === 1 ? "1 reply" : `${replyCount} replies`} · last by ${lastMessage.authorName} · `, timeElement(lastMessage.timestamp))];
	}
	var ISSUES_URL = "https://github.com/mei28/overleaf-comment-filter/issues";
	function renderBody(state, sort, projectId) {
		switch (state.kind) {
			case "loading": return [renderLoading()];
			case "error": return [renderError(state.message)];
			case "loaded": return renderList(state.list, sort, projectId);
		}
	}
	function renderList({ entries, unanchoredThreadCount }, sort, projectId) {
		return [renderEntries(entries, sort, projectId), ...unanchoredNote(unanchoredThreadCount)];
	}
	function renderEntries(entries, sort, projectId) {
		if (entries.length === 0) return element("p", "status", "No unresolved comments in any file.");
		return element("ol", "entries", ...sortEntries(entries, sort.key, sort.order).map((entry) => renderEntry(entry, projectId)));
	}
	function unanchoredNote(count) {
		if (count === 0) return [];
		return [element("p", "unanchored-note", count === 1 ? "1 unresolved thread has no position in any file and is not listed." : `${count} unresolved threads have no position in any file and are not listed.`)];
	}
	function renderLoading() {
		const loading = element("p", "status", "Loading comments…");
		loading.setAttribute("aria-busy", "true");
		return loading;
	}
	function renderError(message) {
		const report = element("a", "error-report", "Report an issue");
		report.href = ISSUES_URL;
		report.target = "_blank";
		report.rel = "noopener";
		const alert = element("div", "error", element("p", "error-title", "Could not load comments."), element("p", "error-message", message), report);
		alert.setAttribute("role", "alert");
		return alert;
	}
	function startApp({ root, projectId, load }) {
		const ui = createPanel(root);
		const sort = {
			key: "lastActivity",
			order: "desc"
		};
		let state = { kind: "loading" };
		let isOpen = false;
		const render = () => {
			ui.body.replaceChildren(...renderBody(state, sort, projectId));
			ui.title.textContent = state.kind === "loaded" ? `Unresolved comments (${state.list.entries.length})` : "Unresolved comments";
		};
		const refresh = async () => {
			state = { kind: "loading" };
			ui.reload.disabled = true;
			render();
			try {
				state = {
					kind: "loaded",
					list: await load()
				};
			} catch (error) {
				console.error("[overleaf-comment-filter]", error);
				state = {
					kind: "error",
					message: messageOf(error)
				};
			}
			ui.reload.disabled = false;
			render();
		};
		const setOpen = (open) => {
			isOpen = open;
			ui.panel.hidden = !open;
			ui.toggle.setAttribute("aria-expanded", String(open));
			if (open) refresh();
		};
		ui.toggle.addEventListener("click", () => setOpen(!isOpen));
		ui.close.addEventListener("click", () => setOpen(false));
		ui.reload.addEventListener("click", () => {
			refresh();
		});
		ui.sortKey.addEventListener("change", () => {
			sort.key = ui.sortKey.value;
			render();
		});
		ui.order.addEventListener("click", () => {
			sort.order = sort.order === "desc" ? "asc" : "desc";
			ui.order.textContent = sort.order === "desc" ? "Newest first" : "Oldest first";
			render();
		});
	}
	function messageOf(error) {
		return error instanceof Error ? error.message : String(error);
	}
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
	function decodeRanges(json) {
		return expectArray(json, "ranges").map((doc, index) => decodeDocRanges(doc, `ranges[${index}]`));
	}
	function decodeDocRanges(value, path) {
		const doc = expectObject(value, path);
		const ranges = expectObject(doc.ranges, `${path}.ranges`);
		const comments = ranges.comments === void 0 ? [] : expectArray(ranges.comments, `${path}.ranges.comments`).map((comment, index) => decodeComment(comment, `${path}.ranges.comments[${index}]`));
		return {
			docId: expectString(doc.id, `${path}.id`),
			comments
		};
	}
	function decodeComment(value, path) {
		const op = expectObject(expectObject(value, path).op, `${path}.op`);
		return {
			threadId: expectString(op.t, `${path}.op.t`),
			highlightedText: expectString(op.c, `${path}.op.c`)
		};
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
	async function loadProjectComments(projectId) {
		const [threads, ranges] = await Promise.all([getJson(`/project/${projectId}/threads`), getJson(`/project/${projectId}/ranges`)]);
		return {
			threads: decodeThreads(threads),
			ranges: decodeRanges(ranges)
		};
	}
	function authorName(user) {
		if (user === void 0) return "Deleted user";
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
		if (name) return name;
		if (user.email) return user.email.split("@")[0];
		return "Unknown";
	}
	function buildEntryList(threads, ranges) {
		const entries = [];
		for (const { docId, comments } of ranges) for (const { threadId, highlightedText } of comments) {
			const thread = threads.get(threadId);
			if (thread === void 0) continue;
			if (thread.resolved) continue;
			entries.push({
				threadId,
				docId,
				highlightedText,
				firstMessage: entryMessage(thread.messages[0]),
				lastMessage: entryMessage(thread.messages.at(-1)),
				replyCount: thread.messages.length - 1
			});
		}
		return {
			entries,
			unanchoredThreadCount: countUnanchoredThreads(threads, ranges)
		};
	}
	function countUnanchoredThreads(threads, ranges) {
		const anchored = new Set(ranges.flatMap(({ comments }) => comments.map(({ threadId }) => threadId)));
		let count = 0;
		for (const [threadId, thread] of threads) if (!thread.resolved && !anchored.has(threadId)) count += 1;
		return count;
	}
	function entryMessage(message) {
		return {
			authorName: authorName(message.user),
			content: message.content,
			timestamp: message.timestamp
		};
	}
	var META_NAME = "ol-otMigrationStage";
	function readOtMigrationStage(doc) {
		const meta = doc.head.querySelector(`meta[name="${META_NAME}"]`);
		if (meta === null || meta.content === "") return void 0;
		return expectNumber(parseJson(meta.content, META_NAME), META_NAME);
	}
	function assertSupportedOtMigrationStage(stage) {
		if (stage !== 1) return;
		throw new Error(`This project is at Overleaf history migration stage ${stage}. Its comment positions are not available from /ranges, so this script does not support it yet.`);
	}
	async function loadEntryList(projectId, doc) {
		assertSupportedOtMigrationStage(readOtMigrationStage(doc));
		const { threads, ranges } = await loadProjectComments(projectId);
		return buildEntryList(threads, ranges);
	}
	var EDITOR_PATH = /^\/project\/([0-9a-f]{24})$/;
	function parseEditorProjectId(pathname) {
		return EDITOR_PATH.exec(pathname)?.[1];
	}
	var panel_default = ":host{all:initial;color:#1f2328;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;line-height:1.4}.toggle,.panel{z-index:1000;position:fixed}.toggle{color:inherit;font:inherit;cursor:pointer;background:#fff;border:1px solid #c7ccd1;border-radius:999px;padding:6px 12px;bottom:16px;right:16px;box-shadow:0 2px 6px #0003}.panel{background:#fff;border:1px solid #c7ccd1;border-radius:8px;flex-direction:column;width:min(420px,40vw);display:flex;top:80px;bottom:64px;right:12px;box-shadow:0 4px 16px #00000040}.panel[hidden]{display:none}.panel-header,.controls{border-bottom:1px solid #e3e6e8;align-items:center;gap:6px;padding:8px 12px;display:flex}.panel-header{justify-content:space-between}.panel-title{margin:0;font-size:14px;font-weight:600}select,button{color:inherit;font:inherit;cursor:pointer;background:#f6f8fa;border:1px solid #c7ccd1;border-radius:4px;padding:2px 8px}button:disabled{cursor:progress;opacity:.6}.body{flex:1;padding:8px 12px;overflow-y:auto}.status,.unanchored-note,.entry-meta,.entry-activity{color:#59636e}.unanchored-note,.entry-meta,.entry-activity{font-size:12px}.error{background:#ffebe9;border:1px solid #d1242f;border-radius:4px;padding:8px}.error-title{margin:0 0 4px;font-weight:600}.error-message{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 4px;font-family:ui-monospace,monospace}.entries{margin:0;padding:0;list-style:none}.entry+.entry{border-top:1px solid #e3e6e8}.entry-link{color:inherit;padding:8px 4px;text-decoration:none;display:block}.entry-link:hover,.entry-link:focus-visible{background:#f6f8fa}.entry-quote,.entry-content{overflow-wrap:anywhere;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.entry-quote{color:#59636e;-webkit-line-clamp:2;border-left:3px solid #bf8700;margin:0 0 4px;padding-left:8px}.entry-content{white-space:pre-wrap;-webkit-line-clamp:3;margin:2px 0}";
	var HOST_ID = "overleaf-comment-filter";
	function mountShadowRoot() {
		const host = document.createElement("div");
		host.id = HOST_ID;
		document.body.append(host);
		const root = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = panel_default;
		root.append(style);
		return root;
	}
	var projectId = parseEditorProjectId(location.pathname);
	if (projectId !== void 0) startApp({
		root: mountShadowRoot(),
		projectId,
		load: () => loadEntryList(projectId, document)
	});
})();
