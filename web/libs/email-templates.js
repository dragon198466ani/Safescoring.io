import config from "@/config";

const domain = config.domainName;
const appName = config.appName;

// Shared email footer with legal disclaimer + unsubscribe
function emailFooter(unsubscribeUrl) {
  return `
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 11px; color: #888; line-height: 1.5;">
      ${appName} provides informational content based on published security standards and norms.
      Scores reflect our methodology-based evaluation and do not guarantee security, predict future incidents,
      or constitute financial, investment, or security advice.
      <a href="https://${domain}/tos" style="color: #888;">Terms</a> |
      <a href="https://${domain}/privacy-policy" style="color: #888;">Privacy</a>
    </p>
    ${unsubscribeUrl ? `<p style="font-size: 11px; color: #aaa;"><a href="${unsubscribeUrl}" style="color: #aaa;">Unsubscribe</a></p>` : ""}
    <p style="font-size: 10px; color: #ccc;">${appName} &middot; ${domain}<br/>Individual entrepreneur &middot; Paris, France<br/>Contact: legal@safescoring.io</p>
  `;
}

// Email wrapper
function emailWrapper(content, unsubscribeUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${content}
      ${emailFooter(unsubscribeUrl)}
    </body>
    </html>
  `;
}

// J+0: Welcome email (enhanced version for newsletter subscribers)
export function welcomeEmail({ name }) {
  const displayName = name || "there";
  return {
    subject: `Welcome to ${appName}!`,
    text: `Hi ${displayName}, welcome to ${appName}! Explore crypto security scores at https://${domain}/products. Create your first setup at https://${domain}/dashboard/setups.`,
    html: emailWrapper(`
      <h2 style="color: #6366f1;">Welcome to ${appName}!</h2>
      <p>Hi ${displayName},</p>
      <p>You now have access to security evaluations for crypto products — hardware wallets, software wallets, and DeFi protocols — all evaluated with the same SAFE methodology.</p>

      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="font-weight: 600; margin-bottom: 8px;">Get started:</p>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 6px;"><a href="https://${domain}/products" style="color: #6366f1;">Browse all product scores</a></li>
          <li style="margin-bottom: 6px;"><a href="https://${domain}/dashboard/setups" style="color: #6366f1;">Create your first security setup</a></li>
          <li><a href="https://${domain}/compare" style="color: #6366f1;">Compare products side by side</a></li>
        </ul>
      </div>

      <p style="color: #666;">See you on ${appName}!</p>
    `),
  };
}

// J+2: Setup nudge
export function setupNudgeEmail({ name, unsubscribeUrl }) {
  const displayName = name || "there";
  return {
    subject: `Create your first security setup — ${appName}`,
    text: `Hi ${displayName}, have you tried creating a security setup yet? Analyze your crypto stack's weak points at https://${domain}/dashboard/setups.`,
    html: emailWrapper(`
      <h2>Ready to analyze your stack?</h2>
      <p>Hi ${displayName},</p>
      <p>A security setup lets you combine the products you actually use — and spot the weakest link in your crypto stack.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://${domain}/dashboard/setups" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Create Your Setup
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">It takes less than a minute. Select the products you use, and we'll show you your overall security posture.</p>
    `, unsubscribeUrl),
  };
}

// J+5: Compare nudge
export function compareNudgeEmail({ name, unsubscribeUrl }) {
  const displayName = name || "there";
  return {
    subject: `Compare wallets side by side — ${appName}`,
    text: `Hi ${displayName}, wondering which wallet scores better? Compare products head-to-head at https://${domain}/compare.`,
    html: emailWrapper(`
      <h2>Which product is more secure?</h2>
      <p>Hi ${displayName},</p>
      <p>Our comparison tool lets you see exactly how two products differ across Security, Adversity, Fidelity, and Efficiency.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://${domain}/compare" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Compare Products
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">Popular comparisons: Ledger vs Trezor, MetaMask vs Rabby, Aave vs Compound.</p>
    `, unsubscribeUrl),
  };
}

// J-3: Trial ending reminder (California CARL + FTC Negative Option Rule + EU Consumer Rights Directive)
// Sent 3 days before trial converts to paid subscription
export function trialEndingReminderEmail({ name, planName, price, trialEndDate, unsubscribeUrl }) {
  const displayName = name || "there";
  const formattedDate = new Date(trialEndDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return {
    subject: `Your ${appName} trial ends in 3 days`,
    text: `Hi ${displayName}, your ${planName} free trial ends on ${formattedDate}. After that, your subscription will automatically renew at ${price}€/month. To avoid being charged, cancel before ${formattedDate} at https://${domain}/dashboard. No action needed if you'd like to continue.`,
    html: emailWrapper(`
      <h2 style="color: #6366f1;">Your trial ends in 3 days</h2>
      <p>Hi ${displayName},</p>
      <p>Your <strong>${planName}</strong> free trial ends on <strong>${formattedDate}</strong>.</p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">What happens next?</p>
        <p style="margin: 8px 0 0; color: #78350f;">Your subscription will automatically renew at <strong>${price}€/month</strong>. You will be charged on ${formattedDate}.</p>
      </div>

      <p>If you'd like to continue using ${appName} ${planName}, <strong>no action is needed</strong>.</p>

      <p>If you'd like to cancel before being charged:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://${domain}/dashboard" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Manage Your Subscription
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">You can cancel anytime from your dashboard. After cancellation, you'll retain access until the end of your trial period.</p>

      <p style="font-size: 12px; color: #999;">
        This email is required by law (California ARL Business &amp; Professions Code §17602, FTC 16 CFR Part 425).
        You are receiving it because you started a free trial on ${appName}.
      </p>
    `, unsubscribeUrl),
  };
}

// Upgrade nudge (when free limit reached)
export function upgradeNudgeEmail({ name, viewsUsed, viewsLimit, unsubscribeUrl }) {
  const displayName = name || "there";
  return {
    subject: `You've reached your monthly limit — ${appName}`,
    text: `Hi ${displayName}, you've used all ${viewsLimit} free product views this month. Upgrade to Explorer for unlimited access at https://${domain}/#pricing.`,
    html: emailWrapper(`
      <h2>You've reached your monthly limit</h2>
      <p>Hi ${displayName},</p>
      <p>You've viewed <strong>${viewsUsed}/${viewsLimit}</strong> products this month. Your free limit resets next month.</p>

      <p>Want unlimited access? The Explorer plan includes:</p>
      <ul style="padding-left: 20px;">
        <li>Unlimited product comparisons</li>
        <li>5 setup analyses</li>
        <li>Side-by-side product comparison</li>
        <li>Email support</li>
      </ul>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://${domain}/#pricing" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Plans
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">Start with a 14-day free trial. Cancel anytime.</p>
    `, unsubscribeUrl),
  };
}
