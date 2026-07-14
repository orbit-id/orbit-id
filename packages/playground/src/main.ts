import "./styles.css";
import {
  OrbitError,
  OrbitGenerator,
  encode,
  parse,
  toDecimalString,
  toHexString,
} from "@orbit-id/core";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

app.innerHTML = `
  <header class="hero">
    <p class="brand">Orbit ID</p>
    <p class="lede">Encode and decode stable v1 64-bit IDs in the browser. Invalid input shows the rejection reason.</p>
    <div class="links">
      <a href="https://github.com/ponstream24/orbit-id/blob/main/docs/en/orbit-id-v1.md">Specification</a>
      <a href="https://github.com/ponstream24/orbit-id/blob/main/docs/en/test-vectors.md">Test vectors</a>
      <a href="https://github.com/ponstream24/orbit-id/tree/main/spec/conformance">Conformance fixtures</a>
    </div>
  </header>

  <section class="workspace">
    <div class="panel">
      <h2>Parse</h2>
      <label for="id-input">Decimal ID</label>
      <input id="id-input" inputmode="numeric" spellcheck="false" placeholder="140612821619842090" />
      <div class="actions">
        <button type="button" id="btn-parse">Parse</button>
      </div>
      <pre class="output" id="parse-out" aria-live="polite"></pre>
    </div>

    <div class="panel">
      <h2>Generate / encode</h2>
      <div class="row">
        <div>
          <label for="type">Type (1–63)</label>
          <input id="type" type="number" min="1" max="63" value="1" />
        </div>
        <div>
          <label for="node">Node (0–127)</label>
          <input id="node" type="number" min="0" max="127" value="1" />
        </div>
      </div>
      <div class="row" style="margin-top:0.75rem">
        <div>
          <label for="timestamp">Timestamp (Orbit ms, optional)</label>
          <input id="timestamp" inputmode="numeric" placeholder="auto" />
        </div>
        <div>
          <label for="sequence">Sequence (optional)</label>
          <input id="sequence" type="number" min="0" max="1023" placeholder="auto / 0" />
        </div>
      </div>
      <div class="actions">
        <button type="button" id="btn-generate">Generate</button>
        <button type="button" class="secondary" id="btn-encode">Encode fields</button>
      </div>
      <pre class="output" id="gen-out" aria-live="polite"></pre>
    </div>
  </section>

  <p class="foot">Built with <code>@orbit-id/core</code>. Formal capacity is not a measured benchmark.</p>
`;

const idInput = must("#id-input") as HTMLInputElement;
const parseOut = must("#parse-out");
const genOut = must("#gen-out");
const typeInput = must("#type") as HTMLInputElement;
const nodeInput = must("#node") as HTMLInputElement;
const timestampInput = must("#timestamp") as HTMLInputElement;
const sequenceInput = must("#sequence") as HTMLInputElement;

must("#btn-parse").addEventListener("click", () => {
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
  } catch (e) {
    setError(genOut, e);
  }
});

must("#btn-encode").addEventListener("click", () => {
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
  } catch (e) {
    setError(genOut, e);
  }
});

function must(sel: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

function setOutput(el: HTMLElement, value: unknown): void {
  el.classList.remove("error");
  el.textContent = JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

function setError(el: HTMLElement, err: unknown): void {
  el.classList.remove("error");
  void el.offsetWidth;
  el.classList.add("error");
  if (err instanceof OrbitError) {
    el.textContent = `${err.code}: ${err.message}`;
    return;
  }
  el.textContent = err instanceof Error ? err.message : String(err);
}
