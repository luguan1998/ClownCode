// Build-time globals injected by scripts/build.ts `define` replacements.
// MACRO.VERSION / DISPLAY_VERSION / BUILD_TIME / ISSUES_EXPLAINER /
// PACKAGE_URL / NATIVE_PACKAGE_URL are replaced with literals at bundle time.
declare const MACRO: {
  VERSION: string
  DISPLAY_VERSION: string
  BUILD_TIME: string
  ISSUES_EXPLAINER: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string | undefined
  [key: string]: string | undefined
}
