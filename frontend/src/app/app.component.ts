import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ThemeService } from "./core/services/theme.service";

@Component({
    selector: "app-root",
    standalone: true,
    imports: [RouterOutlet],
    template: `<router-outlet></router-outlet>`,
    styles: [
        `
            :host {
                display: block;
                height: 100%;
            }
        `,
    ],
})
export class AppComponent {
    // Injecting here ensures the theme is applied before first render
    private themeService = inject(ThemeService);
}
