document.documentElement.classList.add("js");

const sectionRevealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        sectionRevealObserver.unobserve(entry.target);
      });
    }, {threshold: 0.12, rootMargin: "0px 0px -8% 0px"})
  : null;

document.querySelectorAll("main > section:not(.hero)").forEach(section => {
  if (sectionRevealObserver) sectionRevealObserver.observe(section);
  else section.classList.add("is-visible");
});

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

const turnstileConfig = {
  sitekey: "0x4AAAAAAF4y4sjW3EKPV13O",
  action: "contato"
};
let turnstileToken = "";
let turnstileWidget = null;

function initTurnstile() {
  const container = document.querySelector("#turnstile-widget");
  if (!container || !window.turnstile || turnstileWidget !== null) return;
  turnstileWidget = window.turnstile.render(container, {
    sitekey: turnstileConfig.sitekey,
    action: turnstileConfig.action,
    theme: "light",
    callback: token => { turnstileToken = token; },
    "expired-callback": () => { turnstileToken = ""; },
    "error-callback": () => { turnstileToken = ""; }
  });
}

window.initTurnstile = initTurnstile;
const turnstileScript = document.createElement("script");
turnstileScript.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=initTurnstile&render=explicit";
turnstileScript.async = true;
turnstileScript.defer = true;
document.head.appendChild(turnstileScript);

function createRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

document.querySelector("#contact-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const note = document.querySelector("#form-note");
  const button = form.querySelector(".submit-button");
  if (!form.reportValidity() || button.disabled) return;
  if (!turnstileToken) {
    note.textContent = "Confirme a verificação antispam para continuar.";
    return;
  }

  const formData = new FormData(form);
  const payload = {
    nome: formData.get("Name"),
    email: formData.get("Email Address"),
    servico: formData.get("Service"),
    mensagem: formData.get("Message"),
    website: formData.get("website") || "",
    requestId: createRequestId(),
    turnstileToken
  };

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  note.textContent = "Enviando mensagem…";
  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      credentials: "omit",
      redirect: "follow"
    });
    if (!response.ok) {
      throw new Error("O envio não foi aceito pelo serviço de formulários.");
    }
    const result = await response.json();
    if (result.ok !== true) throw new Error(result.message || "Não foi possível enviar a mensagem.");
    note.textContent = "Mensagem enviada. Obrigado pelo contato!";
    form.reset();
  } catch (error) {
    console.error("Jocreh form submission failed", error);
    note.textContent = error instanceof TypeError
      ? "Não foi possível conectar ao serviço de formulários."
      : error.message || "Não foi possível enviar a mensagem. Tente novamente.";
  } finally {
    if (window.turnstile && turnstileWidget !== null) {
      window.turnstile.reset(turnstileWidget);
      turnstileToken = "";
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", () => closeMenu());
});
