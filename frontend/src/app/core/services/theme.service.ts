import { Injectable } from "@angular/core";

export type Theme = "light" | "dark" | "system";

@Injectable({ providedIn: "root" })
export class ThemeService {
    private current: Theme = "light";
    private mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    constructor() {
        const saved = localStorage.getItem("interv_theme") as Theme | null;
        this.apply(saved || "light");

        // Re-apply when OS preference changes (relevant for 'system' mode)
        this.mediaQuery.addEventListener("change", () => {
            if (this.current === "system") this.applyToDOM();
        });
    }

    get active(): Theme {
        return this.current;
    }

    apply(theme: Theme): void {
        this.current = theme;
        localStorage.setItem("interv_theme", theme);
        this.applyToDOM();
    }

    private applyToDOM(): void {
        const isDark =
            this.current === "dark" ||
            (this.current === "system" && this.mediaQuery.matches);

        document.documentElement.setAttribute(
            "data-theme",
            isDark ? "dark" : "light",
        );
    }
}
