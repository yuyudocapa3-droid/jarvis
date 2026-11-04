require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
  GROQ_MODEL = 'llama-3.3-70b-versatile',
  ELEVENLABS_MODEL = 'eleven_multilingual_v2',
  FUSO_HORARIO = 'America/Sao_Paulo', PORT = 3000,
} = process.env;

for (const [k, v] of Object.entries({ GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID })) {
  if (!v) { console.error(`Falta ${k} nas variáveis de ambiente`); process.exit(1); }
}

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, message: { error: 'Muitas requisições. Aguarde um minuto.' } }));
app.use(express.static('public'));

const sistema = () => `Você é J.A.R.V.I.S., assistente pessoal do usuário. Fale sempre em português do Brasil e trate o usuário por "senhor". Seja elegante, objetivo e, quando apropriado, levemente irônico. Responda em 1 a 3 frases, a menos que peçam uma explicação mais longa; nesse caso explique de forma simples. Sua resposta será falada em voz alta: use só texto corrido, sem markdown, listas, emojis ou símbolos. Se não souber algo, diga com clareza e não invente. Você não acessa dados em tempo real além da data e hora abaixo. Agora: ${new Date().toLocaleString('pt-BR', { timeZone: FUSO_HORARIO, dateStyle: 'full', timeStyle: 'medium' })}.`;

const MODELOS = {
  humano: ['cabeca', 'peito', 'bracos', 'maos', 'pernas', 'pes'],
  motor: ['bloco', 'cilindro', 'pistao', 'virabrequim'],
  solar: ['sol', 'orbitas', 'planetas'],
  atomo: ['nucleo', 'orbitas', 'eletrons'],
  dna: ['fita', 'bases'],
  foguete: ['ogiva', 'corpo', 'aletas', 'motor'],
  rede: ['entrada', 'camadas', 'saida'],
  globo: ['polos', 'equador', 'meridianos'],
};
const sistemaExplicar = () => `Você é J.A.R.V.I.S., assistente do usuário, e vai montar uma explicação com um holograma 3D. Responda SOMENTE com um objeto JSON válido, sem markdown e sem nenhum texto fora do JSON, neste formato: {"modelo":"...","titulo":"...","explicacao":"...","partes":[{"ancora":"...","texto":"..."}]}. Escolha "modelo" entre: ${Object.entries(MODELOS).map(([k, v]) => `${k} (âncoras: ${v.join(', ')})`).join('; ')}. Use o modelo mais próximo do assunto: humano para trajes, armaduras, roupas e corpo humano; motor para máquinas e motores; solar para astronomia; atomo para átomos, energia e matéria; dna para genética; foguete para naves e aeronaves; rede para redes, computadores e inteligência artificial; globo para planeta, geografia e o resto. "explicacao": 4 a 6 frases curtas em português do Brasil, tratando o usuário por "senhor", sem símbolos, listas ou emojis, pois será falada em voz alta. "partes": de 3 a 6 itens; cada "ancora" deve ser EXATAMENTE uma das âncoras do modelo escolhido, e "texto" com até 14 palavras explicando como aquela parte se relaciona ao assunto. Se o assunto for um personagem ou obra de ficção protegida, explique o conceito e a tecnologia envolvidos de forma geral e diga que o holograma é um modelo genérico, não o design oficial. Se não souber algo, diga com clareza.`;

function validar(msgs) {
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 40) return null;
  const ok = msgs.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim() && m.content.length <= 2000);
  if (!ok) return null;
  const out = msgs.map(m => ({ role: m.role, content: m.content.trim() }));
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

async function groq(messages, max) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: max, messages }),
  });
  const data = await r.json().catch(() => ({}));
  return { r, data };
}
const erroGroq = s => s === 401 ? 'Chave do Groq inválida.' : [400, 404].includes(s) ? 'Modelo do Groq inválido. Troque GROQ_MODEL.' : s === 429 ? 'Limite gratuito do Groq atingido. Tente mais tarde.' : 'Falha ao consultar o modelo.';

app.post('/api/chat', async (req, res) => {
  const messages = validar(req.body.messages);
  if (!messages) return res.status(400).json({ error: 'Mensagem inválida.' });
  try {
    const { r, data } = await groq([{ role: 'system', content: sistema() }, ...messages], 500);
    if (!r.ok) { console.error('Groq:', r.status, JSON.stringify(data)); return res.status(502).json({ error: erroGroq(r.status) }); }
    const text = (data.choices?.[0]?.message?.content || '').trim();
    res.json({ text: text || 'Não consegui formular uma resposta, senhor.' });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Sem conexão com o Groq.' });
  }
});

app.post('/api/explicar', async (req, res) => {
  const tema = typeof req.body.tema === 'string' ? req.body.tema.trim().slice(0, 300) : '';
  if (!tema) return res.status(400).json({ error: 'Tema vazio.' });
  try {
    const { r, data } = await groq([{ role: 'system', content: sistemaExplicar() }, { role: 'user', content: tema }], 1800);
    if (!r.ok) { console.error('Groq:', r.status, JSON.stringify(data)); return res.status(502).json({ error: erroGroq(r.status) }); }
    const raw = data.choices?.[0]?.message?.content || '';
    let j;
    try { const m = raw.match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : raw); }
    catch (e) { console.error('JSON inválido:', raw.slice(0, 300)); return res.status(502).json({ error: 'Não consegui montar o holograma. Tente de novo.' }); }
    const modelo = MODELOS[j.modelo] ? j.modelo : 'globo';
    const anc = MODELOS[modelo];
    let partes = (Array.isArray(j.partes) ? j.partes : []).filter(p => p && anc.includes(p.ancora) && typeof p.texto === 'string').slice(0, 6).map(p => ({ ancora: p.ancora, texto: p.texto.slice(0, 160) }));
    if (!partes.length) partes = anc.slice(0, 3).map(a => ({ ancora: a, texto: '' }));
    res.json({ modelo, titulo: String(j.titulo || tema).slice(0, 60), explicacao: String(j.explicacao || '').slice(0, 900) || 'Aqui está o modelo, senhor.', partes });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Sem conexão com o Groq.' });
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
