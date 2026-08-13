export type Locale = "en" | "ja";
export type SpecVersion = "v1" | "v2";

export type Messages = {
  htmlLang: string;
  title: string;
  navAria: string;
  spec: string;
  testVectors: string;
  conformance: string;
  github: string;
  badge: string;
  pageTitle: string;
  pageDescV1: string;
  pageDescV2: string;
  checkLocal: string;
  checkNoServer: string;
  parse: string;
  generateEncode: string;
  clear: string;
  decimalId: string;
  parseAction: string;
  typeV1: string;
  typeV2: string;
  nodeV1: string;
  nodeV2: string;
  timestamp: string;
  sequenceV1: string;
  sequenceV2: string;
  region: string;
  tenant: string;
  generateAction: string;
  encodeAction: string;
  resultPlaceholder: string;
  footer: string;
  langLabel: string;
  langEn: string;
  langJa: string;
  versionLabel: string;
  versionV1: string;
  versionV2: string;
  docsSpecV1: string;
  docsSpecV2: string;
  docsVectors: string;
  idPlaceholderV1: string;
  idPlaceholderV2: string;
};

export const messages: Record<Locale, Messages> = {
  en: {
    htmlLang: "en",
    title: "Orbit ID Playground",
    navAria: "Documentation",
    spec: "Specification",
    testVectors: "Test vectors",
    conformance: "Conformance",
    github: "GitHub",
    badge: "Runs in your browser · no signup",
    pageTitle: "Orbit ID Playground",
    pageDescV1:
      "Generate, parse, and encode Orbit ID v1 (64-bit) values locally. Invalid input shows the rejection reason.",
    pageDescV2:
      "Generate, parse, and encode Orbit ID v2 (128-bit) values locally. Invalid input shows the rejection reason.",
    checkLocal: "Processing stays in the browser",
    checkNoServer: "Input is never sent to a server",
    parse: "Parse",
    generateEncode: "Generate / encode",
    clear: "Clear",
    decimalId: "Decimal ID",
    parseAction: "Parse",
    typeV1: "Type (1–63)",
    typeV2: "Type (1–65535)",
    nodeV1: "Node (0–127)",
    nodeV2: "Node (0–65535)",
    timestamp: "Timestamp (Orbit ms, optional)",
    sequenceV1: "Sequence (optional, 0–1023)",
    sequenceV2: "Sequence (optional, 0–65535)",
    region: "Region (optional, 0–15)",
    tenant: "Tenant (optional, 0–65535)",
    generateAction: "Generate",
    encodeAction: "Encode fields",
    resultPlaceholder: "Results appear here",
    footer:
      'Built with <code>@orbit-id/core</code>. Formal capacity is not a measured benchmark.',
    langLabel: "Language",
    langEn: "English",
    langJa: "日本語",
    versionLabel: "Format",
    versionV1: "v1 (64-bit)",
    versionV2: "v2 (stable)",
    docsSpecV1: "https://github.com/orbit-id/orbit-id/blob/main/docs/en/orbit-id-v1.md",
    docsSpecV2: "https://github.com/orbit-id/orbit-id/blob/main/docs/en/orbit-id-v2.md",
    docsVectors: "https://github.com/orbit-id/orbit-id/blob/main/docs/en/test-vectors.md",
    idPlaceholderV1: "140612821619842090",
    idPlaceholderV2: "21267647932558653967613957625668960256",
  },
  ja: {
    htmlLang: "ja",
    title: "Orbit ID プレイグラウンド",
    navAria: "ドキュメント",
    spec: "仕様",
    testVectors: "テストベクタ",
    conformance: "Conformance",
    github: "GitHub",
    badge: "ブラウザ完結 · 登録不要",
    pageTitle: "Orbit ID プレイグラウンド",
    pageDescV1:
      "Orbit ID v1（64-bit）の生成・解析・エンコードをその場で試せます。不正な入力は拒否理由を表示します。",
    pageDescV2:
      "Orbit ID v2（128-bit）の生成・解析・エンコードをその場で試せます。不正な入力は拒否理由を表示します。",
    checkLocal: "処理はブラウザ内で完結します",
    checkNoServer: "入力データはサーバーへ送りません",
    parse: "解析",
    generateEncode: "生成 / エンコード",
    clear: "クリア",
    decimalId: "Decimal ID",
    parseAction: "解析する",
    typeV1: "Type (1–63)",
    typeV2: "Type (1–65535)",
    nodeV1: "Node (0–127)",
    nodeV2: "Node (0–65535)",
    timestamp: "Timestamp（Orbit ms・任意）",
    sequenceV1: "Sequence（任意・0–1023）",
    sequenceV2: "Sequence（任意・0–65535）",
    region: "Region（任意・0–15）",
    tenant: "Tenant（任意・0–65535）",
    generateAction: "生成する",
    encodeAction: "フィールドをエンコード",
    resultPlaceholder: "結果がここに表示されます",
    footer:
      'Built with <code>@orbit-id/core</code>。仕様上の formal capacity は実測スループットではありません。',
    langLabel: "言語",
    langEn: "English",
    langJa: "日本語",
    versionLabel: "形式",
    versionV1: "v1（64-bit）",
    versionV2: "v2（stable）",
    docsSpecV1: "https://github.com/orbit-id/orbit-id/blob/main/docs/ja/orbit-id-v1.md",
    docsSpecV2: "https://github.com/orbit-id/orbit-id/blob/main/docs/ja/orbit-id-v2.md",
    docsVectors: "https://github.com/orbit-id/orbit-id/blob/main/docs/ja/test-vectors.md",
    idPlaceholderV1: "140612821619842090",
    idPlaceholderV2: "21267647932558653967613957625668960256",
  },
};

const LOCALE_KEY = "orbit-id-playground-locale";
const SPEC_KEY = "orbit-id-playground-spec";

export function resolveLocale(raw: string | null | undefined): Locale {
  return raw === "ja" ? "ja" : "en";
}

export function resolveSpec(raw: string | null | undefined): SpecVersion {
  return raw === "v1" ? "v1" : "v2";
}

export function readStoredLocale(): Locale {
  try {
    return resolveLocale(localStorage.getItem(LOCALE_KEY));
  } catch {
    return "en";
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
}

export function readStoredSpec(): SpecVersion {
  try {
    return resolveSpec(localStorage.getItem(SPEC_KEY));
  } catch {
    return "v2";
  }
}

export function writeStoredSpec(spec: SpecVersion): void {
  try {
    localStorage.setItem(SPEC_KEY, spec);
  } catch {
    // ignore quota / private mode
  }
}
