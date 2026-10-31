package expo.modules.passwordautofill

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.InlinePresentation
import android.service.autofill.Presentations
import android.service.autofill.SaveCallback
import android.service.autofill.SaveInfo
import android.service.autofill.SaveRequest
import android.view.autofill.AutofillValue
import android.view.inputmethod.InlineSuggestionsRequest
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import androidx.autofill.inline.UiVersions
import androidx.autofill.inline.v1.InlineSuggestionUi

// Android calls this when a login screen opens in another app. The service never touches the
// vault: it only offers one line. Tapping it opens AutofillActivity, where the user proves who
// they are and the real values are read.
@RequiresApi(Build.VERSION_CODES.O)
class PasswordAutofillService : AutofillService() {
  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    val form = request.fillContexts.lastOrNull()?.structure?.let(::findLoginForm)
    if (form == null || form.packageName == packageName) {
      callback.onSuccess(null)
      return
    }

    val target = getAutofillTarget(this, form.packageName, form.webDomain)
    val title = target?.let { OfferTitles.read(this, it.key) }
    val text = getOfferText(this, title)
    val dataset = createDataset(request, text, title)
    val fieldIds = listOfNotNull(form.usernameId, form.passwordId)
    // Empty for now. The activity returns the real values after the user is verified.
    fieldIds.forEach { id -> dataset.setValue(id, null as AutofillValue?) }
    dataset.setAuthentication(createFillSender(form, target, request.id))

    val response = FillResponse.Builder().addDataset(dataset.build())
    // A remembered login may open as a popup. Android decides, and only with the keyboard closed.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && title != null) {
      response.setFillDialogTriggerIds(*fieldIds.toTypedArray())
      response.setDialogHeader(createOfferView(this, getString(R.string.password_autofill_service_name)))
    }
    // A dataset that fills the form unchanged never asks to save, so filling stays quiet.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && target != null) {
      form.passwordId?.let { passwordId ->
        val saveInfo = SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_PASSWORD, arrayOf(passwordId))
          .setFlags(SaveInfo.FLAG_SAVE_ON_ALL_VIEWS_INVISIBLE)
        form.usernameId?.let { saveInfo.setOptionalIds(arrayOf(it)) }
        response.setSaveInfo(saveInfo.build())
      }
    }
    callback.onSuccess(response.build())
  }

  // Only reached on Android 9 or newer, because older versions never receive a SaveInfo.
  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    // Newest screen first. A login split over two screens has its username on the earlier one.
    val forms = request.fillContexts.asReversed().mapNotNull { findLoginForm(it.structure) }
    val form = forms.firstOrNull { it.hasPassword() }
    val username = forms.firstNotNullOfOrNull { candidate -> candidate.username?.takeIf { it.isNotEmpty() } }
    val target = form?.let { getAutofillTarget(this, it.packageName, it.webDomain) }
    val password = form?.password
    if (target == null || password == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      callback.onSuccess()
      return
    }

    AutofillActivity.setPendingLogin(username, password)
    callback.onSuccess(
      PendingIntent.getActivity(
        this,
        0,
        AutofillActivity.createSaveIntent(this, target),
        PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      ).intentSender,
    )
  }

  private fun LoginForm.hasPassword() = !password.isNullOrEmpty()

  // The offer shows above the keyboard when the keyboard supports it, otherwise as a menu.
  private fun createDataset(request: FillRequest, text: String, title: String?): Dataset.Builder {
    val menu = createOfferView(this, text)
    val inline = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      request.inlineSuggestionsRequest?.let { createInlineOffer(it, title) }
    } else {
      null
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val presentations = Presentations.Builder().setMenuPresentation(menu)
      inline?.let(presentations::setInlinePresentation)
      if (title != null) presentations.setDialogPresentation(createOfferView(this, text))
      return Dataset.Builder(presentations.build())
    }
    val dataset = Dataset.Builder(menu)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) inline?.let(dataset::setInlinePresentation)
    return dataset
  }

  private fun createFillSender(form: LoginForm, target: AutofillTarget?, requestCode: Int) =
    PendingIntent.getActivity(
      this,
      requestCode,
      AutofillActivity.createFillIntent(this, form, target),
      // Android adds details to this intent when it opens the activity, so it must stay mutable.
      PendingIntent.FLAG_CANCEL_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0,
    ).intentSender

  // Null when the keyboard asks for a style this version cannot draw.
  @RequiresApi(Build.VERSION_CODES.R)
  private fun createInlineOffer(request: InlineSuggestionsRequest, title: String?): InlinePresentation? {
    val spec = request.inlinePresentationSpecs.firstOrNull() ?: return null
    if (UiVersions.INLINE_UI_VERSION_1 !in UiVersions.getVersions(spec.style)) return null
    // Android requires this for a long press on the offer. It only points back to this service.
    val attribution = PendingIntent.getService(
      this,
      0,
      Intent(this, PasswordAutofillService::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    // The key and the app's name keep it from looking like a clipboard suggestion.
    val content = InlineSuggestionUi.newContentBuilder(attribution)
      .setStartIcon(Icon.createWithResource(this, R.drawable.password_autofill_key))
      .setTitle(title ?: getString(R.string.password_autofill_inline_title))
      .setSubtitle(getString(R.string.password_autofill_service_name))
      .setContentDescription(getOfferText(this, title))
      .build()
    return InlinePresentation(content.slice, spec, false)
  }
}

fun getOfferText(context: Context, title: String?): String =
  if (title == null) {
    context.getString(R.string.password_autofill_offer)
  } else {
    context.getString(R.string.password_autofill_offer_title, title)
  }

fun createOfferView(context: Context, text: String): RemoteViews =
  RemoteViews(context.packageName, R.layout.password_autofill_item).apply {
    setTextViewText(R.id.password_autofill_text, text)
  }
