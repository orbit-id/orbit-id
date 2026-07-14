import "./styles.css";
import {
  OrbitError,
  OrbitGenerator,
  encode,
  parse,
  toDecimalString,
  toHexString,
} from "@orbit-id/core";
import {
  type Locale,
  messages,
  readStoredLocale,
  writeStoredLocale,
} from "./i18n.js";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

let locale: Locale = readStoredLocale();
let idDraft = "";
let typeDraft = "1";
let nodeDraft = "1";
let timestampDraft = "";
let sequenceDraft = "";

render();

function render(): void {
  const t = messages[locale];
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
          <span class="lang-label">${t.langLabel}</span>
          <select id="locale-select" aria-label="${t.langLabel}">
            <option value="en" ${locale === "en" ? "selected" : ""}>${t.langEn}</option>
            <option value="ja" ${locale === "ja" ? "selected" : ""}>${t.langJa}</option>
          </select>
        </label>
        <nav class="top-links" aria-label="${t.navAria}">
          <a href="${t.docsSpec}" target="_blank" rel="noreferrer">${t.spec}</a>
          <a href="${t.docsVectors}" target="_blank" rel="noreferrer">${t.testVectors}</a>
          <a href="https://github.com/orbit-id/orbit-id/tree/main/spec/conformance" target="_blank" rel="noreferrer">${t.conformance}</a>
          <a href="https://github.com/orbit-id/orbit-id" target="_blank" rel="noreferrer">${t.github}</a>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="page-head">
        <div class="badge">
          <span class="badge-dot" aria-hidden="true"></span>
          <span>${t.badge}</span>
        </div>
        <h1 class="page-title">${t.pageTitle}</h1>
        <p class="page-desc">${t.pageDesc}</p>
        <ul class="checks">
          <li>${t.checkLocal}</li>
          <li>${t.checkNoServer}</li>
        </ul>
      </div>

      <section class="grid">
        <article class="card">
          <div class="card-head">
            <h2>${t.parse}</h2>
            <button type="button" class="btn btn-ghost" id="btn-parse-clear">${t.clear}</button>
          </div>
          <div class="card-body">
            <div class="field">
              <label for="id-input">${t.decimalId}</label>
              <input
                class="mono"
                id="id-input"
                inputmode="numeric"
                spellcheck="false"
                placeholder="140612821619842090"
                value="${escapeAttr(idDraft)}"
              />
            </div>
            <div class="actions">
              <button type="button" class="btn btn-primary" id="btn-parse">${t.parseAction}</button>
            </div>
            <div id="parse-out" class="panel" aria-live="polite">${t.resultPlaceholder}</div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <h2>${t.generateEncode}</h2>
            <button type="button" class="btn btn-ghost" id="btn-gen-clear">${t.clear}</button>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label for="type">${t.type}</label>
                <input id="type" type="number" min="1" max="63" value="${escapeAttr(typeDraft)}" />
              </div>
              <div class="field">
                <label for="node">${t.node}</label>
                <input id="node" type="number" min="0" max="127" value="${escapeAttr(nodeDraft)}" />
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label for="timestamp">${t.timestamp}</label>
                <input class="mono" id="timestamp" inputmode="numeric" placeholder="auto" value="${escapeAttr(timestampDraft)}" />
              </div>
              <div class="field">
                <label for="sequence">${t.sequence}</label>
                <input id="sequence" type="number" min="0" max="1023" placeholder="0" value="${escapeAttr(sequenceDraft)}" />
              </div>
            </div>
            <div class="actions">
              <button type="button" class="btn btn-primary" id="btn-generate">${t.generateAction}</button>
              <button type="button" class="btn btn-ghost" id="btn-encode">${t.encodeAction}</button>
            </div>
            <div id="gen-out" class="panel" aria-live="polite">${t.resultPlaceholder}</div>
          </div>
        </article>
      </section>

      <p class="foot">${t.footer}</p>
    </main>
  </div>
`;

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
  const localeSelect = must<HTMLSelectElement>("#locale-select");

  const persistDrafts = (): void => {
    idDraft = idInput.value;
    typeDraft = typeInput.value;
    nodeDraft = nodeInput.value;
    timestampDraft = timestampInput.value;
    sequenceDraft = sequenceInput.value;
  };

  localeSelect.addEventListener("change", () => {
    persistDrafts();
    locale = localeSelect.value === "ja" ? "ja" : "en";
    writeStoredLocale(locale);
    render();
  });

  must("#btn-parse").addEventListener("click", () => {
    persistDrafts();
    try {
      const fields = parse(idInput.value.trim());
      setOutput(parseOut, {
        timestamp: fields.timestamp.toString(),
        type: fields.type,
        node: fields.node,
        sequence: fields.sequence,
        hex: toHexString(encode(fields)),
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
      const generator = new OrbitGenerator({ node });
      const id = generator.generate(type);
      const fields = parse(id);
      setOutput(genOut, {
        id: toDecimalString(id),
        hex: toHexString(id),
        ...fields,
        timestamp: fields.timestamp.toString(),
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
      const id = encode({ timestamp, type, node, sequence });
      setOutput(genOut, {
        id: toDecimalString(id),
        hex: toHexString(id),
        timestamp: timestamp.toString(),
        type,
        node,
        sequence,
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
    resetPanel(genOut, t.resultPlaceholder);
  });
}

function must<T extends HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

function escapeAttr(value: string): string {
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
