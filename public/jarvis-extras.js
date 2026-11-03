(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const status = $('#status');
  const install = $('#instalar');
  let deferredPrompt = null;

  // PWA install prompt: Chrome/Android and supported desktop browsers.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    install.style.display = 'inline-block';
  });
  install?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    install.style.display = 'none';
  });
  window.addEventListener('appinstalled', () => {
    install.style.display = 'none';
    if (typeof add === 'function') add('assistant', 'JARVIS instalado neste dispositivo.');
  });

  // Safe local commands. No arbitrary shell, filesystem, or device-control execution.
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  async function localCommand(text) {
    const t = normalize(text);
    if (/^(ajuda|comandos|o que voce consegue fazer|quais sao seus comandos)\b/.test(t)) {
      return 'Posso informar a hora e a data, ativar tela cheia, limpar a conversa e interromper minha fala. Também posso conversar normalmente pela inteligência artificial.';
    }
    if (/\b(que horas sao|qual o horario|hora atual|horas)\b/.test(t)) {
      return 'Agora são ' + new Intl.DateTimeFormat('pt-BR', {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date()) + '.';
    }
    if (/\b(que dia e hoje|qual a data|data de hoje)\b/.test(t)) {
      return 'Hoje é ' + new Intl.DateTimeFormat('pt-BR', {dateStyle:'full',timeZone:'America/Sao_Paulo'}).format(new Date()) + '.';
    }
    if (/\b(limpar conversa|limpar historico|apagar conversa)\b/.test(t)) {
      if (typeof parar === 'function') parar(true);
      if (typeof historico !== 'undefined') historico.length = 0;
      $('#log')?.replaceChildren();
      const empty = document.createElement('div');
      empty.id = 'vazio'; empty.className = 'vazio';
      empty.textContent = 'Conversa limpa. À disposição, senhor.';
      $('#log')?.append(empty);
      return 'Conversa limpa, senhor.';
    }
    if (/\b(tela cheia|modo tela cheia|expandir tela)\b/.test(t)) {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
        return 'Comando de tela cheia executado.';
      } catch {
        return 'O navegador não permitiu alterar a tela cheia. Use o menu do navegador.';
      }
    }
    return null;
  }

  // Wrap the existing assistant entry point without replacing its chat/voice pipeline.
  const originalAsk = window.perguntar;
  if (typeof originalAsk === 'function') {
    window.perguntar = async function(text) {
      const value = String(text || '').trim();
      if (!value) return;
      const reply = await localCommand(value);
      if (reply === null) return originalAsk(value);
      if (typeof parar === 'function') parar(true);
      if (typeof add === 'function') {
        add('user', value);
        add('assistant', reply);
      }
      if (typeof historico !== 'undefined') {
        historico.push({role:'user',content:value},{role:'assistant',content:reply});
      }
      if (typeof falar === 'function') await falar(reply);
    };
  }

  // Register the offline app shell only on secure origins (HTTPS or localhost).
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service worker:', error));
    });
  }

  // Improve keyboard handling on desktop and mobile viewport changes.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof parar === 'function' && document.body.dataset.s === 'listening') parar(false);
  });
})();
