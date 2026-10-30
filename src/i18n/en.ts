// English texts. This file defines the shape every other language must follow.
// Texts that contain a value are functions, so each language can put the value where it fits.
export const en = {
  app: {
    title: "Password Manager",
  },
  home: {
    mockNotice: "Mock data only — do not enter real passwords.",
    collapseAll: "Collapse all",
    newCategoryButton: "New category or rename",
  },
  tree: {
    empty: "Empty",
    noCategories: "No categories yet.",
    actionsFor: (name: string) => `Actions for ${name}`,
    addSubcategory: "Add subcategory",
    rename: "Rename",
    noUsername: "No username",
  },
  categoryForm: {
    title: "Category",
    newCategory: "New category",
    rename: "Rename",
    createInside: "Create inside",
    categoryToRename: "Category to rename",
    topLevel: "Top level",
    chooseCategoryBelow: "Choose a category from the list below",
    name: "Name",
    newName: "New name",
    namePlaceholder: "e.g. Credit Cards",
    cancel: "Cancel",
    save: "Save",
    chooseWhereToCreate: "Choose where to create it",
    chooseCategory: "Choose a category",
    errors: {
      empty: "Name is required.",
      tooLong: (max: number) => `Name can be at most ${max} characters.`,
      duplicate: "A category with this name already exists here.",
    },
  },
  settings: {
    title: "Settings",
    language: "Language",
    theme: "Theme",
    device: "Device",
    light: "Light",
    dark: "Dark",
    notSavedNote: "Settings are not saved yet and reset to “Device” when the app restarts.",
  },
};

// The shape of a full set of texts. Other languages must match it exactly.
export type Translations = typeof en;
