// Código exclusivo da Jocreh. Execute criarFormulario() antes de implantar.
// Depois de criar a planilha, execute finalizarCriacao().

const PLANILHA_ID = "";
const ABA_ID = 0;
const DESTINATARIOS = ["contato@jocreh.com.br"];
const NOME_CLIENTE = "Jocreh";
const NOME_REMETENTE = "Jocreh Soluções";
const REMETENTE = "";
const ASSUNTO = "Novo contato pelo site — Jocreh";
const TURNSTILE_ACTION = "contato";
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
const ANTISPAM = {
  ativo: true,
  dominios: ["jocreh.com.br", "www.jocreh.com.br"],
  intervalo: 120,
  maxPorMinuto: 10
};

const EXTRAS = [{
  key: "servico",
  label: "Serviço",
  placeholder: "Selecione",
  question: "Serviço",
  type: "select",
  required: true,
  error: "Preencha este campo.",
  invalid: "Informe um valor válido.",
  options: [
    "Recepção",
    "Manutenção",
    "Locação de equipamentos médicos",
    "Limpeza Geral",
    "Controle de Acesso",
    "Estacionamento",
    "Equipe para clínicas e hospitias",
    "Manutenção de ar condicionado"
  ]
}];

const DEFINICOES = [
  {key: "nome", label: "Nome", question: "Nome", type: "text", required: true},
  {key: "email", label: "E-mail", question: "E-mail", type: "email", required: true},
  EXTRAS[0],
  {key: "mensagem", label: "Mensagem", question: "Mensagem", type: "textarea", required: true}
];

const CAMPOS = {
  nome: "Nome",
  email: "E-mail",
  servico: "Serviço",
  mensagem: "Mensagem"
};

