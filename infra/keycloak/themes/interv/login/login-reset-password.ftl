<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        Reset your password
    <#elseif section = "form">
        <p style="font-size:0.875rem; color:#64748b; margin-bottom:1.5rem; line-height:1.6;">
            Enter your email address and we will send you a link to reset your password.
        </p>
        <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
            <div class="field-group">
                <label for="username" class="field-label">Email address</label>
                <input tabindex="1" id="username" class="field-input" name="username"
                    placeholder="you@example.com"
                    value="${(auth.attemptedUsername!'')}" type="text" autofocus autocomplete="off"/>
                <#if messagesPerField.existsError('username')>
                    <span class="field-error">${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}</span>
                </#if>
            </div>
            <div class="form-actions">
                <input tabindex="4" class="btn-submit" name="login" id="kc-login" type="submit" value="Send reset link"/>
            </div>
            <div class="kc-footer">
                <a href="${url.loginUrl}">Back to Sign in</a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
