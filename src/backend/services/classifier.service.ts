/**
 * Asset sub-type classifier — runs at ingest time to bucket every Asset into
 * a Groww-style category (largeCap / midCap / smallCap for stocks; fund-category
 * for MFs). The buckets feed the For You filter chips and the recommender.
 *
 * Equity classification: index-membership lookup against publicly known
 * Nifty 50 / Nifty Next 50 / Nifty Midcap 100 / Nifty Smallcap 100 constituents.
 * Anything else is left null (the UI shows it as "Other" and excludes it from
 * the cap-based filters).
 *
 * MF classification: regex on the AMFI scheme name + AMFI category bucket.
 * AMFI's bucketing is good enough for debt / hybrid / index / gold; we do the
 * cap-bucket parsing ourselves because AMFI groups everything as "Equity Scheme".
 */

export type EquitySubType = "largeCap" | "midCap" | "smallCap";
export type MfSubType =
  | "largeCapFund"
  | "midCapFund"
  | "smallCapFund"
  | "flexiCap"
  | "multiCap"
  | "elss"
  | "indexFund"
  | "debtFund"
  | "liquidFund"
  | "hybrid"
  | "gold"
  | "international"
  | "sector";

export type AssetSubType = EquitySubType | MfSubType;

// ── Equity index membership ────────────────────────────────────────────────
// Nifty 50 (large-cap proxy). NSE symbol notation (no .NS suffix).
const NIFTY_50 = new Set<string>([
  "ADANIENT","ADANIPORTS","APOLLOHOSP","ASIANPAINT","AXISBANK","BAJAJ-AUTO","BAJFINANCE","BAJAJFINSV",
  "BPCL","BHARTIARTL","BRITANNIA","CIPLA","COALINDIA","DIVISLAB","DRREDDY","EICHERMOT","GRASIM",
  "HCLTECH","HDFCBANK","HDFCLIFE","HEROMOTOCO","HINDALCO","HINDUNILVR","ICICIBANK","ITC","INDUSINDBK",
  "INFY","JSWSTEEL","KOTAKBANK","LT","LTIM","M&M","MARUTI","NTPC","NESTLEIND","ONGC","POWERGRID",
  "RELIANCE","SBILIFE","SHRIRAMFIN","SBIN","SUNPHARMA","TCS","TATACONSUM","TATAMOTORS","TATASTEEL",
  "TECHM","TITAN","UPL","ULTRACEMCO","WIPRO",
]);

// Nifty Next 50 — also large-cap.
const NIFTY_NEXT_50 = new Set<string>([
  "ABB","ACC","ADANIGREEN","ADANIPOWER","AMBUJACEM","DMART","BAJAJHLDNG","BANKBARODA","BERGEPAINT",
  "BIOCON","BOSCHLTD","CANBK","CHOLAFIN","COLPAL","DABUR","DLF","GAIL","GODREJCP","HAVELLS","HDFCAMC",
  "ICICIGI","ICICIPRULI","IDBI","INDHOTEL","INDIANB","INDIGO","IOC","IRCTC","JINDALSTEL","LICI",
  "LICHSGFIN","LODHA","MUTHOOTFIN","NAUKRI","PAGEIND","PIDILITIND","PFC","PNB","RECLTD","SAIL",
  "SBICARD","SIEMENS","SRF","TATAPOWER","TVSMOTOR","TRENT","UNIONBANK","VEDL","VBL","ZOMATO",
]);

