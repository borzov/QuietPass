# QuietPass — localization and lifecycle update

The user requested these four concrete changes after testing version 1.0.0. Work stays on `feature/quietpass`; Grok and other agents remain prohibited.

## Scope

1. Close the popup after confirmed successful insertion and native history handling. Keep actionable errors visible when insertion or history handling fails. Verify with a deferred background reply in the DOM test and a failure regression.
2. Keep the containing app as an installation helper, with `LSUIElement=true`, termination after its last window closes, and termination after successfully opening Safari extension settings. The extension and native request handler operate without a resident containing app. Verify the built Info.plist, the app process exiting and continued extension operation.
3. Compare the current toolbar with Wipr and Raycast in a Safari screenshot. Replace the clipped vertical filled key with a regular horizontal symbol fitted in both axes. Verify transparent padding in all four PNG sizes with `swift Tests/Icons/validate-icons.swift`, then compare the installed toolbar again.
4. Localize all product-facing strings in English, Russian, simplified Chinese, German, French and Spanish. English is the fallback. Use Safari `_locales` catalogs and a shared native `.xcstrings` catalog, with locale-aware dates and translator-readable substitutions. Preserve the approved layout and password logic.

## Files

- `Extension/Resources/i18n.js`, `_locales/*/messages.json`: browser localization entry points and six catalogs.
- `Extension/Resources/popup.js`, `popup.html`, `native.js`, `generator.js`, `field.js`, `manifest.json`: translated UI/metadata/errors and close behavior; business logic returns error codes.
- `Shared/Localizable.xcstrings`, `App/ContentView.swift`, `App/QuietPassApp.swift`, `Native/KeychainHistoryRepository.swift`: native strings and helper lifecycle.
- `scripts/generate-icons.swift`, `Extension/Resources/images/toolbar-*.png`: toolbar sizing only; preserve app artwork.
- `project.yml`: helper flag, English development region, folder-preserved `_locales`, shared native catalog. Public version stays 1.0.0 at the user's request; build 3 includes the startup improvement.
- `Tests/Web/popup.test.js`, `i18n.test.js`, `i18n-mock.js`, `Tests/Icons/validate-icons.swift`: close timing, error behavior, six-language rendering, placeholder parity and glyph padding.
- `README.md`: helper lifecycle, supported locales and adding another language.

## Verification order

1. Run the new popup-close regression before implementation; expect `0 !== 1`. Run the icon padding check before regeneration; expect glyphs touching the top/bottom edge. Both failures were observed.
2. Apply the focused behavior/lifecycle/icon changes and confirm popup tests and icon validation pass.
3. Add catalog completeness tests first, then catalogs and localized rendering. Render generator, settings, history and confirmation in all six locales via DOM tests, including partial history failure.
4. Run `npm test`, `QUIETPASS_RUN_KEYCHAIN_TESTS=1 swift test`, icon checks, `xcodegen generate`, and a signed Release build. Verify bundled locale directories and native strings, `LSUIElement`, resource references and code signatures.
5. Replace only the installed QuietPass bundle, preserving preferences and history. Keep one registered extension copy. Confirm container exit and compare the actual toolbar screenshot. No global language/security settings are changed.
6. Inspect the final diff and explicit staged file list, commit task files only, create an updated local archive and deliver links. Full translation proofreading by native speakers can be done during store preparation; no store publication is authorized here.
