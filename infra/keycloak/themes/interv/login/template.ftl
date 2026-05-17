<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>interV</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'DM Sans', sans-serif;
            background: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
        }
        body::before {
            content: '';
            position: fixed;
            width: 700px; height: 700px;
            background: radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%);
            top: -250px; right: -250px;
            pointer-events: none;
        }
        .kc-page { width: 100%; max-width: 480px; position: relative; z-index: 1; }
        .kc-logo {
            display: flex; align-items: center; gap: 0.625rem;
            margin-bottom: 1.75rem; justify-content: center; text-decoration: none;
        }
        .kc-logo-icon {
            width: 38px; height: 38px; border-radius: 10px;
            background: linear-gradient(135deg, #14b8a6, #22d3ee);
            display: flex; align-items: center; justify-content: center;
            color: white; font-family: 'Fraunces', serif;
            font-weight: 700; font-style: italic; font-size: 1.15rem;
            box-shadow: 0 4px 14px rgba(20,184,166,0.3);
        }
        .kc-logo-text { font-family: 'Fraunces', serif; font-size: 1.35rem; font-weight: 400; color: #1e293b; }
        .kc-logo-text strong { font-weight: 700; color: #0d9488; }
        .kc-card {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
            padding: 2.5rem; box-shadow: 0 4px 24px rgba(15,23,42,0.06);
        }
        .kc-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.375rem; }
        .kc-subtitle { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; }
        .kc-alert {
            display: flex; align-items: flex-start; gap: 0.625rem;
            background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
            padding: 0.875rem 1rem; color: #dc2626; font-size: 0.875rem; margin-bottom: 1.5rem;
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field-group { margin-bottom: 1.25rem; }
        .field-label { display: block; font-size: 0.8125rem; font-weight: 500; color: #334155; margin-bottom: 0.4rem; }
        .field-input {
            width: 100%; padding: 0.6875rem 0.875rem;
            background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px;
            color: #0f172a; font-size: 0.875rem; font-family: 'DM Sans', sans-serif;
            outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus { border-color: #14b8a6; background: #fff; box-shadow: 0 0 0 3px rgba(20,184,166,0.12); }
        .field-input::placeholder { color: #94a3b8; }
        .field-error { display: block; font-size: 0.75rem; color: #dc2626; margin-top: 0.3rem; }
        .form-actions { margin-top: 1.75rem; }
        .btn-submit {
            width: 100%; padding: 0.8125rem 1.5rem;
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
            border: none; border-radius: 8px; color: #ffffff;
            font-size: 0.9375rem; font-weight: 600; font-family: 'DM Sans', sans-serif;
            cursor: pointer; transition: opacity 0.15s, transform 0.15s;
            box-shadow: 0 4px 14px rgba(20,184,166,0.3);
        }
        .btn-submit:hover { opacity: 0.92; transform: translateY(-1px); }
        .kc-footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #94a3b8; }
        .kc-footer a { color: #0d9488; text-decoration: none; font-weight: 500; }
        .kc-footer a:hover { text-decoration: underline; }
        @media (max-width: 520px) {
            .kc-card { padding: 1.75rem 1.5rem; }
            .form-row { grid-template-columns: 1fr; }
        }
        .field-label-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.4rem;
        }

        .field-label-row .field-label {
            margin-bottom: 0;
        }

        .forgot-link {
            font-size: 0.8125rem;
            color: #0d9488;
            text-decoration: none;
            font-weight: 500;
        }

        .forgot-link:hover { text-decoration: underline; }

        .remember-me {
            margin-top: 0.75rem;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            cursor: pointer;
            font-size: 0.875rem;
            color: #475569;
            user-select: none;
        }

        .checkbox-label input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #14b8a6;
            cursor: pointer;
        }

        /* ── Social login ── */
        .social-divider {
            display: flex; align-items: center; gap: 0.75rem;
            margin: 1.5rem 0; color: #94a3b8; font-size: 0.8125rem;
        }
        .social-divider::before,
        .social-divider::after {
            content: ''; flex: 1;
            height: 1px; background: #e2e8f0;
        }
        .social-buttons { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-social {
            display: flex; align-items: center; gap: 0.75rem;
            width: 100%; padding: 0.6875rem 1rem;
            background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px;
            color: #334155; font-size: 0.875rem; font-weight: 500;
            font-family: 'DM Sans', sans-serif;
            cursor: pointer; text-decoration: none;
            transition: background 0.15s, border-color 0.15s;
        }
        .btn-social:hover { background: #ffffff; border-color: #14b8a6; }
        .btn-social svg { flex-shrink: 0; }
    </style>
</head>
<body>
<div class="kc-page">
    <a class="kc-logo" href="#">
        <div class="kc-logo-icon">i</div>
        <span class="kc-logo-text">inter<strong>V</strong></span>
    </a>
    <div class="kc-card">
        <div class="kc-title"><#nested "header"></div>
        <div class="kc-subtitle">Your AI-powered interview preparation platform.</div>
        <#if displayMessage && message?has_content>
            <div class="kc-alert">
                <span>&#9888;</span>
                <span>${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>
        <#nested "form">
        <#if displayInfo><#nested "info"></#if>
    </div>
</div>
</body>
</html>
</#macro>
