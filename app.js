import { generateTrustMap } from "./logic.js";

const positions = [
  { left: "19%", top: "20%" },
  { left: "81%", top: "20%" },
  { left: "14%", top: "76%" },
  { left: "50%", top: "88%" },
  { left: "86%", top: "76%" }
];
const statuses = {};
let currentMap;

const mapForm = document.querySelector("#map-form");
const surfaceList = document.querySelector("#surface-list");
const mapNodes = document.querySelector("#map-nodes");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formValues() {
  return {
    product: document.querySelector("#product").value,
    buyer: document.querySelector("#buyer").value,
    type: document.querySelector("#type").value,
    price: document.querySelector("#price").value
  };
}

function buildStatusControl(surface) {
  return ["empty", "thin", "strong"].map((status) => `
    <button
      type="button"
      data-surface="${surface.id}"
      data-status="${status}"
      class="${surface.status === status ? "active" : ""}"
      aria-pressed="${surface.status === status}"
    >${status[0].toUpperCase() + status.slice(1)}</button>
  `).join("");
}

function renderMapNodes(surfaces) {
  mapNodes.innerHTML = surfaces.map((surface, index) => `
    <div
      class="map-node status-${surface.status}"
      style="--left:${positions[index].left}; --top:${positions[index].top}"
      title="${escapeHtml(surface.label)}: ${surface.status}"
    >
      <span>${index + 1}</span>
      <strong>${escapeHtml(surface.shortLabel)}</strong>
    </div>
  `).join("");
}

function renderSurfaceList(surfaces) {
  surfaceList.innerHTML = surfaces.map((surface, index) => `
    <li class="surface-row status-${surface.status}">
      <div class="rank">${String(index + 1).padStart(2, "0")}</div>
      <div class="surface-copy">
        <div class="surface-title">
          <h3>${escapeHtml(surface.label)}</h3>
          <span>${surface.status === "empty" ? "Build first" : surface.status === "thin" ? "Strengthen" : "Defend"}</span>
        </div>
        <p>${escapeHtml(surface.prompt)}</p>
        <details>
          <summary>Why this matters <span aria-hidden="true">+</span></summary>
          <p>${escapeHtml(surface.reason)}</p>
        </details>
      </div>
      <div class="status-control" aria-label="${escapeHtml(surface.label)} status">
        ${buildStatusControl(surface)}
      </div>
    </li>
  `).join("");
}

function renderSequence(surfaces) {
  document.querySelector("#action-sequence").innerHTML = surfaces.slice(0, 3).map((surface, index) => `
    <li>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div>
        <strong>${index === 0 ? "Make it exist" : index === 1 ? "Make it specific" : "Make it repeat"}</strong>
        <p>${escapeHtml(surface.label)}: ${escapeHtml(surface.prompt)}</p>
      </div>
    </li>
  `).join("");
}

function render() {
  currentMap = generateTrustMap(formValues(), statuses);
  const buyerLabel = currentMap.buyer.length > 34 ? `${currentMap.buyer.slice(0, 31)}…` : currentMap.buyer;

  document.querySelector("#buyer-short").textContent = buyerLabel;
  document.querySelector("#coverage-score").textContent = `${currentMap.coverage}%`;
  document.querySelector("#coverage-fill").style.width = `${currentMap.coverage}%`;
  document.querySelector("#coverage-note").textContent =
    `${currentMap.emptyCount} empty · ${currentMap.thinCount} thin · ${currentMap.strongCount} strong`;
  renderMapNodes(currentMap.surfaces);
  renderSurfaceList(currentMap.surfaces);
  renderSequence(currentMap.surfaces);
}

mapForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!mapForm.reportValidity()) return;
  Object.keys(statuses).forEach((key) => delete statuses[key]);
  render();
  document.querySelector(".results-section").scrollIntoView({ behavior: "smooth", block: "start" });
});

surfaceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-surface][data-status]");
  if (!button) return;
  statuses[button.dataset.surface] = button.dataset.status;
  render();
});

surfaceList.addEventListener("toggle", (event) => {
  if (event.target.tagName !== "DETAILS") return;
  event.target.querySelector("summary span").textContent = event.target.open ? "−" : "+";
}, true);

document.querySelector("#copy-map").addEventListener("click", async (event) => {
  const summary = [
    `ZERO-BUDGET TRUST MAP`,
    `${currentMap.product} → ${currentMap.buyer}`,
    `Trust coverage: ${currentMap.coverage}%`,
    "",
    ...currentMap.surfaces.map((surface, index) =>
      `${index + 1}. ${surface.label} [${surface.status.toUpperCase()}]\n   ${surface.prompt}`
    ),
    "",
    "Built with Petrichor Projects · petrichorgrowth.com"
  ].join("\n");

  const button = event.currentTarget;
  const original = button.innerHTML;
  let copied = false;

  try {
    await navigator.clipboard.writeText(summary);
    copied = true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = summary;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    copied = document.execCommand("copy");
    fallback.remove();
  }

  button.textContent = copied ? "Copied" : "Copy unavailable";
  setTimeout(() => { button.innerHTML = original; }, 1600);
});

render();