# QuietPass 1.0.0 — App Store preparation

**Goal:** Prepare the existing Safari generator for Mac App Store distribution, retaining public version 1.0.0 and the approved interface. Free download; RUS, USA, GBR, CHN, DEU, FRA and ESP; support email max.borzov@me.com.

**Architecture:** Keep the existing WebExtension and native history handler. Add localized external links using the published GitHub Pages site, a truthful privacy manifest and original application artwork. Prepare canonical store metadata and private archive/export artifacts separately. Execute inline without Grok or other agents.

## Changes and checks

- [x] Extend the six-locale popup checks to cover actual privacy/support URLs and external-tab opening. Run the regression before adding links.
- [x] Add localized Privacy Policy and Support links to popup settings and the native setup window. Resolve unsupported website languages to English. Opening a link must not read or modify password history.
- [x] Include `PrivacyInfo.xcprivacy` describing no tracking/collection and the handler's own UserDefaults access (`CA92.1`). Validate the plist and inclusion in built resources; distinguish this manifest from the public privacy policy.
- [x] Replace app/branding artwork generated from `key.fill` with an original geometric Q monogram in the existing teal palette. Keep the corrected horizontal toolbar key as a standard interface symbol. Inspect rendered PNGs and run the existing glyph-padding check.
- [x] Retain `MARKETING_VERSION=1.0.0`, advance the internal build to 4, and leave existing development signing usable. Archive using `asc xcode archive` for generic macOS, then attempt an App Store Connect PKG export using the existing signing account. Keep artifacts outside the public repository.
- [x] Prepare six canonical `metadata/app-info/<locale>.json` and `metadata/version/1.0.0/<locale>.json` files, reviewer notes and exact release settings. Validate with `asc metadata validate --check-urls`. Pull existing remote metadata first if an existing app record becomes accessible.
- [x] Check App Store Connect through the existing browser/Xcode account. The browser currently requires sign-in; the user was asked to complete it while local preparation continues. No new API credentials are created implicitly.
- [x] Run `npm test`, `QUIETPASS_RUN_KEYCHAIN_TESTS=1 swift test`, signed build/archive checks and resource validation. Check external links in the installed app and preserve startup without native-history access.
- [x] Prepare actual-interface Mac screenshots after final UI verification. Keep unreviewed screenshot candidates outside the repository until their content and accepted dimensions are verified.
- [x] Review the exact diff and staged files, commit task files, and push the prepared code/materials to the authorized public repository. Record any account/signing gates with exact evidence in the external worklog.

The user authorized preparation, not final submission or release. Before any App Store submission, validate the attached intended build and review the concrete metadata/assets. Do not accept account agreements, invent missing identity/contact information or mark unavailable remote checks as passed.
