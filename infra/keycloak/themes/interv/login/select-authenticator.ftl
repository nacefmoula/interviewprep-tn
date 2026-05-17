<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        How would you like to sign in?
    <#elseif section = "form">

        <p class="select-auth-subtitle">Choose your preferred sign-in method.</p>

        <form action="${url.loginAction}" method="post">
            <div class="auth-options">
                <#list auth.authenticationSelections as authenticationSelection>
                    <button type="submit" class="auth-option-btn" name="authenticationExecution" value="${authenticationSelection.authExecId}">

                        <#if authenticationSelection.iconCssClass == "kcAuthenticatorPasswordClass" || authenticationSelection.displayName == "Username and password" || authenticationSelection.displayName?contains("username-password")>
                            <span class="auth-option-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </span>
                            <span class="auth-option-text">
                                <span class="auth-option-label">Password</span>
                                <span class="auth-option-desc">Sign in with your email and password</span>
                            </span>
                        <#elseif authenticationSelection.iconCssClass == "kcAuthenticatorWebAuthnPasswordlessClass" || authenticationSelection.displayName?lower_case?contains("passkey") || authenticationSelection.displayName?lower_case?contains("webauthn")>
                            <span class="auth-option-icon passkey">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                                </svg>
                            </span>
                            <span class="auth-option-text">
                                <span class="auth-option-label">Passkey</span>
                                <span class="auth-option-desc">Fast, secure passwordless sign-in</span>
                            </span>
                        <#else>
                            <span class="auth-option-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </span>
                            <span class="auth-option-text">
                                <span class="auth-option-label">${authenticationSelection.displayName}</span>
                                <span class="auth-option-desc">${authenticationSelection.helpText!''}</span>
                            </span>
                        </#if>

                        <span class="auth-option-arrow">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </span>
                    </button>
                </#list>
            </div>
        </form>

        <style>
            .select-auth-subtitle {
                color: #64748b;
                font-size: 0.9rem;
                margin: 0 0 24px 0;
                text-align: center;
            }
            .auth-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .auth-option-btn {
                display: flex;
                align-items: center;
                gap: 14px;
                width: 100%;
                padding: 14px 16px;
                border: 1.5px solid #e2e8f0;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                text-align: left;
                transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            }
            .auth-option-btn:hover {
                border-color: #0d9488;
                background: #f0fdfa;
                box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
            }
            .auth-option-icon {
                width: 44px;
                height: 44px;
                border-radius: 10px;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #475569;
                flex-shrink: 0;
            }
            .auth-option-icon.passkey {
                background: #f0fdfa;
                color: #0d9488;
            }
            .auth-option-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
            }
            .auth-option-label {
                font-size: 0.95rem;
                font-weight: 600;
                color: #1e293b;
            }
            .auth-option-desc {
                font-size: 0.8rem;
                color: #94a3b8;
            }
            .auth-option-arrow {
                color: #cbd5e1;
                flex-shrink: 0;
            }
            .auth-option-btn:hover .auth-option-arrow {
                color: #0d9488;
            }
        </style>
    </#if>
</@layout.registrationLayout>
