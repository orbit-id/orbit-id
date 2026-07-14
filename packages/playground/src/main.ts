import "bulma/css/bulma.min.css";
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
  <nav class="navbar is-dark" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <a class="navbar-item has-text-weight-bold is-size-4" href="#">Orbit ID</a>
    </div>
    <div class="navbar-menu is-active">
      <div class="navbar-end">
        <a class="navbar-item" href="https://github.com/ponstream24/orbit-id/blob/main/docs/en/orbit-id-v1.md" target="_blank" rel="noreferrer">Specification</a>
        <a class="navbar-item" href="https://github.com/ponstream24/orbit-id/blob/main/docs/en/test-vectors.md" target="_blank" rel="noreferrer">Test vectors</a>
        <a class="navbar-item" href="https://github.com/ponstream24/orbit-id/tree/main/spec/conformance" target="_blank" rel="noreferrer">Conformance</a>
        <a class="navbar-item" href="https://github.com/ponstream24/orbit-id" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </div>
  </nav>

  <section class="hero is-primary is-small">
    <div class="hero-body">
      <div class="container">
        <p class="title">Playground</p>
        <p class="subtitle">
          Encode and decode stable Orbit ID v1 values. Invalid input shows the rejection reason.
        </p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="columns is-desktop">
        <div class="column">
          <div class="box">
            <h2 class="title is-5">Parse</h2>
            <div class="field">
              <label class="label" for="id-input">Decimal ID</label>
              <div class="control">
                <input
                  class="input is-family-code"
                  id="id-input"
                  inputmode="numeric"
                  spellcheck="false"
                  placeholder="140612821619842090"
                />
              </div>
            </div>
            <div class="field">
              <div class="control">
                <button type="button" class="button is-link" id="btn-parse">Parse</button>
              </div>
            </div>
            <div id="parse-out" class="notification is-light is-family-code output-panel" aria-live="polite">
              Results appear here.
            </div>
          </div>
        </div>

        <div class="column">
          <div class="box">
            <h2 class="title is-5">Generate / encode</h2>
            <div class="columns is-mobile">
              <div class="column">
                <div class="field">
                  <label class="label" for="type">Type (1–63)</label>
                  <div class="control">
                    <input class="input" id="type" type="number" min="1" max="63" value="1" />
                  </div>
                </div>
              </div>
              <div class="column">
                <div class="field">
                  <label class="label" for="node">Node (0–127)</label>
                  <div class="control">
                    <input class="input" id="node" type="number" min="0" max="127" value="1" />
                  </div>
                </div>
              </div>
            </div>
            <div class="columns is-mobile">
              <div class="column">
                <div class="field">
                  <label class="label" for="timestamp">Timestamp (Orbit ms)</label>
                  <div class="control">
                    <input class="input is-family-code" id="timestamp" inputmode="numeric" placeholder="auto" />
                  </div>
                </div>
              </div>
              <div class="column">
                <div class="field">
                  <label class="label" for="sequence">Sequence</label>
                  <div class="control">
                    <input class="input" id="sequence" type="number" min="0" max="1023" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
            <div class="field is-grouped">
              <div class="control">
                <button type="button" class="button is-primary" id="btn-generate">Generate</button>
              </div>
              <div class="control">
                <button type="button" class="button is-light" id="btn-encode">Encode fields</button>
              </div>
            </div>
            <div id="gen-out" class="notification is-light is-family-code output-panel" aria-live="polite">
              Results appear here.
            </div>
          </div>
        </div>
      </div>

      <p class="has-text-grey is-size-7">
        Built with <code>@orbit-id/core</code> and
        <a href="https://bulma.io/" target="_blank" rel="noreferrer">Bulma</a>.
        Formal capacity is not a measured benchmark.
      </p>
    </div>
  </section>
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
  el.className = "notification is-success is-light is-family-code output-panel";
  el.textContent = JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

function setError(el: HTMLElement, err: unknown): void {
  el.className = "notification is-danger is-light is-family-code output-panel";
  if (err instanceof OrbitError) {
    el.textContent = `${err.code}: ${err.message}`;
    return;
  }
  el.textContent = err instanceof Error ? err.message : String(err);
}
