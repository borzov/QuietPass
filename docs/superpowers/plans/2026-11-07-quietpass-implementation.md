# QuietPass Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. The user explicitly requires Codex to do all work without Grok or other agents. Track execution in the external QuietPass worklog; no delegation.

**Goal:** A signed, locally runnable macOS app containing the approved Safari password generator, Keychain history and explicit field insertion.

**Architecture:** Manifest V3 popup and background scripts use ES modules without runtime dependencies. A Swift native extension handles profile-scoped Keychain history. A small SwiftUI containing app explains activation and opens Safari extension settings.

**Tech Stack:** JavaScript, Node built-in test runner, Swift/Security/SafariServices/SwiftUI, Swift Package tests, XcodeGen and Xcode 27.2; macOS 15+.

## Files and responsibilities

- `Extension/Resources/generator.js`: validated generation rules, balanced groups and unique batches.
- `Extension/Resources/field.js`: discover one editable field and insert using native setters/events.
- `Extension/Resources/background.js`: extension-only message router and Safari scripting coordinator.
- `Extension/Resources/native.js`: validated client of native history protocol.
- `Extension/Resources/popup.html`, `popup.css`, `popup.js`: approved A interface and actual actions.
- `Extension/Resources/manifest.json`, `images/`: Safari configuration and icons.
- `Native/HistoryStore.swift`: history retention and keychain repository.
- `Native/NativeHandler.swift`: native request validation and Safari context/profile routing.
- `App/QuietPassApp.swift`, `App/ContentView.swift`: containing app activation UI.
- `project.yml`, `App/*.entitlements`, `Extension/*.plist`, `Extension/*.entitlements`: reproducible signing/build configuration.
- `Tests/Web/*.test.js`, `Tests/HistoryTests/*.swift`, `Package.swift`, `package.json`: functional verification.
- `README.md`: build, activation and behavior limitations.

## Task 1 — Generator

- [ ] Add Node tests before source implementation, using this contract:

```js
import { generateBatch, DEFAULT_OPTIONS } from '../../Extension/Resources/generator.js';
const passwords = generateBatch({...DEFAULT_OPTIONS, length:20, hyphen:true});
assert.equal(new Set(passwords).size, 6);
for (const password of passwords) {
  assert.equal(password.length, 20);
  assert.deepEqual(password.split('-').map(s => s.length), [6,6,6]);
}
```

- [ ] Run `npm test`; confirm missing-module failure, then implement exported `validateOptions`, `generatePassword`, `generateBatch` and `DEFAULT_OPTIONS`.
- [ ] Check all 3 levels, lengths 8/20/21/64, both flags, invalid lengths/options, uniqueness and exclusion. Re-run `npm test` and confirm all tests pass.

## Task 2 — Native history and protocol

- [ ] Write Swift tests first for add/list/expiry/change retention/clear/profile isolation and malformed requests. Use an in-memory repository and injected time; use the real repository only in isolated integration checks.
- [ ] Define `HistoryEntry: Codable` with `id`, `password`, `createdAt` (milliseconds since Unix epoch) and `action`; protocol actions: `list`, `record`, `setRetention`, `clear`.
- [ ] Implement generic-password Keychain items scoped by Safari profile. Keep records separate, check Keychain status, prevent cloud synchronization, never log secrets. Return `{ok:true,entries:[...],retentionDays:7}` or `{ok:false,error:"..."}`.
- [ ] Validate password length 8...64, action copy/insert and retention 0/1/7/30/90. Expire records relative to their creation time and selected retention. Native context chooses profile; never accept profile from JavaScript.
- [ ] Run `swift test`; confirm expiry boundary, sorting, isolation and changed retention pass.

## Task 3 — Field insertion

- [ ] Write field behavior tests before source: input/textarea, readonly/disabled, absent field, shadow root, setter/input/change events and changed target. A read-only detection must not mutate the page.
- [ ] Implement a self-contained injectable function with `operation` detect/insert, `password` and per-operation token. Detect in all accessible frames; reject zero or multiple candidates. Insert into the unique selected frame only and re-check the target before mutation.
- [ ] Implement extension-only background routing. Reject messages with sender.tab set before handling history or insertion. Use `browser.scripting.executeScript` with activeTab and fail clearly on denied permissions/restricted pages.
- [ ] Verify via `npm test`, then manual local page tests in Safari after installation. Do not submit forms or add global host permissions.

## Task 4 — Popup and preferences

- [ ] Create popup from approved A: 360 px, standard controls, transparent framed parameters, main password and 5 rows, separate refresh controls, labelled history/settings navigation.
- [ ] Store only validated options in `browser.storage.local`. Load options before first generation; preserve state across internal navigation. Native history is read on history/settings access or after a successful copy/insertion, with expiry handled on access. Opening the generator does not wake the native handler.
- [ ] Wire clipboard and insertion. Record only after successful action, report storage failures separately and never replay the action. History-copy does not record again.
- [ ] Add retention selection and in-window confirmation for clearing/turning off history. Block duplicate actions while requests are pending. Handle missing native host with a readable status and preserve usable generation/copying.
- [ ] Verify theme adaptation, 64-character wrapping, keyboard focus, numeric input validation and actual native errors.

## Task 5 — macOS packaging and signing

- [ ] Create XcodeGen app + Safari web extension targets embedding `Extension/Resources` without inline scripts. Native handler identifier is `com.borzov.QuietPass.Extension`, host is `com.borzov.QuietPass`.
- [ ] Containing app provides enable instructions, status refresh and `SFSafariApplication.showPreferencesForExtension`.
- [ ] Create simple coherent app and toolbar icons with code-native assets. No generated artwork service needed.
- [ ] Run `xcodegen generate`, then `xcodebuild -project QuietPass.xcodeproj -scheme QuietPass -configuration Debug -derivedDataPath <external-build-dir> build` using verified local signing identity. XcodeBuildMCP is absent in this session, so CLI is the fallback.
- [ ] Verify `codesign --verify --deep --strict <app>` and embedded extension. Register the built app locally, launch through computer-use tools and enable the extension in Safari.

## Task 6 — Integration, review, delivery

- [ ] Run Node and Swift tests, signed build and Safari checks on a local fixture with standard fields and a setter-controlled field.
- [ ] Check copying, insertion, new set per opening, options after reopening, Keychain history after reopening, expiry behavior and separate views.
- [ ] Review spec coverage and security boundaries inline (user disallows agents). Fix material findings, then re-run affected checks.
- [ ] Update README with exact build/activation steps and verified limitations. Keep build files, screenshots and worklog outside the source tree.
- [ ] Inspect git diff and staged filenames; commit only explicitly selected project files. Bring the completed feature checkout back to the user's project path without merging unrelated changes. Deliver the app path and concise validation evidence; do not publish.
