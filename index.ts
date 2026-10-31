import "expo-router/entry";

import { AppRegistry } from "react-native";

import { AutofillRoot } from "@/features/autofill/autofill-root";

// The window Android opens from another app's login screen. See AutofillActivity.kt.
AppRegistry.registerComponent("autofill", () => AutofillRoot);
