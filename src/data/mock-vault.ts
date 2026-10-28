// MOCK DATA — for development only.
// Every value here is fake. Never put real names, usernames or passwords in this file.

import type { Category, Credential } from "@/types/vault";

// A fixed timestamp keeps the mock data identical on every app start.
const MOCK_TIMESTAMP = Date.UTC(2026, 0, 1);

export const mockCategories: Category[] = [
  // Top-level categories
  { id: "cat-banks", name: "Banka Hesaplarım", parentId: null },
  { id: "cat-social", name: "Sosyal Medya", parentId: null },
  { id: "cat-internet", name: "İnternet", parentId: null },
  { id: "cat-email", name: "E-posta", parentId: null }, // intentionally empty

  // Nested under "Banka Hesaplarım" → "Yatırım Hesapları" → "Borsa"
  { id: "cat-investments", name: "Yatırım Hesapları", parentId: "cat-banks" },
  { id: "cat-stocks", name: "Borsa", parentId: "cat-investments" },
];

export const mockCredentials: Credential[] = [
  {
    id: "cred-isbank",
    categoryId: "cat-banks",
    title: "İş Bankası",
    username: "demo_user",
    password: "fake-password-1",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-garanti",
    categoryId: "cat-banks",
    title: "Garanti BBVA",
    username: "demo_user_2",
    password: "fake-password-2",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-broker",
    categoryId: "cat-stocks",
    title: "Aracı Kurum",
    username: "demo_investor",
    password: "fake-password-3",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-instagram",
    categoryId: "cat-social",
    title: "Instagram",
    username: "demo.insta",
    password: "fake-password-4",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-reddit",
    categoryId: "cat-social",
    title: "Reddit",
    username: "demo_redditor",
    password: "fake-password-5",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
  {
    id: "cred-home-wifi",
    categoryId: "cat-internet",
    title: "Ev Wi-Fi",
    username: null, // password-only entry
    password: "fake-wifi-password",
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  },
];
