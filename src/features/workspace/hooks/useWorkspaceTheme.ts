import { useEffect } from "react";
import { resolveThemeMode } from "../workspaceUtils";
import type { ThemeMode } from "../workspaceTypes";

export function useWorkspaceTheme(themeMode: ThemeMode): void {
  useEffect(() => {
    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveThemeMode(themeMode);
      document.documentElement.dataset.themeMode = themeMode;
      window.localStorage.setItem("flowdesk.themeMode", themeMode);
    };

    applyTheme();
    window.localStorage.removeItem("flowdesk.theme");

    colorSchemeQuery.addEventListener("change", applyTheme);

    return () => colorSchemeQuery.removeEventListener("change", applyTheme);
  }, [themeMode]);
}
