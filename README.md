# J.A.R.V.I.S.

Assistente pessoal por voz em português (Brasil), com interface 3D, Groq para conversas e ElevenLabs para síntese de voz.

## Configuração

Configure estas variáveis no ambiente do serviço (por exemplo, Render):

- `GROQ_API_KEY`: chave da API Groq.
- `ELEVENLABS_API_KEY`: chave da API ElevenLabs.
- `ELEVENLABS_VOICE_ID`: ID da voz da ElevenLabs.
- `GROQ_MODEL` (opcional): padrão `llama-3.3-70b-versatile`.
- `ELEVENLABS_MODEL` (opcional): padrão `eleven_multilingual_v2`.
- `FUSO_HORARIO` (opcional): padrão `America/Sao_Paulo`.
- `PORT` (opcional): padrão `3000`.

Nunca coloque chaves de API no código do navegador, no Git ou em mensagens públicas. Se uma chave foi compartilhada, revogue-a e gere outra.

## Executar localmente

Requer Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Android e computador

O site inclui um manifesto PWA e um service worker. Em um endereço HTTPS, navegadores compatíveis podem oferecer **Instalar aplicativo** ou **Adicionar à tela inicial**. No computador, use Chrome ou Edge; no Android, use Chrome. O reconhecimento de voz depende do suporte do navegador e da permissão do microfone.

## Comandos locais por voz

- “Que horas são?”
- “Que dia é hoje?”
- “Tela cheia”
- “Limpar conversa”
- “Ajuda”

Esses comandos são limitados ao navegador. O JARVIS não executa comandos arbitrários do sistema operacional nem acessa arquivos ou funções privadas do dispositivo.

## Segurança

As chaves Groq e ElevenLabs ficam somente no servidor. As rotas de chat e áudio são protegidas por limite de requisições. Sirva o app por HTTPS para habilitar recursos de microfone e instalação PWA.
