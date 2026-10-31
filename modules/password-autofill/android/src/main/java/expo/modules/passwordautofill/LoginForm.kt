package expo.modules.passwordautofill

import android.app.assist.AssistStructure
import android.os.Build
import android.text.InputType
import android.view.View
import android.view.autofill.AutofillId
import androidx.annotation.RequiresApi
import java.util.Locale

// What the service found on the screen of the app that asked for autofill.
data class LoginForm(
  val packageName: String,
  val webDomain: String?,
  val usernameId: AutofillId?,
  val passwordId: AutofillId?,
  val username: String?,
  val password: String?,
)

// Looks through a screen for its username and password boxes.
// Returns null when there is nothing to fill, for example on a search box.
@RequiresApi(Build.VERSION_CODES.O)
fun findLoginForm(structure: AssistStructure): LoginForm? {
  var webDomain: String? = null
  var usernameId: AutofillId? = null
  var passwordId: AutofillId? = null
  // A text box just before the password is usually the username, even when it is not marked.
  var lastTextId: AutofillId? = null
  var username: String? = null
  var password: String? = null
  var lastText: String? = null

  fun visit(node: AssistStructure.ViewNode) {
    // Firefox starts with a node whose website is empty, so an empty one is not the answer.
    if (webDomain.isNullOrEmpty()) webDomain = node.webDomain
    val id = node.autofillId
    if (id != null && node.autofillType == View.AUTOFILL_TYPE_TEXT) {
      val text = node.autofillValue?.textValue?.toString()
      when {
        isPasswordBox(node) -> if (passwordId == null) {
          passwordId = id
          password = text
        }
        isUsernameBox(node) -> if (usernameId == null) {
          usernameId = id
          username = text
        }
        else -> if (passwordId == null) {
          lastTextId = id
          lastText = text
        }
      }
    }
    for (index in 0 until node.childCount) visit(node.getChildAt(index))
  }

  for (index in 0 until structure.windowNodeCount) {
    visit(structure.getWindowNodeAt(index).rootViewNode)
  }

  if (usernameId == null && passwordId == null) return null
  return LoginForm(
    packageName = structure.activityComponent.packageName,
    webDomain = webDomain,
    usernameId = usernameId ?: if (passwordId != null) lastTextId else null,
    passwordId = passwordId,
    username = if (usernameId != null) username else lastText,
    password = password,
  )
}

@RequiresApi(Build.VERSION_CODES.O)
private fun isPasswordBox(node: AssistStructure.ViewNode): Boolean {
  if (node.autofillHints?.contains(View.AUTOFILL_HINT_PASSWORD) == true) return true
  if (getHtmlInputType(node) == "password") return true
  val variation = node.inputType and InputType.TYPE_MASK_VARIATION
  return node.inputType and InputType.TYPE_MASK_CLASS == InputType.TYPE_CLASS_TEXT &&
    (
      variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
      )
}

@RequiresApi(Build.VERSION_CODES.O)
private fun isUsernameBox(node: AssistStructure.ViewNode): Boolean {
  val hints = node.autofillHints
  if (
    hints?.contains(View.AUTOFILL_HINT_USERNAME) == true ||
    hints?.contains(View.AUTOFILL_HINT_EMAIL_ADDRESS) == true
  ) {
    return true
  }
  if (getHtmlInputType(node) == "email") return true
  val variation = node.inputType and InputType.TYPE_MASK_VARIATION
  val isEmail = node.inputType and InputType.TYPE_MASK_CLASS == InputType.TYPE_CLASS_TEXT &&
    (
      variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS
      )
  return isEmail || hasUsernameLabel(node)
}

// Many apps mark nothing, so the box's own label is the only clue. This matters on a username
// screen with no password box yet: answering "nothing here" stops Android asking again for the
// boxes already tapped, until the app redraws them.
@RequiresApi(Build.VERSION_CODES.O)
private fun hasUsernameLabel(node: AssistStructure.ViewNode): Boolean {
  val html = node.htmlInfo?.attributes
    ?.filter { it.first in USERNAME_HTML_ATTRIBUTES }
    ?.map { it.second }
    .orEmpty()
  val labels = (listOf(node.hint, node.idEntry, node.contentDescription?.toString()) + html)
    .filterNotNull()
    .map { it.lowercase(Locale.ROOT) }
  return labels.none { it.contains("search") } &&
    labels.any { label -> USERNAME_WORDS.any(label::contains) }
}

private val USERNAME_HTML_ATTRIBUTES = setOf("autocomplete", "id", "name", "placeholder")

// English and Turkish. "kullan" also covers "kullanıcı" written with a plain i.
private val USERNAME_WORDS = listOf("user", "mail", "login", "phone", "kullan", "posta", "telefon")

@RequiresApi(Build.VERSION_CODES.O)
private fun getHtmlInputType(node: AssistStructure.ViewNode): String? {
  val html = node.htmlInfo ?: return null
  if (html.tag != "input") return null
  return html.attributes?.firstOrNull { it.first == "type" }?.second?.lowercase()
}
