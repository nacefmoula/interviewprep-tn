package com.microservice.mentorshipservice.emails.templates;

import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
public class SessionReminderEmailTemplate {

    private static final DateTimeFormatter DATE_FORMATTER =
      DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' HH:mm", Locale.ENGLISH);

    public String render(
            String recipientName,
            String otherPartyLabel,
            String otherPartyName,
            OffsetDateTime scheduledAt
    ) {
        String safeRecipientName = esc(recipientName);
        String safeOtherPartyLabel = esc(otherPartyLabel);
        String safeOtherPartyName = esc(otherPartyName);
        String safeDate = scheduledAt == null ? "" : esc(DATE_FORMATTER.format(scheduledAt));

        return """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="utf-8"/>
                  <meta name="viewport" content="width=device-width,initial-scale=1"/>
                  <title>Session Reminder – interV</title>
                </head>
                <body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">

                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                         style="background:#f0f4f8;padding:40px 0;">
                    <tr>
                      <td align="center">

                        <!-- Card -->
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                               style="width:600px;max-width:92%%;border-radius:12px;overflow:hidden;
                                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                          <!-- Header -->
                          <tr>
                            <td style="background:linear-gradient(135deg,#0d9488,#14b8a6);
                                       padding:36px 40px;text-align:center;">
                              <p style="margin:0 0 6px;font-size:26px;font-weight:700;
                                         color:#ffffff;letter-spacing:-0.5px;">interV</p>
                              <p style="margin:0;font-size:13px;color:#ccfbf1;
                                         text-transform:uppercase;letter-spacing:1.5px;">
                                Mentorship Platform
                              </p>
                            </td>
                          </tr>

                          <!-- Body -->
                          <tr>
                            <td style="background:#ffffff;padding:40px 40px 32px;">

                              <!-- Icon -->
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                     style="margin-bottom:28px;">
                                <tr>
                                  <td align="center">
                                    <div style="display:inline-block;background:#f0fdfa;
                                                border:2px solid #99f6e4;border-radius:50%%;
                                                width:64px;height:64px;line-height:64px;
                                                text-align:center;font-size:28px;">
                                      📅
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <!-- Greeting -->
                              <p style="margin:0 0 8px;font-size:22px;font-weight:700;
                                         color:#111827;text-align:center;">
                                Session Reminder
                              </p>
                              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;
                                         text-align:center;">
                                Hi <strong style="color:#111827;">%s</strong>, your session is coming up!
                              </p>

                              <!-- Session card -->
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                     style="background:#f0fdfa;border:1px solid #99f6e4;
                                            border-radius:10px;margin-bottom:28px;">
                                <tr>
                                  <td style="padding:24px 28px;">

                                    <!-- With -->
                                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                           style="margin-bottom:16px;">
                                      <tr>
                                        <td width="20" style="vertical-align:top;padding-top:2px;
                                                              font-size:16px;">👤</td>
                                        <td style="padding-left:12px;">
                                          <p style="margin:0;font-size:12px;color:#6b7280;
                                                     text-transform:uppercase;letter-spacing:1px;
                                                     font-weight:600;">%s</p>
                                          <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                     color:#111827;">%s</p>
                                        </td>
                                      </tr>
                                    </table>

                                    <!-- Divider -->
                                    <hr style="border:none;border-top:1px solid #ccfbf1;margin:0 0 16px;"/>

                                    <!-- Date -->
                                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="20" style="vertical-align:top;padding-top:2px;
                                                              font-size:16px;">🕐</td>
                                        <td style="padding-left:12px;">
                                          <p style="margin:0;font-size:12px;color:#6b7280;
                                                     text-transform:uppercase;letter-spacing:1px;
                                                     font-weight:600;">Scheduled for</p>
                                          <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                     color:#111827;">%s</p>
                                        </td>
                                      </tr>
                                    </table>

                                  </td>
                                </tr>
                              </table>

                              <!-- Tip -->
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                     style="background:#fffbeb;border:1px solid #fde68a;
                                            border-radius:8px;margin-bottom:28px;">
                                <tr>
                                  <td style="padding:14px 18px;">
                                    <p style="margin:0;font-size:13px;color:#92400e;">
                                      💡 <strong>Tip:</strong> Join the session a couple of minutes early
                                      to make sure your audio and video are working properly.
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <!-- Support note -->
                              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                                Questions? Reply to this email and we'll be happy to help.
                              </p>

                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                                       padding:20px 40px;text-align:center;">
                              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
                                © 2026 interV · Mentorship Platform
                              </p>
                              <p style="margin:0;font-size:12px;color:#9ca3af;">
                                You are receiving this email because you have a session scheduled on interV.
                              </p>
                            </td>
                          </tr>

                        </table>
                        <!-- /Card -->

                      </td>
                    </tr>
                  </table>

                </body>
                </html>
                """.formatted(
                safeRecipientName,
                safeOtherPartyLabel,
                safeOtherPartyName,
                safeDate
        );
    }

    private static String esc(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
