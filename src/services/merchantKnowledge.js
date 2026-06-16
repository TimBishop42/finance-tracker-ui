// Hardcoded merchant classification patterns.
// Entries are tested case-insensitively against the raw business name.
// Custom user rules are checked first and take priority over everything here.

const SUBSCRIPTION_PATTERNS = [
  // Streaming / media
  /netflix/i,
  /spotify/i,
  /apple\.com\/bill|apple one|itunes|icloud/i,
  /disney[\s+]?plus|disney\+/i,
  /\bstan\b/i,
  /\bbinge\b/i,
  /paramount\+|paramount plus/i,
  /amazon prime|prime video/i,
  /youtube premium/i,
  /\baudible\b/i,
  /kindle unlimited/i,
  /\bhbo max\b|max\.com/i,
  /\bpeacock\b/i,
  /\bhulu\b/i,
  /\btidal\b/i,
  /\bdeezer\b/i,
  /soundcloud go/i,

  // Software / productivity / cloud
  /microsoft 365|office 365/i,
  /adobe.*cloud|adobe creative/i,
  /\bdropbox\b/i,
  /google one|google storage|google workspace/i,
  /github copilot|github pro/i,
  /\bnotion\b/i,
  /\b1password\b/i,
  /\blastpass\b/i,
  /\bdashlane\b/i,
  /nordvpn|expressvpn|surfshark|mullvad/i,
  /canva pro/i,
  /\bfigma\b/i,
  /zoom pro|zoom subscription/i,
  /\bmailchimp\b/i,

  // Health / fitness
  /\bheadspace\b/i,
  /\bcalm\b/i,
  /\bstrava\b/i,
  /myfitnesspal/i,

  // Gaming
  /xbox.*game pass|game pass ultimate/i,
  /playstation.*plus|psn plus|ps plus/i,
  /nintendo.*online/i,
  /\bea play\b/i,
  /ubisoft connect/i,

  // News / reading
  /new york times|nytimes/i,
  /the guardian/i,
  /washington post/i,
  /\bmedium\.com\b/i,
  /\bsubstack\b/i,

  // Finance / investment platforms
  /\bpearler\b/i,
  /\bsharesight\b/i,
];

const BILL_PATTERNS = [
  // Housing
  /\brent\b/i,
  /\bmortgage\b/i,
  /\bbody corp\b|\bstrata\b/i,
  /\bcouncil rates?\b|\brates notice\b/i,
  /home insurance|building insurance|contents insurance|landlord insurance/i,

  // Utilities — AU
  /\borigin energy\b/i,
  /\bagl\b/i,
  /energy australia/i,
  /\bsynergy\b/i,
  /\bausgrid\b/i,
  /\bactew\b|\bicon water\b/i,
  /sa power networks/i,
  /water.*corporation|water.*corp/i,
  /\bpowercor\b|\bjemena\b|\bcitipower\b/i,
  /\bunited energy\b/i,

  // Telco — AU
  /\btelstra\b/i,
  /\boptus\b/i,
  /\bvodafone\b/i,
  /\btpg\b/i,
  /\biinet\b/i,
  /\bspintel\b/i,
  /\bnbn\b/i,

  // Insurance (general)
  /\bmedibank\b|\bnib health\b|\bbupa\b|\bahm\b/i,
  /\baami\b|\bgio\b|\bbudget direct\b|\bnrma insurance\b|\bracq\b|\bracv\b/i,
  /\blife insurance\b|\bincome protection\b/i,
  /\bpet insurance\b/i,

  // Childcare / education
  /\bdaycare\b|\bday care\b|\bchildcare\b|\bchild care\b/i,
  /\bkindergarten\b|\bkindy\b|\bnursery\b/i,
  /\bearly learning\b|\bearly childhood\b/i,
  /\bpre.?school\b/i,
  /\bafter school care\b|\boshc\b/i,

  // Loans / finance repayments
  /\bhome loan\b|\bpersonal loan\b/i,
  /\bcar.*repayment\b|\bcar.*loan\b/i,
  /\bcredit card.*payment\b|\bcard repayment\b/i,
  /\bsuperannuation\b|\bsuper.*contribution\b/i,
];

// Merchants that should never appear in recurring lists — noisy everyday spend.
const NOISE_PATTERNS = [
  /\bcoffee\b|\bcafe\b|\bcaffe\b/i,
  /woolworths|coles|aldi|iga|harris farm|foodland|costco|spar/i,
  /mcdonald|hungry jack|\bkfc\b|subway|domino|pizza hut|red rooster|nandos|grill.?d/i,
  /\bpetrol\b|\bservice station\b|\b7.?eleven\b|\bampol\b|\b\bbp\b|\bshell\b|\bcaltex\b|\bz energy\b/i,
  /\bparking\b|\bwilson parking\b|\bsecure parking\b/i,
  /\bbar\b|\bpub\b|\btavern\b|\bbottle.?o\b|\bbws\b|\bdan murphy/i,
];

/**
 * Classify a merchant using the hardcoded knowledge base plus any custom rules.
 *
 * Custom entries take priority over built-in patterns.
 * The merchantPattern field is treated as a regex (case-insensitive).
 *
 * @param {string} merchantName
 * @param {Array<{merchantPattern: string, merchantType: string}>} customMerchants
 * @returns {{ type: 'subscription'|'bill'|'noise'|'unknown', source: 'custom'|'hardcoded'|'algorithm' }}
 */
export function classifyMerchant(merchantName, customMerchants = []) {
  if (!merchantName) return { type: "unknown", source: "algorithm" };

  for (const { merchantPattern, merchantType } of customMerchants) {
    try {
      if (new RegExp(merchantPattern, "i").test(merchantName)) {
        return { type: merchantType, source: "custom" };
      }
    } catch {
      // Silently skip invalid regex entries
    }
  }

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(merchantName))
      return { type: "noise", source: "hardcoded" };
  }

  for (const pattern of SUBSCRIPTION_PATTERNS) {
    if (pattern.test(merchantName))
      return { type: "subscription", source: "hardcoded" };
  }

  for (const pattern of BILL_PATTERNS) {
    if (pattern.test(merchantName))
      return { type: "bill", source: "hardcoded" };
  }

  return { type: "unknown", source: "algorithm" };
}

export const HARDCODED_PATTERN_COUNT =
  SUBSCRIPTION_PATTERNS.length + BILL_PATTERNS.length;
