require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
  GEMINI_MODEL = 'gemini-3.7-flash',
  ELEVENLABS_MODEL = 'eleven_multilingual_v2',
  FUSO_HORARIO = 'America/Sao_Paulo', PORT = 3000,
} = process.env;

for (const [k, v] of Object.entries({ GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID })) {
  if (!v) { console.error(`Falta ${k} no arquivo .env`); process.exit(1); }
}

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, message: { error: 'Muitas requisições. Aguarde um minuto.' } }));
app.use(express.static('public'));

const sistema = () => `Você é J.A.R.V.I.S., assistente pessoal do usuário. Fale sempre em português do Brasil e trate o usuário por "senhor". Seja elegante, objetivo e, quando apropriado, levemente irônico. Responda em 1 a 3 frases, a menos que peçam uma explicação mais longa; nesse caso explique de forma simples. Sua resposta será falada em voz alta: use só texto corrido, sem markdown, listas, emojis ou símbolos. Se não souber algo, diga com clareza e não invente. Você não acessa dados em tempo real além da data e hora abaixo. Agora: ${new Date().toLocaleString('pt-BR', { timeZone: FUSO_HORARIO, dateStyle: 'full', timeStyle: 'medium' })}.`;

function validar(msgs) {
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 40) return null;
  const ok = msgs.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim() && m.content.length <= 2000);
  if (!ok) return null;
  const out = msgs.map(m => ({ role: m.role, content: m.content.trim() }));
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

app.post('/api/chat', async (req, res) => {
  const messages = validar(req.body.messages);
  if (!messages) return res.status(400).json({ error: 'Mensagem inválida.' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema() }] },
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 800 },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Gemini:', r.status, JSON.stringify(data));
      const msg = [400, 403].includes(r.status) ? 'Chave ou modelo do Gemini inválido.' : r.status === 404 ? 'Modelo do Gemini não encontrado. Troque GEMINI_MODEL.' : r.status === 429 ? 'Limite gratuito do Gemini atingido. Tente em instantes.' : 'Falha ao consultar o modelo.';
      return res.status(502).json({ error: msg });
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(' ').trim();
    res.json({ text: text || 'Não consegui formular uma resposta, senhor.' });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Sem conexão com o Gemini.' });
  }
});

app.post('/api/tts', async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 1500) : '';
  if (!text) return res.status(400).json({ error: 'Texto vazio.' });
  const speed = Math.min(1.2, Math.max(0.7, Number(req.body.speed) || 1));
  const body = { text, model_id: ELEVENLABS_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed } };
  if (ELEVENLABS_MODEL.includes('v2_5')) body.language_code = 'pt';
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      console.error('ElevenLabs:', r.status, await r.text());
      const msg = r.status === 401 ? 'Chave da ElevenLabs inválida.' : r.status === 429 ? 'Limite da ElevenLabs atingido.' : r.status === 402 ? 'Créditos da ElevenLabs esgotados ou voz indisponível no seu plano.' : 'Falha ao gerar a voz.';
      return res.status(502).json({ error: msg });
    }
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Sem conexão com a ElevenLabs.' });
  }
});

app.listen(PORT, () => console.log(`JARVIS no ar: http://localhost:${PORT}`));
