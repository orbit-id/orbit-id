import "./styles.css";
import {
  OrbitError,
  OrbitGeneratorV2,
  encode,
  fromDecimalString,
  parse,
  toDecimalString,
  toHexString,
  toBase64UrlString,
} from "@orbit-id/core";
import * as v1 from "@orbit-id/core/v1";
import {
  type Locale,
  type SpecVersion,
  messages,
  readStoredLocale,
  readStoredSpec,
  writeStoredLocale,
  writeStoredSpec,
} from "./i18n.js";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

let locale: Locale = readStoredLocale();
let spec: SpecVersion = readStoredSpec();
let idDraft = "";
let typeDraft = "1";
let nodeDraft = "1";
let timestampDraft = "";
let sequenceDraft = "";
let regionDraft = "0";
let tenantDraft = "0";

render();

function render(): void {
  const t = messages[locale];
  const isV2 = spec === "v2";
  document.documentElement.lang = t.htmlLang;
  document.title = t.title;

  app!.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="#">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Orbit ID</span>
      </a>
      <div class="top-right">
        <label class="lang-switch">
          <span class="lang-label">${escapeHtml(t.versionLabel)}</span>
          <select id="spec-select" aria-label="${escapeAttr(t.versionLabel)}">
            <option value="v2" ${spec === "v2" ? "selected" : ""}>${escapeHtml(t.versionV2)}</option>
            <option value="v1" ${spec === "v1" ? "selected" : ""}>${escapeHtml(t.versionV1)}</option>
          </select>
        </label>
        <label class="lang-switch">
          <span class="lang-label">${escapeHtml(t.langLabel)}</span>
          <select id="locale-select" aria-label="${escapeAttr(t.langLabel)}">
            <option value="en" ${locale === "en" ? "selected" : ""}>${escapeHtml(t.langEn)}</option>
            <option value="ja" ${locale === "ja" ? "selected" : ""}>${escapeHtml(t.langJa)}</option>
          </select>
        </label>
        <nav class="top-links" aria-label="${escapeAttr(t.navAria)}">
          <a href="${escapeAttr(isV2 ? t.docsSpecV2 : t.docsSpecV1)}" target="_blank" rel="noreferrer">${escapeHtml(t.spec)}</a>
          <a href="${escapeAttr(t.docsVectors)}" target="_blank" rel="noreferrer">${escapeHtml(t.testVectors)}</a>
          <a href="https://github.com/orbit-id/orbit-id/tree/main/spec/conformance" target="_blank" rel="noreferrer">${escapeHtml(t.conformance)}</a>
          <a href="https://github.com/orbit-id/orbit-id" target="_blank" rel="noreferrer">${escapeHtml(t.github)}</a>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="page-head">
        <div class="badge">
          <span class="badge-dot" aria-hidden="true"></span>
          <span>${escapeHtml(t.badge)}</span>
        </div>
        <h1 class="page-title">${escapeHtml(t.pageTitle)}</h1>
        <p class="page-desc">${escapeHtml(isV2 ? t.pageDescV2 : t.pageDescV1)}</p>
        <ul class="checks">
          <li>${escapeHtml(t.checkLocal)}</li>
          <li>${escapeHtml(t.checkNoServer)}</li>
        </ul>
      </div>

      <section class="grid">
        <article class="card">
          <div class="card-head">
            <h2>${escapeHtml(t.parse)}</h2>
            <button type="button" class="btn btn-ghost" id="btn-parse-clear">${escapeHtml(t.clear)}</button>
          </div>
          <div class="card-body">
            <div class="field">
              <label for="id-input">${escapeHtml(t.decimalId)}</label>
              <input
                class="mono"
                id="id-input"
                inputmode="numeric"
                spellcheck="false"
                placeholder="${escapeAttr(isV2 ? t.idPlaceholderV2 : t.idPlaceholderV1)}"
              />
            </div>
            <div class="actions">
              <button type="button" class="btn btn-primary" id="btn-parse">${escapeHtml(t.parseAction)}</button>
            </div>
            <div id="parse-out" class="panel" aria-live="polite"></div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <h2>${escapeHtml(t.generateEncode)}</h2>
            <button type="button" class="btn btn-ghost" id="btn-gen-clear">${escapeHtml(t.clear)}</button>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label for="type">${escapeHtml(isV2 ? t.typeV2 : t.typeV1)}</label>
                <input id="type" type="number" min="1" max="${isV2 ? 65535 : 63}" />
              </div>
              <div class="field">
                <label for="node">${escapeHtml(isV2 ? t.nodeV2 : t.nodeV1)}</label>
                <input id="node" type="number" min="0" max="${isV2 ? 65535 : 127}" />
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label for="timestamp">${escapeHtml(t.timestamp)}</label>
                <input class="mono" id="timestamp" inputmode="numeric" placeholder="auto" />
              </div>
              <div class="field">
                <label for="sequence">${escapeHtml(isV2 ? t.sequenceV2 : t.sequenceV1)}</label>
                <input id="sequence" type="number" min="0" max="${isV2 ? 65535 : 1023}" placeholder="0" />
              </div>
            </div>
            ${
              isV2
                ? `<div class="row">
              <div class="field">
                <label for="region">${escapeHtml(t.region)}</label>
                <input id="region" type="number" min="0" max="15" />
              </div>
              <div class="field">
                <label for="tenant">${escapeHtml(t.tenant)}</label>
                <input id="tenant" type="number" min="0" max="65535" />
              </div>
            </div>`
                : ""
            }
            <div class="actions">
              <button type="button" class="btn btn-primary" id="btn-generate">${escapeHtml(t.generateAction)}</button>
              <button type="button" class="btn btn-ghost" id="btn-encode">${escapeHtml(t.encodeAction)}</button>
            </div>
            <div id="gen-out" class="panel" aria-live="polite"></div>
          </div>
        </article>
      </section>

      <p class="foot" id="footer"></p>
    </main>
  </div>
`;

  // Restore drafts via DOM properties (never re-inject DOM text into innerHTML).
  must<HTMLInputElement>("#id-input").value = idDraft;
  must<HTMLInputElement>("#type").value = typeDraft;
  must<HTMLInputElement>("#node").value = nodeDraft;
  must<HTMLInputElement>("#timestamp").value = timestampDraft;
  must<HTMLInputElement>("#sequence").value = sequenceDraft;
  if (isV2) {
    must<HTMLInputElement>("#region").value = regionDraft;
    must<HTMLInputElement>("#tenant").value = tenantDraft;
  }
  resetPanel(must("#parse-out"), t.resultPlaceholder);
  resetPanel(must("#gen-out"), t.resultPlaceholder);
  must("#footer").innerHTML = t.footer;

  bind();
}

function bind(): void {
  const t = messages[locale];
  const idInput = must<HTMLInputElement>("#id-input");
  const parseOut = must("#parse-out");
  const genOut = must("#gen-out");
  const typeInput = must<HTMLInputElement>("#type");
  const nodeInput = must<HTMLInputElement>("#node");
  const timestampInput = must<HTMLInputElement>("#timestamp");
  const sequenceInput = must<HTMLInputElement>("#sequence");
  const regionInput = spec === "v2" ? must<HTMLInputElement>("#region") : null;
  const tenantInput = spec === "v2" ? must<HTMLInputElement>("#tenant") : null;
  const localeSelect = must<HTMLSelectElement>("#locale-select");
  const specSelect = must<HTMLSelectElement>("#spec-select");

  const persistDrafts = (): void => {
    idDraft = idInput.value;
    typeDraft = typeInput.value;
    nodeDraft = nodeInput.value;
    timestampDraft = timestampInput.value;
    sequenceDraft = sequenceInput.value;
    if (regionInput) regionDraft = regionInput.value;
    if (tenantInput) tenantDraft = tenantInput.value;
  };

  localeSelect.addEventListener("change", () => {
    persistDrafts();
    locale = localeSelect.value === "ja" ? "ja" : "en";
    writeStoredLocale(locale);
    render();
  });

  specSelect.addEventListener("change", () => {
    persistDrafts();
    spec = specSelect.value === "v2" ? "v2" : "v1";
    writeStoredSpec(spec);
    render();
  });

  must("#btn-parse").addEventListener("click", () => {
    persistDrafts();
    try {
      const raw = idInput.value.trim();
      if (spec === "v1") {
        const fields = v1.parse(raw);
        setOutput(parseOut, {
          timestamp: fields.timestamp.toString(),
          type: fields.type,
          node: fields.node,
          sequence: fields.sequence,
          hex: v1.toHexString(v1.encode(fields)),
          base64url: v1.toBase64UrlString(v1.encode(fields)),
        });
        return;
      }
      const fields = parse(raw);
      setOutput(parseOut, {
        formatVersion: fields.formatVersion,
        timestamp: fields.timestamp.toString(),
        type: fields.type,
        node: fields.node,
        sequence: fields.sequence,
        region: fields.region,
        tenant: fields.tenant,
        reserved: fields.reserved,
        hex: toHexString(fromDecimalString(raw)),
        base64url: toBase64UrlString(fromDecimalString(raw)),
      });
    } catch (e) {
      setError(parseOut, e);
    }
  });

  must("#btn-generate").addEventListener("click", () => {
    persistDrafts();
    try {
      const type = Number(typeInput.value);
      const node = Number(nodeInput.value);
      if (spec === "v1") {
        const generator = new v1.OrbitGenerator({ node });
        const id = generator.generate(type);
        const fields = v1.parse(id);
        setOutput(genOut, {
          id: v1.toDecimalString(id),
          hex: v1.toHexString(id),
          base64url: v1.toBase64UrlString(id),
          ...fields,
          timestamp: fields.timestamp.toString(),
        });
        idInput.value = v1.toDecimalString(id);
        idDraft = idInput.value;
        return;
      }
      const region = Number(regionInput?.value || "0");
      const tenant = Number(tenantInput?.value || "0");
      const generator = new OrbitGeneratorV2({ node, region, tenant });
      const id = generator.generate(type);
      const fields = parse(id);
      setOutput(genOut, {
        id: toDecimalString(id),
        hex: toHexString(id),
        base64url: toBase64UrlString(id),
        formatVersion: fields.formatVersion,
        timestamp: fields.timestamp.toString(),
        type: fields.type,
        node: fields.node,
        sequence: fields.sequence,
        region: fields.region,
        tenant: fields.tenant,
        reserved: fields.reserved,
      });
      idInput.value = toDecimalString(id);
      idDraft = idInput.value;
    } catch (e) {
      setError(genOut, e);
    }
  });

  must("#btn-encode").addEventListener("click", () => {
    persistDrafts();
    try {
      const type = Number(typeInput.value);
      const node = Number(nodeInput.value);
      const sequence = sequenceInput.value === "" ? 0 : Number(sequenceInput.value);
      const timestamp =
        timestampInput.value.trim() === ""
          ? BigInt(Date.now()) - 1767225600000n
          : BigInt(timestampInput.value.trim());
      if (spec === "v1") {
        const id = v1.encode({ timestamp, type, node, sequence });
        setOutput(genOut, {
          id: v1.toDecimalString(id),
          hex: v1.toHexString(id),
          base64url: v1.toBase64UrlString(id),
          timestamp: timestamp.toString(),
          type,
          node,
          sequence,
        });
        idInput.value = v1.toDecimalString(id);
        idDraft = idInput.value;
        return;
      }
      const region = Number(regionInput?.value || "0");
      const tenant = Number(tenantInput?.value || "0");
      const id = encode({
        formatVersion: 1,
        timestamp,
        type,
        node,
        sequence,
        region,
        tenant,
        reserved: 0,
      });
      setOutput(genOut, {
        id: toDecimalString(id),
        hex: toHexString(id),
        base64url: toBase64UrlString(id),
        formatVersion: 1,
        timestamp: timestamp.toString(),
        type,
        node,
        sequence,
        region,
        tenant,
        reserved: 0,
      });
      idInput.value = toDecimalString(id);
      idDraft = idInput.value;
    } catch (e) {
      setError(genOut, e);
    }
  });

  must("#btn-parse-clear").addEventListener("click", () => {
    idInput.value = "";
    idDraft = "";
    resetPanel(parseOut, t.resultPlaceholder);
  });

  must("#btn-gen-clear").addEventListener("click", () => {
    typeInput.value = "1";
    nodeInput.value = "1";
    timestampInput.value = "";
    sequenceInput.value = "";
    typeDraft = "1";
    nodeDraft = "1";
    timestampDraft = "";
    sequenceDraft = "";
    if (regionInput) {
      regionInput.value = "0";
      regionDraft = "0";
    }
    if (tenantInput) {
      tenantInput.value = "0";
      tenantDraft = "0";
    }
    resetPanel(genOut, t.resultPlaceholder);
  });
}

function must<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resetPanel(el: HTMLElement, placeholder: string): void {
  el.className = "panel";
  el.textContent = placeholder;
}

function setOutput(el: HTMLElement, value: unknown): void {
  el.className = "panel ok";
  el.textContent = JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

function setError(el: HTMLElement, err: unknown): void {
  el.className = "panel err";
  if (err instanceof OrbitError) {
    el.textContent = `${err.code}: ${err.message}`;
    return;
  }
  el.textContent = err instanceof Error ? err.message : String(err);
}
