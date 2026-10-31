package expo.modules.passwordautofill

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The bridge between the autofill window and JavaScript.
class PasswordAutofillModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PasswordAutofill")

    Function("isOpen") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && AutofillActivity.current != null
    }

    Function("getRequest") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function null
      val activity = AutofillActivity.current ?: return@Function null
      val key = activity.targetKey
      val label = activity.targetLabel
      val login = if (activity.isSaving) AutofillActivity.pendingLogin else null
      mapOf(
        "target" to if (key != null && label != null) mapOf("key" to key, "label" to label) else null,
        "login" to login?.let { mapOf("username" to it.username, "password" to it.password) },
      )
    }

    Function("setOfferTitles") { titles: Map<String, String> ->
      appContext.reactContext?.let { OfferTitles.replaceAll(it, titles) }
    }

    Function("getWebsiteTarget") { text: String ->
      getWebsiteTarget(text)?.let { mapOf("key" to it.key, "label" to it.label) }
    }

    AsyncFunction("getInstalledApps") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, String>>()
      getInstalledApps(context).map { mapOf("key" to it.key, "label" to it.label) }
    }

    Function("finishFill") { username: String?, password: String ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val activity = AutofillActivity.current
        activity?.runOnUiThread { activity.finishFill(username, password) }
      }
    }

    Function("cancelFill") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val activity = AutofillActivity.current
        activity?.runOnUiThread { activity.finish() }
      }
    }

    // Opens Android's screen for choosing the autofill provider. False if the phone has none.
    Function("openProviderSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val activity = appContext.currentActivity ?: return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
        .setData(Uri.parse("package:${activity.packageName}"))
      if (intent.resolveActivity(activity.packageManager) == null) return@Function false
      activity.startActivity(intent)
      true
    }
  }
}
