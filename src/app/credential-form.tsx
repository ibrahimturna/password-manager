import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { PasswordInput } from "@/components/password-input";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import { getLinkedTargets } from "@/features/autofill/autofill-rules";
import { FolderPickerRow, getFolderPickerRows } from "@/features/folders/folder-picker";
import { getFolderById, getFolderPath } from "@/features/folders/folder-tree";
import { useExpandedFolders } from "@/features/folders/expanded-folders-context";
import type { FolderPickerItem } from "@/features/folders/folder-picker";
import {
  useKeptRoute,
  useKeptScroll,
  useKeptState,
} from "@/features/lock/use-kept-state";
import { copyPassword } from "@/features/credentials/copy-password";
import {
  type CredentialFieldErrors,
  MAX_PASSWORD_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_USERNAME_LENGTH,
} from "@/features/credentials/credential-validation";
import { useUndo } from "@/features/undo/undo-context";
import type { Translations } from "@/i18n/en";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// How long the copy button shows a check mark after copying.
const COPIED_FEEDBACK_MS = 2000;
// How long a short message (e.g. "Choose a folder before saving.") stays visible.
const NOTICE_MS = 3000;

// Creates a credential or edits one.
// Opened with `credentialId` to edit, with `folderId` to create inside a folder,
// or with no params (from the "+" menu) to create and pick a folder.
export default function CredentialFormScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ credentialId?: string; folderId?: string }>();
  const {
    folders,
    credentials,
    createCredential,
    updateCredential,
    deleteCredential,
    restoreCredentials,
    autofillLinks,
  } = useVault();
  const { expandWithParents } = useExpandedFolders();
  const { offerUndo } = useUndo();
  useKeptRoute({ pathname: "/credential-form", params });
  const keptScroll = useKeptScroll<FolderPickerItem>("credential-form.scroll");

  // The params only set the starting values. Unknown ids fall back to "new credential".
  const existing = credentials.find((credential) => credential.id === params.credentialId);
  const startFolderId =
    existing?.folderId ??
    (params.folderId !== undefined && getFolderById(folders, params.folderId)
      ? params.folderId
      : null);

  // What the user typed comes back after a lock.
  const [title, setTitle] = useKeptState("credential-form.title", existing?.title ?? "");
  const [username, setUsername] = useKeptState(
    "credential-form.username",
    existing?.username ?? "",
  );
  const [password, setPassword] = useKeptState(
    "credential-form.password",
    existing?.password ?? "",
  );
  const [folderId, setFolderId] = useKeptState<string | null>(
    "credential-form.folderId",
    startFolderId,
  );
  const [errors, setErrors] = useState<CredentialFieldErrors>({});
  const [isCopied, setIsCopied] = useState(false);
  // True after Save was tapped without a folder: the folder hint turns red.
  const [isFolderMissing, setIsFolderMissing] = useState(false);
  // A short message at the bottom of the screen, or null.
  const [notice, setNotice] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const pickerRows = getFolderPickerRows(folders);
  const folderPath =
    folderId === null
      ? null
      : getFolderPath(folders, folderId)
          .map((folder) => folder.name)
          .join(" › ");
  const canSave = folderId !== null;

  // Turns the check mark on the copy button back into the copy icon after a moment.
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  // Hides the message after a few seconds.
  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  async function copy() {
    await copyPassword(password);
    setIsCopied(true);
    AccessibilityInfo.announceForAccessibility(t.credentialForm.copied);
  }

  function selectFolder(id: string) {
    setFolderId(id);
    setIsFolderMissing(false);
    setNotice(null);
  }

  function save() {
    // Save looks disabled without a folder, but still reacts, so it can say what is missing.
    if (folderId === null) {
      setIsFolderMissing(true);
      setNotice(t.credentialForm.folderRequired);
      return;
    }
    const input = { folderId, title, username, password };
    const result =
      existing === undefined ? createCredential(input) : updateCredential(existing.id, input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    // Open the folder (and the ones above it) so the saved credential is visible.
    expandWithParents(folderId);
    router.back();
  }

  function confirmDelete() {
    setIsDeleteDialogOpen(false);
    if (existing === undefined) return;
    const deletion = deleteCredential(existing.id);
    // The Undo bar appears on the home screen, which this form returns to.
    offerUndo(t.deleteCredential.deleted(existing.title), () => restoreCredentials(deletion));
    router.back();
  }

  const header = (
    <View style={styles.form}>
      <Text style={styles.label}>{t.credentialForm.titleLabel}</Text>
      <TextInput
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          setErrors((current) => ({ ...current, title: undefined }));
        }}
        maxLength={MAX_TITLE_LENGTH}
        placeholder={t.credentialForm.titlePlaceholder}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        // Other password managers should not offer to save our (fake) passwords.
        importantForAutofill="no"
        style={styles.input}
        accessibilityLabel={t.credentialForm.titleLabel}
      />
      {errors.title !== undefined && (
        <Text style={styles.error}>{getTitleError(errors.title, t)}</Text>
      )}

      <Text style={styles.label}>{t.credentialForm.username}</Text>
      <TextInput
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setErrors((current) => ({ ...current, username: undefined }));
        }}
        maxLength={MAX_USERNAME_LENGTH}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        style={styles.input}
        accessibilityLabel={t.credentialForm.username}
      />
      {errors.username !== undefined && (
        <Text style={styles.error}>{t.credentialForm.errors.usernameTooLong(MAX_USERNAME_LENGTH)}</Text>
      )}

      <Text style={styles.label}>{t.credentialForm.password}</Text>
      <PasswordInput
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        maxLength={MAX_PASSWORD_LENGTH}
        label={t.credentialForm.password}
        showLabel={t.credentialForm.showPassword}
        hideLabel={t.credentialForm.hidePassword}
      >
        <Pressable
          onPress={copy}
          disabled={password === ""}
          hitSlop={8}
          style={styles.fieldButton}
          accessibilityRole="button"
          accessibilityLabel={t.credentialForm.copyPassword}
        >
          <Icon
            name={isCopied ? "check" : "copy"}
            color={password === "" ? colors.disabledContent : colors.primary}
          />
        </Pressable>
      </PasswordInput>
      {errors.password !== undefined && (
        <Text style={styles.error}>{getPasswordError(errors.password, t)}</Text>
      )}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.credentialForm.cancel}</Text>
        </Pressable>
        {/* Not `disabled`: it only looks disabled, so a tap can still explain what is missing. */}
        <Pressable
          onPress={save}
          style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {t.credentialForm.save}
          </Text>
        </Pressable>
      </View>

      {/* A link needs a saved password to point at, so this appears when editing. */}
      {existing !== undefined && (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/autofill-links", params: { credentialId: existing.id } })
          }
          style={[styles.button, styles.saveButton, styles.linksButton]}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>
            {`${t.autofillLinks.title} (${getLinkedTargets(autofillLinks, existing.id).length})`}
          </Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>{t.credentialForm.folder}</Text>
      {folderPath === null ? (
        <Text style={[styles.folderHint, isFolderMissing && styles.folderHintMissing]}>
          {t.credentialForm.chooseFolderHint}
        </Text>
      ) : (
        <Text style={styles.selection}>{folderPath}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Only an existing password can be deleted, so the header button appears when editing. */}
      <Stack.Screen
        options={{
          headerRight:
            existing === undefined
              ? undefined
              : () => (
                  <Pressable
                    onPress={() => setIsDeleteDialogOpen(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t.credentialForm.delete}
                  >
                    <Icon name="delete" color={colors.error} />
                  </Pressable>
                ),
        }}
      />

      <FlatList
        {...keptScroll}
        data={pickerRows}
        keyExtractor={(row) => row.folder.id}
        ListHeaderComponent={header}
        // Lets a tap on a list row work while the keyboard is open.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        renderItem={({ item }) => (
          <FolderPickerRow
            icon="folder"
            label={item.folder.name}
            depth={item.depth}
            isSelected={folderId === item.folder.id}
            onPress={() => selectFolder(item.folder.id)}
          />
        )}
      />

      {notice !== null && <Snackbar message={notice} bottom={insets.bottom + 16} />}

      <ConfirmDialog
        visible={isDeleteDialogOpen}
        title={t.deleteCredential.title}
        message={t.deleteCredential.message(existing?.title ?? "")}
        cancelLabel={t.deleteCredential.cancel}
        confirmLabel={t.deleteCredential.confirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

// Turn error codes into text for the user, in the current language.
function getTitleError(error: "empty" | "too-long", t: Translations): string {
  return error === "empty"
    ? t.credentialForm.errors.titleEmpty
    : t.credentialForm.errors.titleTooLong(MAX_TITLE_LENGTH);
}

function getPasswordError(error: "empty" | "too-long", t: Translations): string {
  return error === "empty"
    ? t.credentialForm.errors.passwordEmpty
    : t.credentialForm.errors.passwordTooLong(MAX_PASSWORD_LENGTH);
}

function createStyles(colors: Palette) {
  const field = {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    // Material 3 "outlined" text field: same background as the screen, only a border.
    backgroundColor: colors.surface,
  };

  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    sectionTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    // Bold and coloured, so a missing folder is hard to overlook.
    folderHint: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    folderHintMissing: {
      color: colors.error,
    },
    form: {
      gap: 8,
    },
    label: {
      marginTop: 8,
      color: colors.onSurfaceVariant,
    },
    selection: {
      fontSize: 16,
      color: colors.onSurface,
    },
    linksButton: {
      alignItems: "center",
      marginTop: 16,
    },
    input: {
      ...field,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 18,
      color: colors.onSurface,
    },
    fieldButton: {
      padding: 8,
    },
    error: {
      color: colors.error,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 4,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonDisabled: {
      backgroundColor: colors.disabledContainer,
    },
    saveText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
    saveTextDisabled: {
      color: colors.disabledContent,
    },
  });
}
