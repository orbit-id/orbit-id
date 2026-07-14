export type Locale = "en" | "ja";

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
  pageDesc: string;
  checkLocal: string;
  checkNoServer: string;
  parse: string;
  generateEncode: string;
  clear: string;
  decimalId: string;
  parseAction: string;
  type: string;
  node: string;
  timestamp: string;
  sequence: string;
  generateAction: string;
  encodeAction: string;
  resultPlaceholder: string;
  footer: string;
  langLabel: string;
  langEn: string;
  langJa: string;
  docsSpec: string;
  docsVectors: string;
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
    pageDesc:
      "Generate, parse, and encode Orbit ID v1 values locally. Invalid input shows the rejection reason.",
    checkLocal: "Processing stays in the browser",
    checkNoServer: "Input is never sent to a server",
    parse: "Parse",
    generateEncode: "Generate / encode",
    clear: "Clear",
    decimalId: "Decimal ID",
    parseAction: "Parse",
    type: "Type (1–63)",
    node: "Node (0–127)",
    timestamp: "Timestamp (Orbit ms, optional)",
    sequence: "Sequence (optional)",
    generateAction: "Generate",
    encodeAction: "Encode fields",
    resultPlaceholder: "Results appear here",
    footer:
      'Built with <code>@orbit-id/core</code>. Formal capacity is not a measured benchmark.',
    langLabel: "Language",
    langEn: "English",
    langJa: "日本語",
    docsSpec: "https://github.com/orbit-id/orbit-id/blob/main/docs/en/orbit-id-v1.md",
    docsVectors: "https://github.com/orbit-id/orbit-id/blob/main/docs/en/test-vectors.md",
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
    pageDesc:
      "Orbit ID v1 の生成・解析・エンコードをその場で試せます。不正な入力は拒否理由を表示します。",
    checkLocal: "処理はブラウザ内で完結します",
    checkNoServer: "入力データはサーバーへ送りません",
    parse: "解析",
    generateEncode: "生成 / エンコード",
    clear: "クリア",
    decimalId: "Decimal ID",
    parseAction: "解析する",
    type: "Type (1–63)",
    node: "Node (0–127)",
    timestamp: "Timestamp（Orbit ms・任意）",
    sequence: "Sequence（任意）",
    generateAction: "生成する",
    encodeAction: "フィールドをエンコード",
    resultPlaceholder: "結果がここに表示されます",
    footer:
      'Built with <code>@orbit-id/core</code>。仕様上の formal capacity は実測スループットではありません。',
    langLabel: "言語",
    langEn: "English",
    langJa: "日本語",
    docsSpec: "https://github.com/orbit-id/orbit-id/blob/main/docs/ja/orbit-id-v1.md",
    docsVectors: "https://github.com/orbit-id/orbit-id/blob/main/docs/ja/test-vectors.md",
  },
};

const STORAGE_KEY = "orbit-id-playground-locale";

export function resolveLocale(raw: string | null | undefined): Locale {
  return raw === "ja" ? "ja" : "en";
}

export function readStoredLocale(): Locale {
  try {
    return resolveLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "en";
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
}
