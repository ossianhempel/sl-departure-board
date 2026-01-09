/**
 * Main App Component
 * Sets up routing and theme management
 */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { DisplayMode } from "./components/DisplayMode";
import { SetupPage } from "./components/Setup";
import { useConfig } from "./hooks/useConfig";

// =============================================================================
// App Component
// =============================================================================

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/display" element={<DisplayMode />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  );
}

// =============================================================================
// Theme Provider
// =============================================================================

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useConfig();

  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove("dark", "light");

    if (settings.theme === "system") {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.add(prefersDark ? "dark" : "light");

      // Listen for changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("dark", "light");
        root.classList.add(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Apply selected theme
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  return <>{children}</>;
}

export default App;
