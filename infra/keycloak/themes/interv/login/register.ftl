<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        Create your account
    <#elseif section = "form">
        <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="form-row">
                <div class="field-group">
                    <label class="field-label" for="firstName">First name</label>
                    <input type="text" id="firstName" class="field-input" name="firstName"
                        placeholder="e.g. Amara" value="${(register.formData.firstName!'')}"
                        aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>"/>
                    <#if messagesPerField.existsError('firstName')>
                        <span class="field-error">${kcSanitize(messagesPerField.getFirstError('firstName'))?no_esc}</span>
                    </#if>
                </div>
                <div class="field-group">
                    <label class="field-label" for="lastName">Last name</label>
                    <input type="text" id="lastName" class="field-input" name="lastName"
                        placeholder="e.g. Osei" value="${(register.formData.lastName!'')}"
                        aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>"/>
                    <#if messagesPerField.existsError('lastName')>
                        <span class="field-error">${kcSanitize(messagesPerField.getFirstError('lastName'))?no_esc}</span>
                    </#if>
                </div>
            </div>
            <div class="field-group">
                <label class="field-label" for="email">Email address</label>
                <input type="text" id="email" class="field-input" name="email"
                    placeholder="you@example.com" value="${(register.formData.email!'')}"
                    aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"/>
                <#if messagesPerField.existsError('email')>
                    <span class="field-error">${kcSanitize(messagesPerField.getFirstError('email'))?no_esc}</span>
                </#if>
            </div>
            <div class="field-group">
                <label class="field-label" for="password">Password</label>
                <input type="password" id="password" class="field-input" name="password"
                    placeholder="At least 8 characters"
                    aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"/>
                <#if messagesPerField.existsError('password')>
                    <span class="field-error">${kcSanitize(messagesPerField.getFirstError('password'))?no_esc}</span>
                </#if>
            </div>
            <div class="field-group">
                <label class="field-label" for="password-confirm">Confirm password</label>
                <input type="password" id="password-confirm" class="field-input" name="password-confirm"
                    placeholder="Repeat your password"
                    aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"/>
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="field-error">${kcSanitize(messagesPerField.getFirstError('password-confirm'))?no_esc}</span>
                </#if>
            </div>
            <div class="form-actions">
                <input class="btn-submit" type="submit" value="Create account"/>
            </div>
            <div class="kc-footer">
                Already have an account? <a href="${url.loginUrl}">Sign in</a>
            </div>
        </form>

        <#if social?? && social.providers?has_content>
            <div class="social-divider">or continue with</div>
            <div class="social-buttons">
                <#list social.providers as p>
                    <#if p.alias == "google">
                        <a href="${p.loginUrl}" class="btn-social">
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                        </a>
                    <#elseif p.alias == "linkedin" || p.alias == "linkedin-openid-connect">
                        <a href="${p.loginUrl}" class="btn-social">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077B5">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            Continue with LinkedIn
                        </a>
                    <#elseif p.alias == "github">
                        <a href="${p.loginUrl}" class="btn-social">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1f2328">
                                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                            </svg>
                            Continue with GitHub
                        </a>
                    </#if>
                </#list>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
