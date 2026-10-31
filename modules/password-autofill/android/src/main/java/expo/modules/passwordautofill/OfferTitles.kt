package expo.modules.passwordautofill

import android.content.Context

// Password titles for the offer, which appears before the user unlocks anything. The service
// cannot read the vault, so the app keeps this small list outside it, one title per linked login.
object OfferTitles {
  private const val FILE_NAME = "password_autofill_offers"

  fun read(context: Context, targetKey: String): String? =
    context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE).getString(targetKey, null)

  fun replaceAll(context: Context, titles: Map<String, String>) {
    val editor = context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE).edit().clear()
    titles.forEach { (key, title) -> editor.putString(key, title) }
    editor.apply()
  }
}
