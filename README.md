# Overleaf Comment Filter

A Tampermonkey userscript for overleaf.com that lists a project's unresolved
comment threads sorted by time, instead of in document order.

- Sort by last activity (newest reply) or by creation time, newest or oldest first.
- Each entry shows the commented text, the first message, the reply count and
  the last reply.
- Click an entry to open the file at that comment. Overleaf reloads the page
  (about 4 seconds) and focuses the comment in its review panel.

The script only reads data. It never resolves, replies to or deletes comments.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in Chrome.
2. Allow it to run userscripts. On Chrome 138 or later, open `chrome://extensions`,
   open Tampermonkey's details and turn on "Allow User Scripts". On older Chrome,
   turn on Developer mode instead.
3. Open
   [overleaf-comment-filter.user.js](https://raw.githubusercontent.com/mei28/overleaf-comment-filter/main/dist/overleaf-comment-filter.user.js)
   and click Install.

Tampermonkey checks `@updateURL` for new versions and updates the script
automatically. To update right away, use "Check for userscript updates" in the
Tampermonkey menu.

## Use

Open a project on overleaf.com and click "Comments" at the bottom right. The
list loads each time the panel opens. Use "Reload" to fetch it again.

## Limitations

- Only unresolved threads are listed.
- File names are not shown. The comment API returns doc ids only.
- Threads whose commented text is no longer in any file cannot be linked to.
  The panel shows how many there are instead of listing them.
- Mentions appear as raw `@[<user id>]` text.
- Projects at Overleaf history migration stage 1 are not supported. Overleaf
  stops serving their comment positions from the API this script reads, and the
  panel says so.

## How it works

The script reads the two endpoints Overleaf's own review panel uses:

- `GET /project/{id}/threads`: messages, timestamps and resolved state
- `GET /project/{id}/ranges`: which doc and text each thread is attached to

Both are internal and undocumented. The script checks every field it reads and
shows a precise error, such as
`threads.<id>.messages[0].timestamp: expected number, got string`, instead of
showing a wrong or empty list.

## Development

Requires Node.js 24, pnpm and [just](https://github.com/casey/just).

```sh
just install    # install dependencies
just test       # run the tests
just check      # lint, type-check, test and build; must pass before a commit
just watch      # rebuild .dev-dist/ on every change
just dist       # build the release files into dist/
```

### Trying changes in the browser

overleaf.com's Content Security Policy blocks scripts loaded from a local dev
server, so the Vite dev server is not used. Load the watched build from disk
instead:

1. Run `just watch`.
2. In `chrome://extensions`, open Tampermonkey's details and turn on
   "Allow access to file URLs".
3. Disable the published script, then add this loader script in Tampermonkey,
   with the path changed to your checkout:

   ```js
   // ==UserScript==
   // @name         Overleaf Comment Filter (dev)
   // @namespace    https://github.com/mei28/overleaf-comment-filter
   // @version      0.0.0
   // @match        https://www.overleaf.com/project/*
   // @grant        none
   // @run-at       document-idle
   // @noframes
   // @require      file:///path/to/overleaf-comment-filter/.dev-dist/overleaf-comment-filter.user.js
   // ==/UserScript==
   ```

4. Reload the Overleaf tab after each rebuild. If Tampermonkey keeps an old copy,
   set Settings → Externals → Update Interval to "Always" (Settings mode
   "Advanced").

### When Overleaf changes its API

1. Note the path in the error the panel shows.
2. Update the synthetic fixtures in `test/fixtures/` to the new shape. Never
   commit real responses: they contain collaborators' names, emails and comments.
3. Run `just test` and watch the decoder tests fail.
4. Fix the decoder in `src/api/`, then run `just check`.
5. Release.

### Release

1. Bump `version` in `package.json`. Tampermonkey only updates when the version
   increases.
2. Run `just check` and `just dist`.
3. Commit `dist/` and push to `main`.

## License

MIT
