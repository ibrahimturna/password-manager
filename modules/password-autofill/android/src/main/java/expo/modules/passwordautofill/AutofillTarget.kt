package expo.modules.passwordautofill

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

// What a login is for. `key` is what links store, `label` is shown to the user.
data class AutofillTarget(
  val key: String,
  val label: String,
)

// Only these apps are trusted to say which website is open. Any other app could claim to be
// showing a bank's page, so it is identified by its own app name instead.
private val BROWSERS = setOf(
  "com.android.chrome",
  "com.brave.browser",
  "com.microsoft.emmx",
  "com.opera.browser",
  "com.sec.android.app.sbrowser",
  "org.mozilla.fenix",
  "org.mozilla.firefox",
  "org.mozilla.firefox_beta",
)

// Null when the login cannot be identified, so nothing should be remembered for it.
fun getAutofillTarget(context: Context, packageName: String, webDomain: String?): AutofillTarget? {
  if (packageName !in BROWSERS) {
    return AutofillTarget("app:$packageName", getAppLabel(context, packageName))
  }
  if (webDomain.isNullOrEmpty()) return null
  val site = getSite(webDomain)
  return AutofillTarget("web:$site", site)
}

// The target for a website the user typed, like "https://www.Example.com/login".
// Null when it is not a website address.
fun getWebsiteTarget(text: String): AutofillTarget? {
  val trimmed = text.trim()
  val url = if ("://" in trimmed) trimmed else "https://$trimmed"
  val host = url.toHttpUrlOrNull()?.host ?: return null
  if ('.' !in host) return null
  val site = getSite(host)
  return AutofillTarget("web:$site", site)
}

// The apps a user can open, for linking one by hand.
fun getInstalledApps(context: Context): List<AutofillTarget> {
  val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
  return context.packageManager.queryIntentActivities(launcher, 0)
    .map { it.activityInfo.packageName }
    .distinct()
    .filter { it != context.packageName }
    .map { AutofillTarget("app:$it", getAppLabel(context, it)) }
    .sortedBy { it.label.lowercase() }
}

// The site a host belongs to, so m.facebook.com and www.facebook.com count as one login.
// OkHttp knows the public suffix list, which keeps a.github.io and b.github.io apart.
private fun getSite(webDomain: String): String {
  val host = webDomain.lowercase().removePrefix("www.")
  val site = runCatching { "https://$host/".toHttpUrlOrNull()?.topPrivateDomain() }.getOrNull()
  return site ?: host
}

// Android hides some apps from others, so this can only be the package name.
private fun getAppLabel(context: Context, packageName: String): String =
  try {
    val manager = context.packageManager
    manager.getApplicationLabel(manager.getApplicationInfo(packageName, 0)).toString()
  } catch (_: PackageManager.NameNotFoundException) {
    packageName
  }
