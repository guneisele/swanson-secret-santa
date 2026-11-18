import { drawMatches } from "./draw.js";
import {
  encodePayload,
  decodePayload,
  composeSms,
  formatBudget,
  formatDate,
  smsUri,
  parseRevealHash,
} from "./codec.js";

const STORAGE_KEY = "swanson-secret-santa-v1";
const DEFAULT_TITLE = "The Swanson Family Secret Santa 2026";

const HAT_SVG = `<svg class="santa-hat" viewBox="0 0 64 56" aria-hidden="true">
  <path d="M10 40 C10 22, 22 8, 38 8 C48 8, 55 13, 56 22 C50 17, 44 18, 42 24 C40 30, 41 35, 44 40 Z" fill="#9A1B2C"/>
  <path d="M20 22 C25 14, 32 11, 40 11" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round"/>
  <rect x="5" y="36" width="44" height="12" rx="6" fill="#FFF6E8"/>
  <circle cx="56" cy="23" r="6.5" fill="#FFF6E8"/>
</svg>`;

const ORNAMENT = (color, cls) => `<svg class="ornament ${cls}" viewBox="0 0 22 30" aria-hidden="true">
  <path d="M11 4 C11 0.5, 14.5 0.5, 14.5 3" fill="none" stroke="#C9A227" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="8" y="5" width="6" height="5" rx="1.2" fill="#C9A227"/>
  <circle cx="11" cy="19" r="9" fill="${color}"/>
  <path d="M2.6 17.5 Q11 21 19.4 17.5" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.3"/>
  <ellipse cx="7.6" cy="15" rx="2.4" ry="3" fill="#fff" opacity="0.4"/>
</svg>`;

const BOW_SVG = `<svg class="bow" viewBox="0 0 54 34" aria-hidden="true">
  <path d="M25 18 L17 32 L21.5 31 L24 34 L28.5 19Z" fill="#E7C46A"/>
  <path d="M29 18 L37 32 L32.5 31 L30 34 L25.5 19Z" fill="#E7C46A"/>
  <path d="M27 16 C19 3, 4 3, 5 13 C6 23, 19 22, 27 16Z" fill="#F3D789"/>
  <path d="M27 16 C35 3, 50 3, 49 13 C48 23, 35 22, 27 16Z" fill="#F3D789"/>
  <path d="M25 15.5 C19 9, 11 8, 11 13 C11 17, 18 18, 25 15.5Z" fill="#C9A227" opacity="0.55"/>
  <path d="M29 15.5 C35 9, 43 8, 43 13 C43 17, 36 18, 29 15.5Z" fill="#C9A227" opacity="0.55"/>
  <rect x="22" y="11" width="10" height="11" rx="4" fill="#C9A227"/>
</svg>`;

const BELL_SVG = `<svg class="bell" viewBox="0 0 36 42" aria-hidden="true">
  <circle cx="18" cy="5" r="3" fill="none" stroke="#C9A227" stroke-width="2"/>
  <circle cx="18" cy="37" r="3.6" fill="#9A1B2C"/>
  <path d="M18 7.5 C11 7.5, 9 13, 9 20 C9 26, 7.5 29.5, 4 32 L32 32 C28.5 29.5, 27 26, 27 20 C27 13, 25 7.5, 18 7.5Z" fill="#C9A227"/>
  <rect x="3" y="30.5" width="30" height="4.5" rx="2.25" fill="#E2B93B"/>
  <path d="M14 12 C12 15, 12 20, 12.5 25" fill="none" stroke="#FFF6E8" stroke-opacity="0.55" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M10 22 Q18 25 26 22" fill="none" stroke="#9A7A12" stroke-opacity="0.45" stroke-width="1.4"/>
</svg>`;

