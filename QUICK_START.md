# 🚀 Guia Rápido - Deploy do gestao_graos

## ✅ Tudo Configurado!

Seu projeto **gestao_graos** já está pronto para deploy. Aqui estão as próximas etapas:

---

## 📋 Checklist de Configuração

- ✅ `public/_redirects` criado (rotas do React funcionarão)
- ✅ `.env.example` atualizado (copie para `.env` e preencha)
- ✅ `.gitignore` configurado (não faz commit de dados sensíveis)
- ✅ `vite.config.js` otimizado para produção
- ✅ Documentação de deploy completa

---

## 🎯 Próximas Etapas (escolha uma opção)

### 🥇 Opção 1: Vercel + GitLab (RECOMENDADO)

**Mais rápido, mais fácil!**

1. Leia: [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md)
2. Crie repositório no GitLab
3. Faça push do código
4. Conecte no Vercel
5. **Pronto!** Deploy automático

```bash
git add .
git commit -m "Configuração Vercel"
git push origin main
```

---

### 🥈 Opção 2: Cloudflare Pages + GitLab

**Ótimo desempenho global**

1. Leia: [`DEPLOY.md`](DEPLOY.md)
2. Crie repositório no GitLab
3. Faça push do código
4. Conecte com Cloudflare Pages
5. **Pronto!** Deploy automático

---

### 🥉 Opção 3: GitHub + Vercel

**Se preferir GitHub**

1. Leia: [`GITHUB_VERCEL.md`](GITHUB_VERCEL.md)
2. Crie repositório no GitHub
3. Faça push do código
4. Conecte no Vercel
5. **Pronto!** Deploy automático

---

## 🖥️ Desenvolvimento Local

Enquanto estiver desenvolvendo:

```bash
# Terminal 1 - Frontend
npm run dev
# Acessa: http://localhost:5173

# Terminal 2 - Backend (em outro terminal)
npm run api
# Server: http://localhost:3000
```

---

## 🔧 Preparar para Deploy

Antes de fazer push/deploy:

```bash
# 1. Testar build
npm run build

# 2. Verificar erros
npm run lint

# 3. Ver resultado
npm run preview
```

Se tudo rodar sem erros, está pronto! ✅

---

## ⚙️ Variáveis de Ambiente

**Local (`.env`):**
```env
DB_DSN2=sua-dsn
DB_USER2=seu-usuario
DB_PASS2=sua-senha
VITE_API_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173
```

**No Vercel/Cloudflare (painel):**
```
VITE_API_URL = https://seu-cloudflare-worker.com
CORS_ORIGINS = https://seu-projeto.vercel.app
```

---

## 🎯 Fluxo de Desenvolvimento

1. **Desenvolva localmente**
   ```bash
   npm run dev
   ```

2. **Teste tudo**
   ```bash
   npm run lint
   npm run build
   ```

3. **Faça push**
   ```bash
   git add .
   git commit -m "Descrição das mudanças"
   git push origin main
   ```

4. **Vercel/Cloudflare faz deploy automaticamente** ✨

---

## 📞 Precisa de Ajuda?

- **Build falha?** → Veja [`npm run build`](README.md#troubleshooting)
- **CORS error?** → Configure `CORS_ORIGINS` no backend
- **Routes broken?** → Verifique `public/_redirects`
- **Docs detalhadas:** Veja [README.md](README.md)

---

## 🎉 Resumo

| Etapa | Status |
|-------|--------|
| Frontend (React/Vite) | ✅ Configurado |
| Backend (Express) | ✅ Pronto |
| Rotas (React Router) | ✅ Configurado |
| Build | ✅ Testado |
| Deploy Automático | ✅ Documentado |

**Você está pronto para o mundo! 🚀**

Escolha sua opção de deploy acima e siga o guia correspondente.

---

**Boa sorte! 🌾**
