import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { inject, provideAppInitializer } from "@angular/core";
import { routes } from "./app/app.routes";
import { AuthService } from "./app/core/auth/auth.service";
import { authInterceptor } from "./app/core/interceptors/auth.interceptor";

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(routes),
        provideAnimations(),
        provideHttpClient(withInterceptors([authInterceptor])),
        // Block app bootstrap until Keycloak init resolves (F16: replaces the
        // deprecated APP_INITIALIZER token).
        provideAppInitializer(() => inject(AuthService).init()),
    ],
}).catch((err) => console.error(err));
