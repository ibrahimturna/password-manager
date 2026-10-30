// MOCK DATA — for development only.
// Every value here is fake. Never put real names, usernames or passwords in this file.

import type { Credential, Folder } from "@/types/vault";

// A fixed timestamp keeps the mock data identical on every app start.
const MOCK_TIMESTAMP = Date.UTC(2026, 0, 1);

export const mockFolders: Folder[] = [
  // Top-level folders
  { id: "folder-banks", name: "Banka Hesaplarım", parentId: null },
  { id: "folder-social", name: "Sosyal Medya", parentId: null },
  { id: "folder-internet", name: "İnternet", parentId: null },
  { id: "folder-email", name: "E-posta", parentId: null }, // intentionally empty

  // Nested under "Banka Hesaplarım" → "Yatırım Hesapları" → "Borsa"
  { id: "folder-investments", name: "Yatırım Hesapları", parentId: "folder-banks" },
  { id: "folder-stocks", name: "Borsa", parentId: "folder-investments" },
];

export const mockCredentials: Credential[] = [
  {
    id: "cred-isbank",
    folderId: "folder-banks",
    title: "İş Bankası",
    username: "demo_user",
    password: "fake-password-1",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-garanti",
    folderId: "folder-banks",
    title: "Garanti BBVA",
    username: "demo_user_2",
    password: "fake-password-2",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-broker",
    folderId: "folder-stocks",
    title: "Aracı Kurum",
    username: "demo_investor",
    password: "fake-password-3",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-instagram",
    folderId: "folder-social",
    title: "Instagram",
    username: "demo.insta",
    password: "fake-password-4",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-reddit",
    folderId: "folder-social",
    title: "Reddit",
    username: "demo_redditor",
    password: "fake-password-5",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-home-wifi",
    folderId: "folder-internet",
    title: "Ev Wi-Fi",
    username: null, // password-only entry
    password: "fake-wifi-password",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