function newId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function defaultState() {
  return {
    title: DEFAULT_TITLE,
    budget: "",
    date: "",
    people: [
      { id: newId(), name: "", phone: "" },
      { id: newId(), name: "", phone: "" },
    ],
    exclusions: [],
    draw: null,
    sent: {},
    revealAll: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return defaultState();
    return {
      ...defaultState(),
      ...data,
      title: (typeof data.title === "string" && data.title.trim() ? data.title.trim() : DEFAULT_TITLE),
      people: Array.isArray(data.people) && data.people.length ? data.people : defaultState().people,
      exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
      sent: data.sent && typeof data.sent === "object" ? data.sent : {},
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function demoState() {
  const ids = ["p_maya", "p_jordan", "p_sam", "p_riley", "p_alex"];
  const folks = [
    { id: ids[0], name: "Maya", phone: "(555) 010-1001" },
    { id: ids[1], name: "Jordan", phone: "(555) 010-1002" },
    { id: ids[2], name: "Sam", phone: "(555) 010-1003" },
    { id: ids[3], name: "Riley", phone: "(555) 010-1004" },
    { id: ids[4], name: "Alex", phone: "(555) 010-1005" },
  ];
  const exclusions = [{ id: "x1", a: ids[0], b: ids[1] }];
  let seed = 2026;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const result = drawMatches(folks, exclusions, { rng });
  return {
    title: DEFAULT_TITLE,
    budget: "25",
    date: "2026-12-24",
    people: folks,
    exclusions,
    draw: result.ok ? { matches: result.matches, drawnAt: "2026-12-01T00:00:00.000Z" } : null,
    sent: result.ok ? { [ids[0]]: true } : {},
    revealAll: false,
  };
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function makeSnow() {
  const root = document.getElementById("snow");
  root.innerHTML = "";
  if (prefersReducedMotion()) return;
  const count = 36;
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("span");
    flake.className = "flake";
    flake.textContent = Math.random() > 0.7 ? "✦" : "•";
    const size = 8 + Math.random() * 12;
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.fontSize = `${size}px`;
    flake.style.animationDuration = `${8 + Math.random() * 10}s`;
    flake.style.animationDelay = `${-Math.random() * 12}s`;
    flake.style.setProperty("--drift", `${-40 + Math.random() * 80}px`);
    flake.style.opacity = String(0.5 + Math.random() * 0.5);
    root.appendChild(flake);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function personName(state, id) {
  return state.people.find((p) => p.id === id)?.name?.trim() || "Friend";
}

function filledPeople(state) {
  return state.people.filter((p) => p.name.trim());
}

function revealUrl(token) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = `r/${token}`;
  return url.toString();
}

function tokenFor(state, giverId) {
  const match = state.draw?.matches.find((m) => m.giverId === giverId);
  if (!match) return "";
  return encodePayload({
    title: state.title.trim() || DEFAULT_TITLE,
    giver: personName(state, giverId),
    receiver: personName(state, match.receiverId),
    budget: formatBudget(state.budget),
    date: formatDate(state.date),
  });
}

function showToast(message) {
  const root = document.getElementById("toast-root");
  root.innerHTML = `<div class="toast" role="status">${escapeHtml(message)}</div>`;
  setTimeout(() => {
    if (root.firstChild) root.innerHTML = "";
  }, 2200);
}

function confirmDialog(message, okLabel = "Yes") {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-msg">
        <div class="modal-card">
          <p id="modal-msg">${escapeHtml(message)}</p>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
            <button type="button" class="btn btn-primary" data-ok>${escapeHtml(okLabel)}</button>
          </div>
        </div>
      </div>`;
    const close = (value) => {
      root.innerHTML = "";
      resolve(value);
    };
    root.querySelector("[data-cancel]").addEventListener("click", () => close(false));
    root.querySelector("[data-ok]").addEventListener("click", () => close(true));
    root.querySelector(".modal").addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) close(false);
    });
    root.querySelector("[data-ok]").focus();
  });
}

function renderBanner(title, editable) {
  return `
    <header class="banner">
      ${HAT_SVG}
      ${ORNAMENT("#C9A227", "ornament-left")}
      ${ORNAMENT("#2E6B50", "ornament-right")}
      ${
        editable
          ? `<h1 class="title-display" id="title-input" contenteditable="true"
               role="textbox" aria-label="Family title" spellcheck="false">${escapeHtml(title)}</h1>`
          : `<h1 class="title-display">${escapeHtml(title)}</h1>`
      }
      <p class="banner-sub">Ho ho ho! Let the merry mischief begin</p>
    </header>`;
}

function renderOrganizer(state, error) {
  const ready = filledPeople(state);
  const drawn = Boolean(state.draw?.matches?.length);
  const peopleOptions = (selected) =>
    ready
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}" ${p.id === selected ? "selected" : ""}>${escapeHtml(p.name)}</option>`
      )
      .join("");

  const peopleRows = state.people
    .map(
      (p, i) => `
      <div class="person" data-id="${escapeHtml(p.id)}">
        <div class="fields">
          <div class="field">
            <label for="name-${i}">Name</label>
            <input id="name-${i}" type="text" autocomplete="name" placeholder="Name" value="${escapeHtml(p.name)}" data-field="name" />
          </div>
          <div class="field">
            <label for="phone-${i}">Phone</label>
            <input id="phone-${i}" type="tel" autocomplete="tel" inputmode="tel" placeholder="555-010-1001" value="${escapeHtml(p.phone)}" data-field="phone" />
          </div>
        </div>
        <button type="button" class="icon-btn" data-remove-person="${escapeHtml(p.id)}" aria-label="Remove ${escapeHtml(p.name || "person")}">×</button>
      </div>`
    )
    .join("");

  const exclusionChips = state.exclusions
    .map((ex) => {
      const a = personName(state, ex.a);
      const b = personName(state, ex.b);
      return `<div class="chip">
        <span>${escapeHtml(a)} ↔ ${escapeHtml(b)}</span>
        <button type="button" class="icon-btn" data-remove-ex="${escapeHtml(ex.id)}" aria-label="Remove exclusion for ${escapeHtml(a)} and ${escapeHtml(b)}" style="min-width:52px;min-height:52px;border-radius:999px">×</button>
      </div>`;
    })
    .join("");

  const sendList = drawn
    ? state.draw.matches
        .map((m) => {
          const giver = state.people.find((p) => p.id === m.giverId);
          if (!giver) return "";
          const sent = Boolean(state.sent[m.giverId]);
          const token = tokenFor(state, m.giverId);
          return `
            <div class="send-card" data-giver="${escapeHtml(m.giverId)}">
              <div class="who">
                <span>${escapeHtml(giver.name || "Friend")}</span>
                <span class="phone">${escapeHtml(giver.phone || "no number yet")}</span>
              </div>
              <div class="send-actions">
                <a class="btn btn-primary" data-send="${escapeHtml(m.giverId)}" data-reveal="${escapeHtml(token)}"
                   href="${escapeHtml(smsUri(giver.phone, composeSms({
                     giverName: giver.name || "Friend",
                     title: state.title,
                     link: revealUrl(token),
                     budget: state.budget,
                     date: state.date,
                   })))}">Send text</a>
                ${sent ? `<span class="sent-tick" aria-label="Sent">✓ Sent</span>` : `<button type="button" class="btn btn-ghost" data-copy="${escapeHtml(token)}">Copy link</button>`}
              </div>
              ${sent ? `<button type="button" class="tiny-link" data-copy="${escapeHtml(token)}">Copy their link again</button>` : ""}
            </div>`;
        })
        .join("")
    : "";

  const matchList =
    drawn && state.revealAll
      ? `<ul class="match-table">
          ${state.draw.matches
            .map((m) => {
              const g = personName(state, m.giverId);
              const r = personName(state, m.receiverId);
              return `<li><span>${escapeHtml(g)}</span><span class="arrow">is buying for</span><span>${escapeHtml(r)}</span></li>`;
            })
            .join("")}
        </ul>`
      : "";

  return `
    ${renderBanner(state.title, true)}
    ${error ? `<div class="error" role="alert">${escapeHtml(error)}</div>` : ""}

    ${
      drawn
        ? `<section class="card">
            <h2>Matches are ready</h2>
            <p class="lede">Send each person their private link from your own Messages app. Their name stays hidden here unless you reveal all.</p>
            <div class="secret-note">
              ${formatBudget(state.budget) ? `<div>Budget: ${escapeHtml(formatBudget(state.budget))}</div>` : ""}
              ${formatDate(state.date) ? `<div>Exchange: ${escapeHtml(formatDate(state.date))}</div>` : ""}
              <div>${ready.length} people in the draw</div>
            </div>
            ${sendList}
            <div class="actions">
              <button type="button" class="btn btn-secondary" id="redraw-btn">Draw again</button>
              <button type="button" class="btn btn-ghost" id="reveal-all-btn">${state.revealAll ? "Hide matches" : "Reveal all matches"}</button>
            </div>
            ${matchList}
          </section>`
        : ""
    }

    <section class="card">
      <h2>Party details</h2>
      <div class="field">
        <label for="budget">Budget (optional)</label>
        <input id="budget" type="text" inputmode="decimal" placeholder="$25" value="${escapeHtml(state.budget)}" />
      </div>
      <div class="field">
        <label for="date">Exchange date (optional)</label>
        <input id="date" type="date" value="${escapeHtml(state.date)}" />
      </div>
    </section>

    <section class="card">
      <h2>Who's in</h2>
      <p class="lede">Add everyone, then we'll make sure nobody draws themselves.</p>
      <div id="people-list">${peopleRows}</div>
      <button type="button" class="btn btn-ghost" id="add-person">+ Add a person</button>
    </section>

    <section class="card">
      <h2>Don't match these pairs</h2>
      <p class="lede">Handy for spouses or anyone who shouldn't buy for each other.</p>
      ${exclusionChips ? `<div class="chip-list">${exclusionChips}</div>` : ""}
      <div class="exclusion-row">
        <select id="ex-a" ${ready.length < 2 ? "disabled" : ""}>
          <option value="">Someone</option>
          ${peopleOptions("")}
        </select>
        <span class="amp" aria-hidden="true">↔</span>
        <select id="ex-b" ${ready.length < 2 ? "disabled" : ""}>
          <option value="">Someone</option>
          ${peopleOptions("")}
        </select>
        <button type="button" class="icon-btn" id="add-ex" aria-label="Add exclusion" ${ready.length < 2 ? "disabled" : ""}>+</button>
      </div>
    </section>

    ${
      !drawn
        ? `<div class="actions">
            <button type="button" class="btn btn-primary" id="draw-btn">Draw names</button>
          </div>`
        : ""
    }
    <button type="button" class="tiny-link" id="reset-btn">Clear this device's draft</button>
  `;
}

function renderReveal(payload, invalid) {
  const title = (payload?.title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;
  if (invalid || !payload?.receiver) {
    return `
      ${renderBanner(title, false)}
      <section class="card reveal-page">
        <h2>This link looks incomplete</h2>
        <p class="lede">Ask the organizer to send you a fresh text with your Secret Santa link.</p>
      </section>`;
  }
  const reduced = prefersReducedMotion() ? "reduce-motion" : "";
  const meta = [payload.budget, payload.date].filter(Boolean).join(" · ");
  return `
    ${renderBanner(title, false)}
    <section class="card reveal-page" id="reveal-card">
      <div class="bells" aria-hidden="true">${BELL_SVG}${BELL_SVG}</div>
      <p class="you-buy">You're buying for</p>
      <p class="receiver-name" id="receiver-name">${escapeHtml(payload.receiver)}</p>
      <div class="gift-stage">
        <div class="gift" aria-hidden="true">
          ${BOW_SVG}
          <div class="gift-lid"></div>
          <div class="gift-box">
            <div class="ribbon-v"></div>
            <div class="ribbon-h"></div>
          </div>
        </div>
      </div>
      ${meta ? `<p class="reveal-meta">${escapeHtml(meta)}</p>` : ""}
      <p class="lede">Shhh — this page is just for you. Happy gifting from ${escapeHtml(title)}!</p>
    </section>
  `;
}

function bindOrganizer(app, state, setState) {
  const titleInput = app.querySelector("#title-input");
  if (titleInput) {
    const readTitle = () => (titleInput.textContent || "").replace(/\s+/g, " ").trim();
    titleInput.addEventListener("input", () => {
      state.title = readTitle();
      document.title = state.title || DEFAULT_TITLE;
      saveState(state);
    });
    titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        titleInput.blur();
      }
    });
    titleInput.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = (event.clipboardData?.getData("text/plain") || "")
        .replace(/\s+/g, " ")
        .slice(0, 80);
      document.execCommand("insertText", false, text);
    });
    titleInput.addEventListener("blur", () => {
      if (!readTitle()) {
        state.title = DEFAULT_TITLE;
        titleInput.textContent = DEFAULT_TITLE;
        document.title = DEFAULT_TITLE;
        saveState(state);
      }
    });
  }

  const budget = app.querySelector("#budget");
  const date = app.querySelector("#date");
  budget?.addEventListener("input", () => {
    state.budget = budget.value;
    saveState(state);
  });
  date?.addEventListener("input", () => {
    state.date = date.value;
    saveState(state);
  });

  app.querySelectorAll(".person").forEach((row) => {
    const id = row.getAttribute("data-id");
    const person = state.people.find((p) => p.id === id);
    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        person[input.getAttribute("data-field")] = input.value;
        saveState(state);
      });
      if (input.getAttribute("data-field") === "name") {
        input.addEventListener("change", () => setState(state));
      }
    });
  });

  app.querySelector("#add-person")?.addEventListener("click", () => {
    state.people.push({ id: newId(), name: "", phone: "" });
    setState(state);
    queueMicrotask(() => {
      const inputs = document.querySelectorAll('#people-list input[data-field="name"]');
      inputs[inputs.length - 1]?.focus();
    });
  });

  app.querySelectorAll("[data-remove-person]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-person");
      if (state.people.length <= 2) {
        showToast("Keep at least two people on the list.");
        return;
      }
      state.people = state.people.filter((p) => p.id !== id);
      state.exclusions = state.exclusions.filter((ex) => ex.a !== id && ex.b !== id);
      if (state.draw) {
        state.draw = null;
        state.sent = {};
        state.revealAll = false;
        showToast("Matches were cleared because the list changed.");
      }
      setState(state);
    });
  });

  app.querySelector("#add-ex")?.addEventListener("click", () => {
    const a = app.querySelector("#ex-a").value;
    const b = app.querySelector("#ex-b").value;
    if (!a || !b || a === b) {
      showToast("Pick two different people.");
      return;
    }
    const exists = state.exclusions.some(
      (ex) => (ex.a === a && ex.b === b) || (ex.a === b && ex.b === a)
    );
    if (exists) {
      showToast("That pair is already on the list.");
      return;
    }
    state.exclusions.push({ id: newId(), a, b });
    if (state.draw) {
      state.draw = null;
      state.sent = {};
      state.revealAll = false;
    }
    setState(state);
  });

  app.querySelectorAll("[data-remove-ex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.exclusions = state.exclusions.filter((ex) => ex.id !== btn.getAttribute("data-remove-ex"));
      if (state.draw) {
        state.draw = null;
        state.sent = {};
        state.revealAll = false;
      }
      setState(state);
    });
  });

  const doDraw = () => {
    const folks = filledPeople(state);
    if (folks.length < 2) {
      setState(state, "Add at least two names before drawing.");
      return;
    }
    const result = drawMatches(
      folks,
      state.exclusions.filter((ex) => folks.some((p) => p.id === ex.a) && folks.some((p) => p.id === ex.b))
    );
    if (!result.ok) {
      state.draw = null;
      state.sent = {};
      state.revealAll = false;
      setState(state, result.error);
      return;
    }
    state.draw = { matches: result.matches, drawnAt: new Date().toISOString() };
    state.sent = {};
    state.revealAll = false;
    setState(state);
    showToast("Names are drawn — now send the texts!");
  };

  app.querySelector("#draw-btn")?.addEventListener("click", doDraw);

  app.querySelector("#redraw-btn")?.addEventListener("click", async () => {
    const ok = await confirmDialog(
      "Drawing again creates new matches and clears the sent ticks. Continue?",
      "Draw again"
    );
    if (ok) doDraw();
  });

  app.querySelector("#reveal-all-btn")?.addEventListener("click", async () => {
    if (state.revealAll) {
      state.revealAll = false;
      setState(state);
      return;
    }
    const ok = await confirmDialog(
      "This will show every match on this screen, including yours. Are you sure?",
      "Reveal all"
    );
    if (ok) {
      state.revealAll = true;
      setState(state);
    }
  });

  app.querySelectorAll("[data-send]").forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("data-send");
      state.sent[id] = true;
      saveState(state);
      // Refresh the tick without breaking the sms: navigation.
      const card = link.closest(".send-card");
      const actions = card?.querySelector(".send-actions");
      if (actions && !card.querySelector(".sent-tick")) {
        const copyBtn = actions.querySelector("[data-copy]");
        const tick = document.createElement("span");
        tick.className = "sent-tick";
        tick.setAttribute("aria-label", "Sent");
        tick.textContent = "✓ Sent";
        copyBtn?.replaceWith(tick);
        if (!card.querySelector(".tiny-link")) {
          const again = document.createElement("button");
          again.type = "button";
          again.className = "tiny-link";
          again.setAttribute("data-copy", link.getAttribute("data-reveal") || "");
          again.textContent = "Copy their link again";
          again.addEventListener("click", () => copyLink(again.getAttribute("data-copy")));
          card.appendChild(again);
        }
      }
    });
  });

  app.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyLink(btn.getAttribute("data-copy")));
  });

  app.querySelector("#reset-btn")?.addEventListener("click", async () => {
    const ok = await confirmDialog("Clear the saved draft on this device? This won't unsend any texts already delivered.", "Clear draft");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
    showToast("Draft cleared.");
  });
}

