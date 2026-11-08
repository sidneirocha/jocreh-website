# Jocreh Soluções — clone local

Clone frontend estático da página institucional Jocreh Soluções, recriado a partir da página pública e da captura completa fornecida.

## Executar

Com Python 3 instalado, abra um terminal nesta pasta e rode:

```bash
python3 -m http.server 4173
```

Abra `http://localhost:4173` no navegador.

## O que está incluído

- Página completa em português, com navegação por âncoras e layout responsivo.
- Carrossel interativo com as oito categorias de serviço, setas, marcadores e gesto de toque.
- Menu móvel expansível.
- Formulário alinhado ao formulário Framer publicado: campos, honeypots, prova de trabalho e cabeçalhos do endpoint identificado no site.
- Fotografias, marca, setas e fontes guardadas localmente na pasta `public`.

## Arquivos principais

- `index.html` — estrutura e conteúdo.
- `styles.css` — aparência e responsividade.
- `script.js` — carrossel, menu e estado demonstrativo do formulário.
- `public/assets` e `public/fonts` — recursos locais do clone.

O formulário reproduz o envio do site original: POST multipart para o endpoint Framer, campos `Name`, `Email Address`, `Service` e `Message`, 11 campos honeypot, prova de trabalho SHA-256 e os cabeçalhos `Framer-Site-Id`, `Framer-POW` e `Framer-Form-Fields`. A submissão não foi acionada durante a implementação. Como esse endpoint pertence ao formulário Framer de Jocreh, os envios irão para a configuração original e podem ser rejeitados em outro domínio. Confirme a autorização e a permissão de origem antes de publicar. Para trocar o destinatário ou domínio, substitua o endpoint e o `Framer-Site-Id` por uma integração própria.
