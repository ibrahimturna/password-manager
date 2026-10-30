import type { Translations } from "./en";

// Turkish texts. The `Translations` type makes TypeScript report any missing or extra text.
export const tr: Translations = {
  app: {
    title: "Şifre Yöneticisi",
  },
  home: {
    mockNotice: "Yalnızca örnek veri — gerçek şifre girmeyin.",
    collapseAll: "Tümünü daralt",
    newCategoryButton: "Yeni kategori veya yeniden adlandır",
  },
  tree: {
    empty: "Boş",
    noCategories: "Henüz kategori yok.",
    actionsFor: (name: string) => `${name} için işlemler`,
    addSubcategory: "Alt kategori ekle",
    rename: "Yeniden adlandır",
    delete: "Sil",
    noUsername: "Kullanıcı adı yok",
  },
  deleteCategory: {
    title: "Kategoriyi sil",
    willDelete: "Şunlar silinecek:",
    cancel: "İptal",
    confirm: "Sil",
    deleted: (name: string) => `“${name}” silindi`,
    undo: "Geri al",
  },
  categoryForm: {
    title: "Kategori",
    newCategory: "Yeni kategori",
    rename: "Yeniden adlandır",
    createInside: "Oluşturulacağı yer",
    categoryToRename: "Yeniden adlandırılacak kategori",
    topLevel: "Ana kategori",
    chooseCategoryBelow: "Aşağıdaki listeden bir kategori seçin",
    name: "Ad",
    newName: "Yeni ad",
    namePlaceholder: "ör. Kredi Kartları",
    chooseCategoryFirst: "Önce bir kategori seçin",
    cancel: "İptal",
    save: "Kaydet",
    chooseWhereToCreate: "Nerede oluşturulacağını seçin",
    chooseCategory: "Bir kategori seçin",
    errors: {
      empty: "Ad gerekli.",
      tooLong: (max: number) => `Ad en fazla ${max} karakter olabilir.`,
      duplicate: "Burada bu adda bir kategori zaten var.",
    },
  },
  settings: {
    title: "Ayarlar",
    language: "Dil",
    theme: "Tema",
    device: "Cihaz",
    light: "Açık",
    dark: "Koyu",
    notSavedNote:
      "Ayarlar henüz kaydedilmiyor; uygulama yeniden başlatıldığında “Cihaz” seçeneğine döner.",
  },
};
