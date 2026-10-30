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
    noUsername: "Kullanıcı adı yok",
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
