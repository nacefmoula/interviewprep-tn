<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        Set up your passkey
    <#elseif section = "form">

        <div class="passkey-register-container">
            <div class="passkey-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
            </div>
            <p class="passkey-subtitle">
                Sign in instantly on this device with your fingerprint, face, or
                device PIN — no password needed.
            </p>

            <ul class="passkey-bullets">
                <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span>More secure than passwords — can't be phished</span>
                </li>
                <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span>Stays on your device — never leaves it</span>
                </li>
                <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span>Faster sign-in on your next visit</span>
                </li>
            </ul>
        </div>

        <form id="register" action="${url.loginAction}" method="post">
            <input type="hidden" id="clientDataJSON"        name="clientDataJSON"/>
            <input type="hidden" id="attestationObject"     name="attestationObject"/>
            <input type="hidden" id="publicKeyCredentialId" name="publicKeyCredentialId"/>
            <input type="hidden" id="authenticatorLabel"    name="authenticatorLabel"/>
            <input type="hidden" id="transports"            name="transports"/>
            <input type="hidden" id="error"                 name="error"/>

            <#if isSetRetry?? && isSetRetry>
                <input type="hidden" id="isSetRetry" name="isSetRetry" value="true"/>
            </#if>

            <div class="checkbox-label remember-me passkey-logout-row">
                <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked/>
                <label for="logout-sessions">Sign out from other devices</label>
            </div>

            <div class="passkey-actions">
                <button type="button" id="registerButton" class="btn-submit" onclick="doRegister()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                    <span id="registerLabel">Register passkey</span>
                </button>

                <button type="submit" name="cancel-aia" value="true" class="btn-cancel">
                    Cancel
                </button>
            </div>
        </form>

        <script type="text/javascript">
            function base64url(buffer) {
                const bytes = new Uint8Array(buffer);
                let str = '';
                for (const b of bytes) str += String.fromCharCode(b);
                return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            }
            function base64urlDecode(str) {
                str = (str || '').replace(/-/g, '+').replace(/_/g, '/');
                while (str.length % 4) str += '=';
                const bin = atob(str);
                const buf = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
                return buf.buffer;
            }

            // Watchdog so a silently-hung create() can't trap the user forever.
            let registerWatchdog = null;
            function resetRegisterButton(message) {
                const btn = document.getElementById('registerButton');
                const label = document.getElementById('registerLabel');
                if (btn) btn.disabled = false;
                if (label) label.textContent = 'Register passkey';
                if (message) {
                    const alertBox = document.getElementById('passkey-error');
                    if (alertBox) {
                        alertBox.querySelector('span:last-child').textContent = message;
                        alertBox.style.display = 'flex';
                    }
                }
            }

            async function doRegister() {
                const btn = document.getElementById('registerButton');
                const label = document.getElementById('registerLabel');
                btn.disabled = true;
                label.textContent = 'Waiting for device…';
                const alertBox = document.getElementById('passkey-error');
                if (alertBox) alertBox.style.display = 'none';

                <#if challenge??>
                const challenge = base64urlDecode('${challenge?js_string}');
                <#else>
                const challenge = window.crypto.getRandomValues(new Uint8Array(32)).buffer;
                </#if>

                <#if userid??>
                const userId = base64urlDecode('${userid?js_string}');
                <#else>
                const userId = window.crypto.getRandomValues(new Uint8Array(16)).buffer;
                </#if>

                // Algorithm IDs from Keycloak's policy (if any), then ensure
                // ES256 (-7) and RS256 (-257) are included as defaults — Chrome
                // warns and some authenticators reject registration without them.
                const pubKeyCredParams = [];
                const seenAlgs = new Set();
                <#if signatureAlgorithms??>
                    <#list signatureAlgorithms as alg>
                    if (!seenAlgs.has(${alg})) {
                        pubKeyCredParams.push({ type: 'public-key', alg: ${alg} });
                        seenAlgs.add(${alg});
                    }
                    </#list>
                </#if>
                if (!seenAlgs.has(-7))   { pubKeyCredParams.push({ type: 'public-key', alg: -7 }); }
                if (!seenAlgs.has(-257)) { pubKeyCredParams.push({ type: 'public-key', alg: -257 }); }

                const excludeCredentials = [];
                <#if excludeCredentialIds?? && excludeCredentialIds?has_content>
                    <#list excludeCredentialIds?split(",") as cid>
                    excludeCredentials.push({
                        id: base64urlDecode('${cid?trim}'),
                        type: 'public-key'
                    });
                    </#list>
                </#if>

                // Keycloak sometimes passes booleans as strings ("Yes"/"No"/"true"/"false")
                // and policy values as "not specified" — normalize before handing to the WebAuthn API.
                const toBool = function (v) {
                    if (v === undefined || v === null) return false;
                    const s = String(v).trim().toLowerCase();
                    return s === 'yes' || s === 'true' || s === '1';
                };
                const cleanPolicy = function (v) {
                    if (v === undefined || v === null) return '';
                    const s = String(v).trim();
                    if (!s || s.toLowerCase() === 'not specified') return '';
                    return s;
                };

                const userVerification = cleanPolicy('<#if userVerificationRequirement??>${userVerificationRequirement}</#if>') || 'preferred';
                const authenticatorAttachment = cleanPolicy('<#if authenticatorAttachment??>${authenticatorAttachment}</#if>');
                const attestation = cleanPolicy('<#if attestationConveyancePreference??>${attestationConveyancePreference}</#if>') || 'none';
                const residentKey = toBool('<#if requireResidentKey??>${requireResidentKey}</#if>');

                const authenticatorSelection = { userVerification: userVerification };
                if (authenticatorAttachment) {
                    authenticatorSelection.authenticatorAttachment = authenticatorAttachment;
                }
                if (residentKey) {
                    authenticatorSelection.requireResidentKey = true;
                    authenticatorSelection.residentKey = 'required';
                }

                // Keycloak passes timeout in seconds; 0 means "use server default" but Chrome
                // can interpret 0 as "never resolve" — so fall back to 60 s.
                <#if createTimeout??>
                let createTimeoutMs = ${createTimeout} * 1000;
                <#else>
                let createTimeoutMs = 60000;
                </#if>
                if (!createTimeoutMs || createTimeoutMs < 1000) createTimeoutMs = 60000;

                const publicKey = {
                    challenge: challenge,
                    rp: {
                        name: '<#if rpEntityName??>${rpEntityName?js_string}<#else>interV</#if>',
                        <#if rpId?? && rpId?has_content>id: '${rpId?js_string}',</#if>
                    },
                    user: {
                        id: userId,
                        name: '<#if username??>${username?js_string}<#else>user</#if>',
                        displayName: '<#if username??>${username?js_string}<#else>user</#if>',
                    },
                    pubKeyCredParams: pubKeyCredParams,
                    timeout: createTimeoutMs,
                    attestation: attestation,
                    authenticatorSelection: authenticatorSelection,
                    excludeCredentials: excludeCredentials,
                };

                // Help future debugging if this hangs in another env.
                console.log('[passkey] navigator.credentials.create() with', publicKey);

                // Hard JS-side watchdog: if the call hasn't resolved/rejected in
                // (timeout + 5 s), reset the UI so the user can retry instead of
                // staring at "Waiting for device…" forever.
                clearTimeout(registerWatchdog);
                registerWatchdog = setTimeout(function () {
                    resetRegisterButton('Your device didn\'t respond. Please try again.');
                }, createTimeoutMs + 5000);

                try {
                    const credential = await navigator.credentials.create({ publicKey });
                    clearTimeout(registerWatchdog);

                    const transports = (credential.response.getTransports && credential.response.getTransports()) || [];

                    document.getElementById('clientDataJSON').value        = base64url(credential.response.clientDataJSON);
                    document.getElementById('attestationObject').value     = base64url(credential.response.attestationObject);
                    document.getElementById('publicKeyCredentialId').value = credential.id;
                    document.getElementById('authenticatorLabel').value    = (navigator.userAgentData?.platform || navigator.platform || 'Device') + ' passkey';
                    document.getElementById('transports').value            = transports.join(',');

                    document.getElementById('register').submit();

                } catch (err) {
                    clearTimeout(registerWatchdog);
                    console.error('WebAuthn registration error:', err);
                    document.getElementById('error').value = err && err.message ? err.message : 'WebAuthn error';
                    resetRegisterButton(err && err.message ? err.message : 'Could not create passkey. Please try again.');
                }
            }
        </script>

        <div id="passkey-error" class="kc-alert" style="display:none; margin-top: 16px;">
            <span>&#9888;</span>
            <span>Could not create passkey.</span>
        </div>

        <style>
            .passkey-register-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                margin-bottom: 24px;
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
                margin: 0 0 18px;
                max-width: 320px;
            }
            .passkey-bullets {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
                max-width: 360px;
                text-align: left;
            }
            .passkey-bullets li {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.85rem;
                color: #475569;
            }
            .passkey-logout-row {
                margin-top: 4px;
                margin-bottom: 14px;
            }
            .passkey-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 8px;
            }
            .btn-cancel {
                width: 100%;
                padding: 0.75rem 1.5rem;
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-radius: 8px;
                color: #475569;
                font-size: 0.9375rem;
                font-weight: 500;
                font-family: 'DM Sans', sans-serif;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s, color 0.15s;
            }
            .btn-cancel:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                color: #0f172a;
            }
        </style>
    </#if>
</@layout.registrationLayout>
