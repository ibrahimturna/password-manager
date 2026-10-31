package expo.modules.passwordautofill

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.autofill.Dataset
import android.view.WindowManager
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.widget.Toast
import androidx.annotation.RequiresApi
import com.facebook.react.ReactActivity

// A login typed into another app, waiting for the user to approve saving it.
data class PendingLogin(
  val username: String?,
  val password: String,
)

// A second window of the app, drawing the "autofill" React component. It shares the app's
// JavaScript, so unlocking and reading the vault stay in one place instead of being rewritten
// in Kotlin. The window is see-through, so the other app stays visible behind the prompts.
@RequiresApi(Build.VERSION_CODES.O)
class AutofillActivity : ReactActivity() {
  override fun getMainComponentName() = "autofill"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Before the screen exists, so passwords are never captured by screenshots or recents.
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE,
    )
    current = this
    super.onCreate(null)
  }

  override fun onDestroy() {
    if (current === this) {
      current = null
      pendingLogin = null
    }
    super.onDestroy()
  }

  // Sends the values back to Android, which types them into the other app.
  fun finishFill(username: String?, password: String) {
    val usernameId = getId(EXTRA_USERNAME_ID)
    val passwordId = getId(EXTRA_PASSWORD_ID)
    val usernameToFill = username?.takeIf { it.isNotEmpty() }
    // A screen asking only for the username, for a password saved without one. Android refuses
    // an empty dataset with an exception, which would crash the app.
    if (passwordId == null && (usernameId == null || usernameToFill == null)) {
      Toast.makeText(this, R.string.password_autofill_no_username, Toast.LENGTH_LONG).show()
      finish()
      return
    }

    val presentation = createOfferView(this, getOfferText(this, null))
    val dataset = Dataset.Builder(presentation)
    if (usernameId != null && usernameToFill != null) {
      dataset.setValue(usernameId, AutofillValue.forText(usernameToFill))
    }
    if (passwordId != null) {
      dataset.setValue(passwordId, AutofillValue.forText(password))
    }
    setResult(
      Activity.RESULT_OK,
      Intent().putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset.build()),
    )
    finish()
  }

  @Suppress("DEPRECATION") // The replacement needs Android 13.
  private fun getId(name: String): AutofillId? = intent.getParcelableExtra(name)

  companion object {
    private const val EXTRA_TARGET_KEY = "targetKey"
    private const val EXTRA_TARGET_LABEL = "targetLabel"
    private const val EXTRA_USERNAME_ID = "usernameId"
    private const val EXTRA_PASSWORD_ID = "passwordId"
    private const val EXTRA_IS_SAVING = "isSaving"

    // The open window, so the module can reach it from JavaScript.
    var current: AutofillActivity? = null
      private set

    // Kept in memory instead of in the intent, which would pass the password through Android.
    var pendingLogin: PendingLogin? = null
      private set

    fun setPendingLogin(username: String?, password: String) {
      pendingLogin = PendingLogin(username, password)
    }

    fun createFillIntent(context: Context, form: LoginForm, target: AutofillTarget?) =
      createIntent(context, target)
        .putExtra(EXTRA_USERNAME_ID, form.usernameId)
        .putExtra(EXTRA_PASSWORD_ID, form.passwordId)

    fun createSaveIntent(context: Context, target: AutofillTarget) =
      createIntent(context, target).putExtra(EXTRA_IS_SAVING, true)

    private fun createIntent(context: Context, target: AutofillTarget?) =
      Intent(context, AutofillActivity::class.java)
        .putExtra(EXTRA_TARGET_KEY, target?.key)
        .putExtra(EXTRA_TARGET_LABEL, target?.label)
  }

  val targetKey: String?
    get() = intent.getStringExtra(EXTRA_TARGET_KEY)

  val targetLabel: String?
    get() = intent.getStringExtra(EXTRA_TARGET_LABEL)

  val isSaving: Boolean
    get() = intent.getBooleanExtra(EXTRA_IS_SAVING, false)
}
