<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        Passkey login
    <#elseif section = "form">

        <div class="passkey-login-container">
            <div class="passkey-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
            </div>
            <p class="passkey-subtitle">Use your device passkey to sign in instantly — no password needed.</p>
        </div>

        <form id="webauth" action="${url.loginAction}" method="post">
            <input type="hidden" id="clientDataJSON" name="clientDataJSON"/>
            <input type="hidden" id="authenticatorData" name="authenticatorData"/>
            <input type="hidden" id="signature" name="signature"/>
            <input type="hidden" id="credentialId" name="credentialId"/>
            <input type="hidden" id="userHandle" name="userHandle"/>
            <input type="hidden" id="error" name="error"/>

            <div class="form-actions" style="margin-top: 8px;">
                <button type="button" id="authenticateWebAuthnButton" class="btn-submit" onclick="doAuthenticate()">
                    Sign in with Passkey
                </button>
            </div>
        </form>

        <#if auth?? && auth.showTryAnotherWayLink()>
            <div class="kc-footer" style="margin-top: 16px;">
                <form action="${url.loginAction}" method="post">
                    <input type="hidden" name="tryAnotherWay" value="on"/>
                    <button type="submit" class="try-another-way">Use a different method</button>
                </form>
            </div>
        </#if>

        <script type="text/javascript">
            function base64url(buffer) {
                const bytes = new Uint8Array(buffer);
                let str = '';
                for (const b of bytes) str += String.fromCharCode(b);
                return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            }

            function base64urlDecode(str) {
                str = str.replace(/-/g, '+').replace(/_/g, '/');
                while (str.length % 4) str += '=';
                const bin = atob(str);
                const buf = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
                return buf.buffer;
            }

            async function doAuthenticate() {
                const btn = document.getElementById('authenticateWebAuthnButton');
                btn.disabled = true;
                btn.textContent = 'Waiting for passkey...';

                <#if challenge??>
                const challenge = base64urlDecode('${challenge}');
                <#else>
                const challenge = window.crypto.getRandomValues(new Uint8Array(32));
                </#if>

                const allowCredentials = [];
                <#if allowedCredentials??>
                    <#list allowedCredentials as c>
                    allowCredentials.push({ id: base64urlDecode('${c.id}'), type: 'public-key' });
                    </#list>
                </#if>

                try {
                    const credential = await navigator.credentials.get({
                        publicKey: {
                            challenge: challenge instanceof ArrayBuffer ? challenge : challenge.buffer,
                            timeout: 60000,
                            userVerification: "required",
                            rpId: window.location.hostname,
                            <#if allowedCredentials?? && allowedCredentials?has_content>
                            allowCredentials: allowCredentials,
                            </#if>
                        }
                    });

                    document.getElementById('credentialId').value = credential.id;
                    document.getElementById('clientDataJSON').value = base64url(credential.response.clientDataJSON);
                    document.getElementById('authenticatorData').value = base64url(credential.response.authenticatorData);
                    document.getElementById('signature').value = base64url(credential.response.signature);
                    if (credential.response.userHandle) {
                        document.getElementById('userHandle').value = base64url(credential.response.userHandle);
                    }
                    document.getElementById('webauth').submit();

                } catch (err) {
                    document.getElementById('error').value = err.message || 'WebAuthn error';
                    btn.disabled = false;
                    btn.textContent = 'Sign in with Passkey';
                    console.error('WebAuthn error:', err);
                }
            }

            // Auto-trigger on page load
            window.addEventListener('load', function() {
                setTimeout(doAuthenticate, 500);
            });
        </script>

        <style>
            .passkey-login-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                margin-bottom: 28px;
            }
            .passkey-icon {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #f0fdfa;
                border: 2px solid #ccfbf1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
            }
            .passkey-subtitle {
                color: #64748b;
                font-size: 0.9rem;
                line-height: 1.5;
                margin: 0;
                max-width: 280px;
            }
            .try-another-way {
                background: none;
                border: none;
                color: #0d9488;
                font-size: 0.9rem;
                cursor: pointer;
                padding: 0;
                text-decoration: underline;
                text-underline-offset: 3px;
            }
            .try-another-way:hover {
                color: #0f766e;
            }
        </style>
    </#if>
</@layout.registrationLayout>