async function copyLink(token) {
  const url = revealUrl(token);
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copied.");
  } catch {
    window.prompt("Copy this link:", url);
  }
}

function startRevealAnimation() {
  const card = document.getElementById("reveal-card");
  if (!card) return;
  const kick = () => card.classList.add("unwrapped");
  if (prefersReducedMotion()) kick();
  else requestAnimationFrame(() => setTimeout(kick, 250));
}

function render() {
  const app = document.getElementById("app");
  const footnote = document.getElementById("footnote");
  const token = parseRevealHash(window.location.hash);
  document.body.classList.toggle("reduce-motion", prefersReducedMotion());

  if (token) {
    const payload = decodePayload(token);
    document.title = (payload?.title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;
    app.innerHTML = renderReveal(payload, !payload);
    footnote.textContent =
      "This link hides the name with a light scramble, not a lock. Anyone who has the link can see the match.";
    startRevealAnimation();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let state;
  if (params.get("demo") === "1") {
    state = demoState();
    // Demo is for preview/screenshots; don't overwrite a real family draft unless empty.
    if (!localStorage.getItem(STORAGE_KEY)) saveState(state);
  } else {
    state = loadState();
  }

  let currentError = "";
  const setState = (next, error = "") => {
    state = next;
    currentError = error;
    saveState(state);
    document.title = state.title.trim() || DEFAULT_TITLE;
    app.innerHTML = renderOrganizer(state, currentError);
    bindOrganizer(app, state, setState);
  };

  document.title = state.title.trim() || DEFAULT_TITLE;
  app.innerHTML = renderOrganizer(state, "");
  bindOrganizer(app, state, setState);
  footnote.innerHTML =
    "Drafts stay on this device. Reveal links use a light scramble, not real encryption — anyone with a link can see that one match.";
}

makeSnow();
render();
window.addEventListener("hashchange", render);