function configurar() {
  validarDestinatarios();
  if (
    ANTISPAM.ativo &&
    (!PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET") ||
      !ANTISPAM.dominios.length)
  ) {
    throw new Error(
      "Configure TURNSTILE_SECRET nas Propriedades do script e os domínios permitidos."
    );
  }

  autorizarEmails();
  if (REMETENTE && !GmailApp.getAliases().includes(REMETENTE)) {
    throw new Error(
      "Remetente não autorizado. Configure-o como alias na conta que executa o script."
    );
  }

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = PLANILHA_ID || props.getProperty("PLANILHA_CRIADA");
  if (!spreadsheetId) {
    throw new Error("Execute criarFormulario() ou preencha PLANILHA_ID.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheetId = PLANILHA_ID
    ? ABA_ID
    : Number(props.getProperty("ABA_CRIADA"));
  const sheet = spreadsheet
    .getSheets()
    .find(item => item.getSheetId() === sheetId);

  if (!sheet) throw new Error("Aba de respostas não encontrada. Confira ABA_ID.");

  const formUrl = sheet.getFormUrl();
  if (!formUrl) throw new Error("A aba não está vinculada a um Google Forms.");

  const form = FormApp.openByUrl(formUrl);
  const mapa = {};
  const supportedTypes = [
    FormApp.ItemType.TEXT,
    FormApp.ItemType.PARAGRAPH_TEXT,
    FormApp.ItemType.LIST
  ];
  const textItems = form.getItems().filter(item => supportedTypes.includes(item.getType()));
  const questions = form.getItems().filter(item => ![
    FormApp.ItemType.SECTION_HEADER,
    FormApp.ItemType.PAGE_BREAK,
    FormApp.ItemType.IMAGE,
    FormApp.ItemType.VIDEO
  ].includes(item.getType()));

  if (
    questions.length !== Object.keys(CAMPOS).length ||
    textItems.length !== Object.keys(CAMPOS).length
  ) {
    throw new Error("Confira os títulos, tipos e quantidade de perguntas indicados.");
  }

  for (const [key, title] of Object.entries(CAMPOS)) {
    const matches = textItems.filter(
      item => normalizar(item.getTitle()) === normalizar(title)
    );
    if (matches.length !== 1) {
      throw new Error("Confira o título da pergunta: " + title);
    }

    const item = matches[0];
    const spec = DEFINICOES.find(definition => definition.key === key);
    if (spec) {
      const expectedType = spec.type === "select"
        ? FormApp.ItemType.LIST
        : spec.type === "textarea"
          ? FormApp.ItemType.PARAGRAPH_TEXT
          : FormApp.ItemType.TEXT;
      if (item.getType() !== expectedType) {
        throw new Error("Tipo da pergunta incompatível: " + title);
      }

      const typed = spec.type === "select"
        ? item.asListItem()
        : spec.type === "textarea"
          ? item.asParagraphTextItem()
          : item.asTextItem();
      if (typed.isRequired() !== spec.required) {
        throw new Error("Confira se a pergunta é obrigatória: " + title);
      }

      if (spec.type === "select") {
        const actualOptions = typed.getChoices().map(choice => choice.getValue());
        if (
          !Array.isArray(spec.options) ||
          !spec.options.length ||
          JSON.stringify(actualOptions) !== JSON.stringify(spec.options)
        ) {
          throw new Error("Confira as opções e a ordem da lista: " + title);
        }
      }
    }
    mapa[key] = item.getId();
  }

  if (new Set(Object.values(mapa)).size !== Object.keys(CAMPOS).length) {
    throw new Error("Cada campo precisa corresponder a uma pergunta diferente.");
  }

  props.setProperties({
    FORM_ID: form.getId(),
    MAPA: JSON.stringify(mapa)
  });
  console.log("Configuração concluída.");
}

function doGet() {
  return json({ok: true, message: "Serviço disponível. Envie os dados por POST."});
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return json({ok: false, message: "Corpo da requisição ausente."});
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (error) {
      return json({ok: false, message: "Formato de envio inválido."});
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return json({ok: false, message: "Formato inválido."});
    }
    if (texto(data.website)) {
      return json({ok: false, message: "Envio bloqueado."});
    }

    const requestId = texto(data.requestId);
    if (!/^[a-zA-Z0-9-]{20,80}$/.test(requestId)) {
      return json({ok: false, message: "Identificador inválido."});
    }

    const values = {};
    for (const spec of DEFINICOES) {
      const value = texto(data[spec.key]);
      const invalidSelect = spec.type === "select" && value && (
        !Array.isArray(spec.options) || !spec.options.includes(value)
      );
      const invalidLength = value.length > (spec.type === "textarea" ? 5000 : 500);
      const invalidEmail = value && spec.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const invalidNumber = value && spec.type === "number" &&
        !Number.isFinite(Number(value));
      const invalidUrl = value && spec.type === "url" &&
        !/^https?:\/\/[^\s]+$/i.test(value);

      if (
        invalidSelect ||
        (spec.required && !value) ||
        invalidLength ||
        invalidEmail ||
        invalidNumber ||
        invalidUrl
      ) {
        return json({ok: false, message: "Confira o campo: " + spec.label});
      }
      values[spec.key] = value;
    }

    const props = PropertiesService.getScriptProperties();
    const formId = props.getProperty("FORM_ID");
    const rawMap = props.getProperty("MAPA");
    if (!formId || !rawMap) {
      return json({ok: false, message: "Serviço ainda não configurado."});
    }

    if (!lock.tryLock(20000)) {
      return json({ok: false, message: "Serviço ocupado. Tente novamente em instantes."});
    }

    const digest = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(values),
        Utilities.Charset.UTF_8
      )
    );
    const cache = CacheService.getScriptCache();
    const requestCacheKey = "envio:" + requestId;
    const previous = cache.get(requestCacheKey);

    if (previous) {
      return json(
        previous === digest
          ? {ok: true, duplicate: true}
          : {ok: false, message: "Identificador já usado para outros dados."}
      );
    }

    if (ANTISPAM.ativo) {
      if (!verificarTurnstile(texto(data.turnstileToken))) {
        return json({ok: false, message: "Verificação antispam inválida. Tente novamente."});
      }

      const emailValue = String(values.email || requestId).toLowerCase();
      const emailKey = "frequencia:" + hash(emailValue);
      const contentKey = "conteudo:" + digest;
      const minuteKey = "volume:" + Math.floor(Date.now() / 60000);
      const count = Number(cache.get(minuteKey) || 0);

      if (cache.get(emailKey)) {
        return json({ok: false, message: "Aguarde antes de enviar outra mensagem."});
      }
      if (cache.get(contentKey)) {
        return json({ok: false, message: "Esta mensagem já foi recebida recentemente."});
      }
      if (count >= ANTISPAM.maxPorMinuto) {
        return json({ok: false, message: "Muitos envios. Tente mais tarde."});
      }
      cache.put(minuteKey, String(count + 1), 120);
    }

    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) {
      return json({ok: false, message: "Formulário fechado para mensagens."});
    }

    const map = JSON.parse(rawMap);
    const response = form.createResponse();
    for (const field of Object.keys(values)) {
      if (!values[field]) continue;
      const item = form.getItemById(Number(map[field]));
      if (!item) throw new Error("Campo não encontrado.");

      const type = item.getType();
      if (![
        FormApp.ItemType.TEXT,
        FormApp.ItemType.PARAGRAPH_TEXT,
        FormApp.ItemType.LIST
      ].includes(type)) {
        throw new Error("Tipo incompatível.");
      }

      const typed = type === FormApp.ItemType.LIST
        ? item.asListItem()
        : type === FormApp.ItemType.TEXT
          ? item.asTextItem()
          : item.asParagraphTextItem();
      response.withItemResponse(typed.createResponse(values[field]));
    }
    response.submit();

    if (ANTISPAM.ativo) {
      const emailValue = String(values.email || requestId).toLowerCase();
      try {
        cache.put("frequencia:" + hash(emailValue), "1", ANTISPAM.intervalo);
        cache.put("conteudo:" + digest, "1", 600);
      } catch (error) {
        console.warn("Limites temporários indisponíveis.");
      }
    }

    try {
      cache.put(requestCacheKey, digest, 21600);
    } catch (error) {
      console.warn("Controle temporário de repetição indisponível.");
    }

    let emailSent = false;
    try {
      validarDestinatarios();
      const options = {name: NOME_REMETENTE};
      if (values.email) options.replyTo = values.email;
      if (REMETENTE) options.from = REMETENTE;

      const body = [
        "Nova mensagem recebida pelo site.",
        "",
        ...DEFINICOES.map(spec => spec.label + ": " + (values[spec.key] || "Não informado"))
      ].join("\n");

      GmailApp.sendEmail(DESTINATARIOS.join(","), ASSUNTO, body, options);
      emailSent = true;
    } catch (emailError) {
      console.error("Resposta gravada; envio da notificação falhou.");
    }

    return json({ok: true, emailEnviado: emailSent});
  } catch (error) {
    console.error("Falha ao processar envio.");
    return json({ok: false, message: "Não foi possível confirmar o envio."});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function texto(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizar(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "");
}

function hash(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(value),
      Utilities.Charset.UTF_8
    )
  );
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Execute no editor para autorizar MailApp; não envia e-mail de teste.
function autorizarEmails() {
  const restante = MailApp.getRemainingDailyQuota();
  console.log("Aliases disponíveis: " + GmailApp.getAliases().join(", "));
  console.log("Destinatários disponíveis na cota diária: " + restante);
}

