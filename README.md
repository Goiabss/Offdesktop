# OffDesktop

Desligue seu PC pelo celular (mesma rede Wi-Fi).

## Baixar os aplicativos (sem instalar nada no seu computador)
1. Crie uma conta gratuita em github.com e um repositório novo.
2. Envie todo o conteúdo desta pasta para o repositório (inclusive a pasta .github).
3. Aba Actions > "Gerar instaladores" > Run workflow. Espere uns 5 a 10 minutos.
4. Na execução concluída, baixe em Artifacts:
   - OffDesktop-PC-instalador (instalador .exe para o Windows)
   - OffDesktop-Celular-apk (OffDesktop.apk para Android)
5. Para ter links fixos de download, crie uma tag (ex.: v1.0.0). Os arquivos aparecem em Releases.

## Usar
1. Instale e abra o OffDesktop no PC. Permita o firewall em redes privadas.
2. A janela mostra o endereço e o código de 6 dígitos.
3. No celular, instale o .apk (permita instalar apps de fontes desconhecidas), informe o endereço e o código.

## Rodar direto do código (opcional)
Com Node.js: `npm install` e `npm start`. Instalador local: `npm run dist`.
O celular também funciona sem o .apk: abra o endereço do PC no navegador e use "Adicionar à tela inicial".