// Nifty Midcap 100 — mid-cap proxy. Trimmed list of well-known constituents.
const NIFTY_MIDCAP_100 = new Set<string>([
  "ABBOTINDIA","ABCAPITAL","ABFRL","ACC","ALKEM","APLAPOLLO","ASHOKLEY","ASTRAL","AUBANK","AUROPHARMA",
  "BALKRISIND","BANDHANBNK","BHARATFORG","BHEL","CGPOWER","COFORGE","CONCOR","CRISIL","CUMMINSIND",
  "DALBHARAT","DEEPAKNTR","DELHIVERY","ESCORTS","EXIDEIND","FEDERALBNK","FORTIS","GLENMARK","GMRINFRA",
  "GODREJPROP","GUJGASLTD","HAL","HDFCAMC","IDFCFIRSTB","IGL","IPCALAB","JINDALSTEL","JUBLFOOD",
  "L&TFH","LUPIN","MFSL","MGL","MOTHERSON","MPHASIS","MRF","NAVINFLUOR","NMDC","OBEROIRLTY","OFSS",
  "PEL","PERSISTENT","PETRONET","PIIND","POLYCAB","RAMCOCEM","SCHAEFFLER","SHREECEM","SUNDRMFAST",
  "SUPREMEIND","SYNGENE","TATACOMM","TATAELXSI","TIINDIA","TORNTPHARM","TORNTPOWER","TRIDENT",
  "TVSMOTOR","UBL","VOLTAS","WHIRLPOOL","ZEEL","ZYDUSLIFE",
]);

// Nifty Smallcap 100 — small-cap proxy.
const NIFTY_SMALLCAP_100 = new Set<string>([
  "AARTIIND","AAVAS","ABSLAMC","AEGISCHEM","AFFLE","AJANTPHARM","ANGELONE","APARINDS","APLLTD",
  "ASTERDM","BALAMINES","BALRAMCHIN","BASF","BIRLACORPN","BLUEDART","BLUESTARCO","BSOFT","CAMS",
  "CANFINHOME","CCL","CDSL","CEATLTD","CENTURYTEX","CESC","CHAMBLFERT","CHENNPETRO","CHOICEIN",
  "COCHINSHIP","CREDITACC","CRISIL","CUB","CYIENT","DCMSHRIRAM","DEEPAKFERT","EIDPARRY","ELGIEQUIP",
  "EQUITASBNK","FINCABLES","FINEORG","FSL","GICRE","GNFC","GRAPHITE","GRINDWELL","GSPL","GUJALKALI",
  "HATSUN","HONAUT","IDFC","IIFL","INDIACEM","IPCALAB","IRB","ISEC","JBCHEPHARM","JKCEMENT",
  "JKLAKSHMI","JMFINANCIL","JUBLPHARMA","JYOTHYLAB","KAJARIACER","KARURVYSYA","KEC","KEI",
  "KIRLOSENG","KNRCON","LATENTVIEW","LAURUSLABS","LXCHEM","M&MFIN","MAHINDCIE","MAPMYINDIA",
  "MAZDOCK","METROPOLIS","NATCOPHARM","NBCC","NESCO","NH","NIACL","NIITLTD","ORIENTELEC","PFIZER",
  "PNBHOUSING","POLYMED","PRINCEPIPE","PRSMJOHNSN","PVRINOX","QUESS","RAIN","RAJESHEXPO","RAYMOND",
  "REDINGTON","RHIM","ROSSARI","RVNL","SAREGAMA","SHARDACROP","SOBHA","SONATSOFTW","SUDARSCHEM",
  "SUMICHEM","SUNTECK","SUPRAJIT","SUVENPHAR","SWANENERGY","SYRMA","TATATECH","TCIEXP","TEAMLEASE",
  "TIMKEN","TITAGARH","TRITURBINE","TTKPRESTIG","UJJIVANSFB","VAIBHAVGBL","VENKEYS","VINATIORGA",
  "VRLLOG","WELCORP","WHIRLPOOL","WOCKPHARMA","ZENSARTECH",
]);

export function classifyEquity(symbol: string): EquitySubType | null {
  const s = symbol.trim().toUpperCase();
  if (NIFTY_50.has(s) || NIFTY_NEXT_50.has(s)) return "largeCap";
  if (NIFTY_MIDCAP_100.has(s)) return "midCap";
  if (NIFTY_SMALLCAP_100.has(s)) return "smallCap";
  return null;
}