function validarDestinatarios() {
  if (
    !Array.isArray(DESTINATARIOS) ||
    !DESTINATARIOS.length ||
    DESTINATARIOS.some(value =>
      typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
  ) {
    throw new Error("Preencha DESTINATARIOS com os e-mails reais do cliente.");
  }
}

// Nunca inclua TURNSTILE_SECRET no HTML ou em arquivos públicos.
function verificarTurnstile(token) {
  if (
    !token ||
    typeof token !== "string" ||
    token.length > TURNSTILE_MAX_TOKEN_LENGTH
  ) return false;

  const secret = PropertiesService
    .getScriptProperties()
    .getProperty("TURNSTILE_SECRET");
  if (!secret) return false;

  try {
    const response = UrlFetchApp.fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "post",
        contentType: "application/x-www-form-urlencoded",
        payload: {
          secret,
          response: token
        },
        muteHttpExceptions: true
      }
    );
    if (response.getResponseCode() !== 200) return false;

    const result = JSON.parse(response.getContentText());
    const hostname = String(result.hostname || "").toLowerCase();
    return result.success === true &&
      result.action === TURNSTILE_ACTION &&
      ANTISPAM.dominios.includes(hostname);
  } catch (error) {
    console.error("Falha na verificação antispam.");
    return false;
  }
}

// Execute uma vez para gerar o Forms e a planilha.
function criarFormulario() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("FORM_CRIADO")) {
    console.log(
      "Forms existente: https://docs.google.com/forms/d/" +
      props.getProperty("FORM_CRIADO") + "/edit"
    );
    console.log(
      "Planilha: https://docs.google.com/spreadsheets/d/" +
      props.getProperty("PLANILHA_CRIADA") + "/edit"
    );
    return;
  }
  if (PLANILHA_ID) {
    throw new Error("Para criar um projeto novo, deixe PLANILHA_ID vazio.");
  }
  if (!DEFINICOES.length) throw new Error("Adicione ao menos um campo.");

  validarDestinatarios();
  const form = FormApp.create("Contato — " + NOME_CLIENTE);
  for (const spec of DEFINICOES) {
    const item = spec.type === "select"
      ? form.addListItem()
      : spec.type === "textarea"
        ? form.addParagraphTextItem()
        : form.addTextItem();
    item.setTitle(spec.question).setRequired(spec.required);
    if (spec.type === "select") item.setChoiceValues(spec.options);
    if (spec.type === "email") {
      item.setValidation(
        FormApp.createTextValidation().requireTextIsEmail().build()
      );
    }
  }

  const spreadsheet = SpreadsheetApp.create("Respostas — " + NOME_CLIENTE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  props.setProperties({
    FORM_CRIADO: form.getId(),
    PLANILHA_CRIADA: spreadsheet.getId()
  });

  console.log("Forms para editar: " + form.getEditUrl());
  console.log("Forms para responder: " + form.getPublishedUrl());
  console.log("Planilha: " + spreadsheet.getUrl());
  console.log("Abra a planilha, aguarde a aba de respostas e execute finalizarCriacao().");
}

function finalizarCriacao() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty("FORM_CRIADO");
  const spreadsheetId = props.getProperty("PLANILHA_CRIADA");
  if (!formId || !spreadsheetId) {
    throw new Error("Execute criarFormulario() primeiro.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheets().find(item => {
    const formUrl = item.getFormUrl();
    return formUrl && FormApp.openByUrl(formUrl).getId() === formId;
  });
  if (!sheet) {
    throw new Error(
      "A aba de respostas ainda não apareceu. Abra a planilha, aguarde e execute novamente."
    );
  }

  props.setProperty("ABA_CRIADA", String(sheet.getSheetId()));
  configurar();
  console.log("ID da planilha: " + spreadsheetId);
  console.log("gid: " + sheet.getSheetId());
}
