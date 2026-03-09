#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

console.log('\n🚀 Sistema de Deploy com Cloudflare\n');

// 1. Inicia servidor
console.log('[1/5] Iniciando servidor Express...');
const serverProcess = spawn('node', ['back_end.js'], { 
  cwd: __dirname, 
  stdio: ['ignore', 'pipe', 'pipe']
});

serverProcess.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg.includes('listening')) {
    console.log('✅ Servidor rodando na porta 3001\n');
  }
});

// Aguarda servidor iniciar
await new Promise(resolve => setTimeout(resolve, 3000));

// 2. Inicia Tunnel
console.log('[2/5] Iniciando Cloudflare Tunnel...');
const tunnelProcess = spawn(path.join(__dirname, 'cloudflared.exe'), [
  'tunnel',
  '--url',
  'http://localhost:3001'
], { 
  stdio: ['ignore', 'pipe', 'pipe']
});

tunnelProcess.stdout.on('data', (data) => {
  console.log('[TUNNEL]', data.toString().trim());
});

// Aguarda um pouco
await new Promise(resolve => setTimeout(resolve, 2000));

// 3. Pede URL do usuário
console.log('\n[3/5] Aguardando URL do Cloudflare Tunnel...');
console.log('═'.repeat(60));
const tunnelUrl = await askQuestion(
  '\n📍 Cole a URL do Cloudflare Tunnel (https://...trycloudflare.com):\n> '
);
console.log('═'.repeat(60));

if (!tunnelUrl.includes('trycloudflare.com')) {
  console.error('\n❌ URL inválida! Saindo...');
  process.exit(1);
}

console.log(`\n✅ URL recebida: ${tunnelUrl}\n`);

// 4. Atualiza arquivos
console.log('[4/5] Atualizando arquivos com a URL...');
const siteDir = path.join(__dirname, 'site_completo');
const files = [
  'src/login/main.jsx',
  'src/inicio_supervisor/main.jsx',
  '.env.example'
];

let updateCount = 0;
for (const file of files) {
  try {
    const filePath = path.join(siteDir, file);
    let content = readFileSync(filePath, 'utf-8');
    
    const oldContent = content;
    content = content.replace(
      /https:\/\/[\w-]+\.trycloudflare\.com/g,
      tunnelUrl
    );
    
    if (content !== oldContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ ${file}`);
      updateCount++;
    } else {
      console.log(`  ℹ️  ${file} (já tinha a URL)`);
    }
  } catch (err) {
    console.error(`  ❌ Erro em ${file}:`, err.message);
  }
}

// 5. Git push
console.log('\n[5/5] Atualizando GitHub...');
try {
  console.log('  > Adicionando arquivos...');
  execSync('git add .', { cwd: siteDir });
  
  console.log('  > Fazendo commit...');
  execSync(`git commit -m "Auto-update backend URL to ${tunnelUrl.split('//')[1]}"`, { cwd: siteDir });
  
  console.log('  > Fazendo push...');
  execSync('git push origin main', { cwd: siteDir, stdio: 'inherit' });
  
  console.log('\n  ✅ GitHub atualizado!');
} catch (err) {
  if (err.message.includes('nothing to commit')) {
    console.log('\n  ℹ️  Nenhuma mudança para fazer commit');
  } else {
    console.error('\n  ⚠️  Erro:', err.message);
  }
}

// Resultado final
console.log('\n' + '═'.repeat(60));
console.log('✨ DEPLOY CONCLUÍDO COM SUCESSO!');
console.log('═'.repeat(60));
console.log(`\n📍 Backend API: ${tunnelUrl}`);
console.log('🌐 Site Frontend: https://aplicativograos.pages.dev');
console.log('\n⏳ Vercel rebuild em progresso...');
console.log('⏰ Aguarde 2-5 minutos para o site atualizar');
console.log('\n💾 Tunnel Cloudflare continuará rodando\n');

rl.close();
