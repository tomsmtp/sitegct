# Deploy: GitHub + Vercel

## 📋 Passo 1: Criar Repositório no GitHub

1. Acesse https://github.com
2. Faça login (ou crie conta se não tem)
3. Clique em **"+"** (canto superior direito)
4. Selecione **"New repository"**
5. Configure:
   - **Repository name:** `gestao-graos`
   - **Description:** `Sistema de Gestão de Grãos`
   - **Visibility:** `Private` (recomendado)
   - **NÃO** inicialize com README (você já tem)
6. Clique **"Create repository"**

---

## 🔄 Passo 2: Fazer Push para GitHub

No terminal (pasta `gestao_graos/`):

```bash
git init
git add .
git commit -m "Projeto inicial"
git branch -M main
git remote add origin https://github.com/seu-usuario/gestao-graos.git
git push -u origin main
```

(Substitua `seu-usuario` pelo seu username do GitHub)

---

## 🚀 Passo 3: Conectar GitHub ao Vercel

### 3.1 Entrar no Vercel

1. Acesse https://vercel.com
2. Clique em **"Sign Up"** (ou Login se já tem conta)
3. Escolha **"Continue with GitHub"**
4. Autorize Vercel a acessar sua conta GitHub

### 3.2 Importar Projeto

1. Clique **"Add New..."** → **"Project"**
2. Em **"Import Git Repository"**, localize `gestao-graos`
3. Clique **"Import"**

### 3.3 Configurar Deploy

Na tela de configuração do Vercel:

- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm ci` (padrão)
- **Root Directory:** `./` (padrão)

Clique **"Deploy"**

⏳ Aguarde alguns minutos para o primeiro deploy...

---

## 🔧 Passo 4: Variáveis de Ambiente

Se sua aplicação usar variáveis de ambiente (API_URL, etc):

1. Vá para **Project Settings**
2. Clique em **"Environment Variables"**
3. Adicione suas variáveis:
   ```
   VITE_API_URL = https://receive-worked-extend-gauge.trycloudflare.com
   ```

Se mudar variáveis, faça um novo deploy:
- Vá para **Deployments**
- Clique **"...Redeploy"** no deployment mais recente

---

## ✅ Passo 5: Domínio Personalizado (Opcional)

Se quiser um domínio próprio em vez de `vercel.app`:

1. Em **Project Settings**, clique **"Domains"**
2. Adicione seu domínio
3. Siga as instruções para configurar DNS

---

## 📱 Deploy Automático

A partir de agora, sempre que você fizer `git push`:

```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

Vercel automaticamente:
- ✅ Detecta o push
- ✅ Faz o build
- ✅ Publica a versão
- ✅ Seu app estará no ar em poucos minutos

---

## 🎯 Acessar seu App

Link padrão:
```
https://gestao-graos.vercel.app
```

Ou seu domínio personalizado se configurou.

---

## 🆘 Troubleshooting

### "Cannot GET /"
- Verifique se o arquivo `public/_redirects` existe
- Conteúdo deve ser: `/* /index.html 200`

### Build falha
- Verifique a aba **"Build & Development Settings"**
- Veja logs em **"Deployments"** → seu deploy → **"Build Logs"**

### CORS Error
- Configure o `back_end.js` para aceitar sua URL Vercel
- Adicione no `.env`:
  ```
  CORS_ORIGINS=https://gestao-graos.vercel.app
  ```

---

## 📚 Referências

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [GitHub Pages](https://pages.github.com)

---

**Pronto!** 🎉 Seu app está rodando na nuvem e será atualizado automaticamente com seus pushes!
