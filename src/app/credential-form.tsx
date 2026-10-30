import { router, useLocalSearchParams } from "expo-router";
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

import { Icon } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import { CategoryPickerRow, getCategoryPickerRows } from "@/features/categories/category-picker";
import { getCategoryById, getCategoryPath } from "@/features/categories/category-tree";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { copyPassword } from "@/features/credentials/copy-password";
import {
  type CredentialFieldErrors,
  MAX_PASSWORD_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_USERNAME_LENGTH,
} from "@/features/credentials/credential-validation";
import type { Translations } from "@/i18n/en";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// How long the copy button shows a check mark after copying.
const COPIED_FEEDBACK_MS = 2000;

// Creates a credential or edits one.
// Opened with `credentialId` to edit, with `categoryId` to create inside a category,
// or with no params (from the "+" menu) to create and pick a category.
export default function CredentialFormScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ credentialId?: string; categoryId?: string }>();
  const { categories, credentials, createCredential, updateCredential } = useVault();
  const { expandWithParents } = useExpandedCategories();

  // The params only set the starting values. Unknown ids fall back to "new credential".
  const existing = credentials.find((credential) => credential.id === params.credentialId);
  const startCategoryId =
    existing?.categoryId ??
    (params.categoryId !== undefined && getCategoryById(categories, params.categoryId)
      ? params.categoryId
      : null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState(existing?.password ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(startCategoryId);
  // Always starts hidden; the eye button shows it while editing.
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<CredentialFieldErrors>({});
  const [isCopied, setIsCopied] = useState(false);

  const pickerRows = getCategoryPickerRows(categories);
  const categoryPath =
    categoryId === null
      ? null
      : getCategoryPath(categories, categoryId)
          .map((category) => category.name)
          .join(" › ");
  const canSave = categoryId !== null;

  // Turns the check mark on the copy button back into the copy icon after a moment.
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  async function copy() {
    await copyPassword(password);
    setIsCopied(true);
    AccessibilityInfo.announceForAccessibility(t.credentialForm.copied);
  }

  function save() {
    if (categoryId === null) return;
    const input = { categoryId, title, username, password };
    const result =
      existing === undefined ? createCredential(input) : updateCredential(existing.id, input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    // Open the category (and the ones above it) so the saved credential is visible.
    expandWithParents(categoryId);
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
      {/* The border sits on this wrapper, so the input's own style never changes. */}
      <View style={styles.passwordField}>
        <TextInput
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          secureTextEntry={!isPasswordVisible}
          maxLength={MAX_PASSWORD_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          selectionColor={colors.primary}
          style={styles.passwordInput}
          accessibilityLabel={t.credentialForm.password}
        />
        <Pressable
          onPress={() => setIsPasswordVisible((visible) => !visible)}
          hitSlop={8}
          style={styles.fieldButton}
          accessibilityRole="button"
          accessibilityLabel={
            isPasswordVisible ? t.credentialForm.hidePassword : t.credentialForm.showPassword
          }
        >
          <Icon name={isPasswordVisible ? "hide" : "show"} color={colors.onSurfaceVariant} />
        </Pressable>
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
      </View>
      {errors.password !== undefined && (
        <Text style={styles.error}>{getPasswordError(errors.password, t)}</Text>
      )}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.credentialForm.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {t.credentialForm.save}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>{t.credentialForm.category}</Text>
      <Text style={styles.selection}>{categoryPath ?? t.credentialForm.chooseCategory}</Text>
    </View>
  );

  return (
    <FlatList
      data={pickerRows}
      keyExtractor={(row) => row.category.id}
      ListHeaderComponent={header}
      // Lets a tap on a list row work while the keyboard is open.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      renderItem={({ item }) => (
        <CategoryPickerRow
          icon="folder"
          label={item.category.name}
          depth={item.depth}
          isSelected={categoryId === item.category.id}
          onPress={() => setCategoryId(item.category.id)}
        />
      )}
    />
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
    content: {
      padding: 16,
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
    input: {
      ...field,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 18,
      color: colors.onSurface,
    },
    passwordField: {
      ...field,
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 4,
    },
    passwordInput: {
      flex: 1,
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