// ── Mutual fund classification ──────────────────────────────────────────────
/**
 * Classify a scheme by its name and AMFI category bucket.
 *
 * AMFI category strings look like "Open Ended Equity Scheme - Large Cap Fund",
 * "Debt Scheme - Liquid Fund", "Other Scheme - Index Funds" etc — strong signal,
 * but for many old funds the bucket is generic ("Equity Scheme") so we also
 * fall back to scheme-name regex.
 */
export function classifyMf(schemeName: string, amfiCategory: string): MfSubType | null {
  const n = schemeName.toLowerCase();
  const c = amfiCategory.toLowerCase();

  // Exclude direct/regular plan suffixes from match — they're noise.
  // Order matters: specific buckets first.
  if (/gold|silver|precious metal/i.test(n) || /gold|silver/i.test(c)) return "gold";
  if (/(?:nasdaq|s&p|us equity|global|international|emerging market|world)/i.test(n)) return "international";
  if (/liquid fund/i.test(n) || /liquid/i.test(c)) return "liquidFund";
  if (/(?:debt|gilt|bond|income|short.?duration|low.?duration|ultra.?short|banking and psu|corporate bond|credit risk|dynamic bond|money market|overnight)/i.test(n) ||
      /debt scheme|bond/i.test(c)) return "debtFund";
  if (/(?:hybrid|balanced advantage|dynamic asset|equity savings|aggressive hybrid|conservative hybrid|multi.?asset|arbitrage)/i.test(n) ||
      /hybrid/i.test(c)) return "hybrid";
  if (/index fund|nifty.?(?:50|next 50|100|500|midcap|smallcap|bank|it)/i.test(n) || /index fund/i.test(c)) return "indexFund";
  if (/elss|tax saver/i.test(n) || /elss/i.test(c)) return "elss";
  if (/large.{0,2}cap/i.test(n) || /large cap fund/i.test(c)) return "largeCapFund";
  if (/mid.{0,2}cap/i.test(n) || /mid cap fund/i.test(c)) return "midCapFund";
  if (/small.{0,2}cap/i.test(n) || /small cap fund/i.test(c)) return "smallCapFund";
  if (/flexi.{0,2}cap/i.test(n) || /flexi cap/i.test(c)) return "flexiCap";
  if (/multi.{0,2}cap/i.test(n) || /multi cap/i.test(c)) return "multiCap";
  // Sector / thematic — broad catch-all for the remainder of equity schemes.
  if (/(?:pharma|banking|infrastructure|technology|fmcg|consumption|energy|psu|esg|innovation|digital|manufacturing|housing|metal)/i.test(n)) return "sector";
  return null;
}

/** Heuristic for ETFs that we can identify by symbol alone (used at NSE ingest). */
export function classifyEtfBySymbol(symbol: string): MfSubType | null {
  const s = symbol.trim().toUpperCase();
  if (/^GOLDBEES|^GOLDIETF|^NIPGOLD|^HDFCMFGETF|^GOLDETF/.test(s)) return "gold";
  if (/SILVERBEES|^SILVERETF/.test(s)) return "gold"; // group with gold as "precious metal hedge"
  if (/^NIFTYBEES|^N100|^NIF100/.test(s)) return "indexFund";
  if (/^BANKBEES|^ITBEES|^PSUBNKBEES|^CPSE/.test(s)) return "sector";
  return null;
}

/**
 * Maps a user's risk profile to the set of subTypes worth recommending.
 * Used by the For You recommender when no explicit subType filter is sent.
 */
export function defaultSubTypesForRisk(risk: "careful" | "balanced" | "growth"): AssetSubType[] {
  switch (risk) {
    case "careful":
      return ["largeCap", "largeCapFund", "indexFund", "debtFund", "liquidFund", "hybrid"];
    case "balanced":
      return [
        "largeCap", "midCap",
        "largeCapFund", "midCapFund", "flexiCap", "multiCap", "indexFund", "hybrid",
      ];
    case "growth":
      return [
        "largeCap", "midCap", "smallCap",
        "midCapFund", "smallCapFund", "flexiCap", "multiCap", "elss",
      ];
  }
}
