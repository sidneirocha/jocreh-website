const services = [
  { title: "Recepção", image: "./assets/service-recepcao.webp", alt: "Recepcionista atendendo uma visitante" },
  { title: "Limpeza Geral", image: "./assets/service-limpeza.webp", alt: "Profissional realizando serviço de limpeza" },
  { title: "Controle de Acesso", image: "./assets/service-controle.webp", alt: "Profissional na recepção controlando o acesso" },
  { title: "Estacionamento", image: "./assets/service-estacionamento.webp", alt: "Motorista profissional ao volante" },
  { title: "Locação de equipamentos médicos", image: "./assets/service-locacao.webp", alt: "Equipamento hospitalar em uma unidade de atendimento" },
  { title: "Manutenção", image: "./assets/service-manutencao.webp", alt: "Profissional técnico em serviço de manutenção" },
  { title: "Equipe para clínicas e hospitais", image: "./assets/service-equipe.webp", alt: "Profissional de saúde em um centro cirúrgico" },
  { title: "Manutenção de Ar Condicionado", image: "./assets/service-ar.webp", alt: "Técnico prestando serviço em uma residência" }
];

const track = document.querySelector("#carousel-track");
const dots = document.querySelector("#carousel-dots");
let current = 0;
let autoplay;
let touchStart = null;

services.forEach((service, index) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "service-card";
  card.setAttribute("aria-label", `Ver serviço: ${service.title}`);
  card.innerHTML = `<img src="${service.image}" alt="${service.alt}"><span class="service-title">${service.title}</span>`;
  card.addEventListener("click", () => showService(index));
  track.append(card);

  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "carousel-dot";
  dot.setAttribute("aria-label", `Mostrar ${service.title}`);
  dot.addEventListener("click", () => showService(index));
  dots.append(dot);
});

function showService(index) {
  current = (index + services.length) % services.length;
  [...track.children].forEach((card, i) => {
    card.classList.remove("is-current", "is-prev", "is-next", "is-hidden");
    if (i === current) card.classList.add("is-current");
    else if (i === (current - 1 + services.length) % services.length) card.classList.add("is-prev");
    else if (i === (current + 1) % services.length) card.classList.add("is-next");
    else card.classList.add("is-hidden");
    card.setAttribute("aria-pressed", String(i === current));
  });
  [...dots.children].forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
}

function restartAutoplay() {
  window.clearInterval(autoplay);
  autoplay = window.setInterval(() => showService(current + 1), 6500);
}

document.querySelector(".carousel-arrow.previous").addEventListener("click", () => { showService(current - 1); restartAutoplay(); });
document.querySelector(".carousel-arrow.next").addEventListener("click", () => { showService(current + 1); restartAutoplay(); });
const carousel = document.querySelector(".carousel");
carousel.addEventListener("mouseenter", () => window.clearInterval(autoplay));
carousel.addEventListener("mouseleave", restartAutoplay);
carousel.addEventListener("focusin", () => window.clearInterval(autoplay));
carousel.addEventListener("focusout", restartAutoplay);
carousel.addEventListener("touchstart", event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
carousel.addEventListener("touchend", event => {
  if (touchStart === null) return;
  const delta = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(delta) > 45) showService(current + (delta < 0 ? 1 : -1));
  touchStart = null;
  restartAutoplay();
}, { passive: true });
showService(0);
restartAutoplay();

const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menu");
  mobileNav.hidden = true;
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });

const framerConfig = {
  siteId: "411c551f11d9a79c944a410e160a926b39c9e3f7d5f6317d7aa49164f0e22b7c",
  hpNames: ["website", "company", "message", "subject", "title", "description", "feedback", "notes", "details", "remarks", "comments"]
};
const pageLoadedAt = Date.now();

function createFramerPow() {
  const workerCode = `
    async function sha256(value) {
      const data = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    }
    function randomToken(length) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let token = "";
      for (let i = 0; i < length; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
      return token;
    }
    self.addEventListener("message", async event => {
      const {salt, difficulty, tokenLength, maxTime} = event.data;
      const prefix = "0".repeat(difficulty);
      const start = performance.now();
      while (performance.now() - start <= maxTime) {
        const secret = Date.now() + ":" + randomToken(tokenLength);
        const hash = await sha256(salt + secret);
        if (hash.startsWith(prefix)) {
          self.postMessage({success: true, secret, hash});
          return;
        }
      }
      self.postMessage({success: false});
    });
  `;
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(new Blob([workerCode], {type: "application/javascript"}));
    const worker = new Worker(blobUrl);
    const timeout = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Não foi possível validar a proteção antispam."));
    }, 11000);
    worker.addEventListener("message", event => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      if (event.data.success) resolve(event.data);
      else reject(new Error("Não foi possível validar a proteção antispam."));
    }, {once: true});
    worker.addEventListener("error", error => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      reject(error);
    }, {once: true});
    worker.postMessage({salt: "framer", difficulty: 3, tokenLength: 30, maxTime: 10000});
  });
}

function appendUtmTags(formData) {
  try {
    const match = document.cookie.match(/(^|;) ?framerFormsUTMTags=([^;]*)(;|$)/);
    if (!match?.[2]) return;
    const tags = JSON.parse(decodeURIComponent(match[2]));
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"].forEach(key => {
      if (typeof tags?.[key] === "string") formData.append(key, tags[key]);
    });
  } catch {}
}

function appendFramerSpamMetadata(formData) {
  const filled = [];
  for (const name of framerConfig.hpNames) {
    const fieldName = `__framer_${name}`;
    const value = formData.get(fieldName) || "";
    formData.delete(fieldName);
    if (value) {
      filled.push(JSON.stringify({0: name, 1: value, 2: false, 3: false, 4: false, 5: "0.00", 6: false}));
    }
  }
  formData.append("__framer_fieldData", `[${filled.join(",")}]`);
  formData.append("__framer_fieldCount", String(framerConfig.hpNames.length));
  formData.append("__framer_fieldFilledCount", String(filled.length));
  formData.append("__framer_hpVersion", "3");
  formData.append("__framer_siteId", framerConfig.siteId);
  formData.append("__framer_timeToSubmissionSinceModuleLoad", ((Date.now() - pageLoadedAt) / 1000).toFixed(2));
}

document.querySelector("#contact-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const note = document.querySelector("#form-note");
  const button = form.querySelector(".submit-button");
  if (!form.reportValidity() || button.disabled) return;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  note.textContent = "Enviando mensagem…";
  try {
    const pow = await createFramerPow();
    const data = new FormData(form);
    appendFramerSpamMetadata(data);
    appendUtmTags(data);
    for (const [key, value] of data) if (value instanceof File) data.delete(key);
    const response = await fetch(form.action, {
      method: "POST",
      body: data,
      headers: {
        "Framer-Site-Id": framerConfig.siteId,
        "Framer-POW": pow.secret,
        "Framer-Form-Fields": Array.from(data.keys()).map(encodeURIComponent).join(",")
      }
    });
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json())?.error?.message || ""; } catch {}
      throw new Error(detail || "O envio não foi aceito pelo serviço de formulários.");
    }
    note.textContent = "Mensagem enviada. Obrigado pelo contato!";
    form.reset();
  } catch (error) {
    console.error("Jocreh form submission failed", error);
    note.textContent = error instanceof TypeError
      ? "Não foi possível conectar ao formulário da Jocreh a partir deste domínio."
      : error.message || "Não foi possível enviar a mensagem. Tente novamente.";
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", () => closeMenu());
});
