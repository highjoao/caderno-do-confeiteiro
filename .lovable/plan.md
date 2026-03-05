

# Configurar PWA - Caderno do Confeiteiro

## O que será feito

Transformar o app em um Progressive Web App (PWA) para que possa ser instalado como aplicativo no celular e desktop, com ícone na tela inicial e experiência fullscreen.

## Passos técnicos

### 1. Criar `public/manifest.json`
- Nome: "Caderno do Confeiteiro"
- Tema rosa pastel (`#FDE1D3`)
- Display: `standalone`
- Ícones PWA (192x192 e 512x512) gerados como SVG inline

### 2. Criar `public/sw.js` (Service Worker)
- Cache básico dos assets estáticos para funcionamento offline
- Estratégia network-first para API calls

### 3. Atualizar `index.html`
- Adicionar link para `manifest.json`
- Adicionar `<meta name="theme-color">`
- Adicionar meta tags para iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)

### 4. Registrar Service Worker em `src/main.tsx`
- Registro condicional do SW na inicialização do app

### 5. Criar ícones PWA
- Gerar ícones SVG com o emoji 🧁 nas dimensões necessárias em `public/`

