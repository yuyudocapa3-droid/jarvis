/* JARVIS command expansion — browser/PWA capabilities only */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const say=t=>typeof window.dizer==='function'?window.dizer(t):(window.add?window.add('assistant',t):false);
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[?!.,;]/g,' ').replace(/\s+/g,' ').trim();
const open=(url)=>{window.open(url,'_blank','noopener');};
const save=(k,v)=>{try{localStorage.setItem('jarvis_'+k,JSON.stringify(v));return true}catch(e){return false}};
const load=(k,f)=>{try{const v=JSON.parse(localStorage.getItem('jarvis_'+k));return v??f}catch(e){return f}};
const clean=q=>q.replace(/^(por favor |jarvis |pesquise |pesquisa |procure |buscar |busque |pesquisar |tocar |toque |coloque |reproduza )/,'').trim();
function minsFrom(s){
 let m=s.match(/(\d+)\s*(segundo|segundos|seg|s)\b/);if(m)return +m[1]*1000;
 m=s.match(/(\d+)\s*(minuto|minutos|min)\b/);if(m)return +m[1]*60000;
 m=s.match(/(\d+)\s*(hora|horas)\b/);if(m)return +m[1]*3600000;
 return 0;
}
async function weather(){
 const url='https://api.open-meteo.com/v1/forecast?latitude=-22.8268&longitude=-43.0637&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=America%2FSao_Paulo&forecast_days=2';
 const r=await fetch(url);if(!r.ok)throw new Error('serviço meteorológico indisponível');
 const d=await r.json(),c=d.current,day=d.daily;
 const codes={0:'céu limpo',1:'predominantemente limpo',2:'parcialmente nublado',3:'nublado',45:'neblina',48:'neblina com geada',51:'garoa fraca',53:'garoa moderada',55:'garoa intensa',61:'chuva fraca',63:'chuva moderada',65:'chuva forte',71:'neve fraca',73:'neve moderada',75:'neve forte',80:'pancadas fracas',81:'pancadas moderadas',82:'pancadas fortes',95:'trovoadas',96:'trovoadas com granizo',99:'trovoadas fortes com granizo'};
 const desc=codes[c.weather_code]||'condição não identificada';
 const rain=day.precipitation_probability_max?.[0];
 return 'Em São Gonçalo, agora fazem '+Math.round(c.temperature_2m)+' graus, sensação de '+Math.round(c.apparent_temperature)+' graus, '+desc+', umidade de '+c.relative_humidity_2m+' por cento e vento de '+Math.round(c.wind_speed_10m)+' quilômetros por hora. '+(rain==null?'': 'A chance máxima de chuva hoje é de '+rain+' por cento. ')+'A máxima prevista é '+Math.round(day.temperature_2m_max[0])+' graus e a mínima '+Math.round(day.temperature_2m_min[0])+' graus.';
}
function notesText(){const a=load('notes',[]);return a.length?a.map((n,i)=>(i+1)+'. '+n.text).join('; '):'Não há notas salvas.'}
function reminderList(){return load('reminders',[])}
function notify(text){
 try{if('Notification'in window&&Notification.permission==='granted')new Notification('J.A.R.V.I.S.',{body:text})}catch(e){}
 say('Senhor, lembrete: '+text);
}
function checkReminders(){
 const now=Date.now(),all=reminderList(),due=all.filter(x=>!x.done&&x.at<=now);
 if(due.length){due.forEach(x=>{x.done=true;notify(x.text)});save('reminders',all)}
}
setInterval(checkReminders,12000);
async function handle(raw){
 const s=norm(raw);
 if(!s)return false;
 // Local weather for São Gonçalo, RJ
 if(/^(?:clima|tempo|previsao do tempo|como esta o tempo|como esta o clima|vai chover|temperatura|clima em sao goncalo|tempo em sao goncalo|previsao em sao goncalo)$/.test(s)){
  try{return say(await weather())}catch(e){return say('Não consegui consultar a meteorologia agora. Verifique a conexão e tente novamente.')}
 }
 if(/^(?:onde estou|minha localizacao|qual minha localizacao)$/.test(s)){return say('A localização configurada para o senhor é São Gonçalo, no estado do Rio de Janeiro. Não tenho seu endereço exato.')}
 if(/^(?:lugares|locais|comer|restaurantes|farmacias|mercados|postos|hospital|hospitais) perto de mim$/.test(s)){
  const term=s.replace(/ perto de mim$/,'');open('https://www.google.com/maps/search/'+encodeURIComponent(term+' em São Gonçalo, RJ'));return say('Pesquisando '+term+' perto do senhor, em São Gonçalo.')
 }
 // Quick information
 if(/^(que horas sao|horas|hora atual|me diga a hora)$/.test(s)){return say('Agora são '+new Date().toLocaleTimeString('pt-BR')+'.')}
 if(/^(que dia e hoje|qual a data|data de hoje|hoje e que dia)$/.test(s)){return say('Hoje é '+new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'.')}
 if(/^(ajuda|listar comandos|quais comandos|o que voce pode fazer)$/.test(s)){return say('Posso abrir aplicativos e sites, pesquisar na internet, buscar músicas no Spotify ou YouTube, criar notas, listar notas, programar lembretes, iniciar temporizadores, abrir mapas e configurações de Wi-Fi e Bluetooth. Algumas funções dependem do Android.')}
 // Web search
 let m=s.match(/^(?:pesquise|pesquisa|procure|buscar|busque|pesquisar|google|pesquise no google)\s+(?:por\s+)?(.+)$/);
 if(m){const term=clean(m[1]);if(term){open('https://www.google.com/search?q='+encodeURIComponent(term));return say('Pesquisando na internet por '+term+'.')}}
 // YouTube / Spotify search (does not claim playback)
 m=s.match(/^(?:toque|toca|tocar|procure|pesquise|buscar|busque)\s+(.+?)\s+(?:no|na)\s+(spotify|youtube)$/);
 if(m){const term=m[1].trim(),site=m[2];open(site==='spotify'?'https://open.spotify.com/search/'+encodeURIComponent(term):'https://www.youtube.com/results?search_query='+encodeURIComponent(term));return say('Encontrei resultados de '+term+' no '+site+'. Selecione a faixa para reproduzir.')}
 m=s.match(/^(?:abra|abrir|abre|pesquise|pesquisa)\s+(?:a musica|a música|musica|música)\s+(.+)$/);
 if(m){open('https://open.spotify.com/search/'+encodeURIComponent(m[1]));return say('Abrindo a busca por '+m[1]+' no Spotify.')}
 // Maps
 m=s.match(/^(?:abra|abrir|abre|ir para|navegar para|rota para|como chegar em)\s+(?:o mapa para |mapas para |rota para |)(.+)$/);
 if(m&&/(mapa|maps|rota|chegar|navegar)/.test(s)){open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(m[1]));return say('Abrindo o mapa para '+m[1]+'.')}
 // Sites
 m=s.match(/^(?:abra|abrir|abre|acessar|acesse)\s+(google|youtube|spotify|whatsapp web|gmail|github|instagram|tiktok)$/);
 if(m){const urls={'google':'https://google.com','youtube':'https://youtube.com','spotify':'https://open.spotify.com','whatsapp web':'https://web.whatsapp.com','gmail':'https://mail.google.com','github':'https://github.com','instagram':'https://instagram.com','tiktok':'https://tiktok.com'};open(urls[m[1]]);return say('Abrindo '+m[1]+'.')}
 // Device settings — opens settings page, never claims to toggle radios
 if(/^(?:abrir|abre|mostrar|ir para|configurar)\s+(?:as configuracoes de |configuracoes de |)(wifi|wi fi|bluetooth)$/.test(s)){
  const what=s.includes('bluetooth')?'BLUETOOTH_SETTINGS':'WIFI_SETTINGS';
  location.href='intent:#Intent;action=android.settings.'+what+';end';
  return say('Abrindo as configurações. O Android precisa confirmar qualquer alteração de '+(what==='BLUETOOTH_SETTINGS'?'Bluetooth':'Wi-Fi')+'.');
 }
 if(/^(?:ligue|ligar|ative|ativar|desligue|desligar)\s+(wifi|wi fi|bluetooth)$/.test(s)){
  const what=s.includes('bluetooth')?'BLUETOOTH_SETTINGS':'WIFI_SETTINGS';
  location.href='intent:#Intent;action=android.settings.'+what+';end';
  return say('Posso abrir as configurações de '+(what==='BLUETOOTH_SETTINGS'?'Bluetooth':'Wi-Fi')+', mas o Android exige sua confirmação para alterar esse recurso.');
 }
 // Notes
 m=s.match(/^(?:anote|anota|salve|salvar|crie uma nota|nova nota)\s+(.+)$/);
 if(m){const a=load('notes',[]);a.push({text:m[1].trim(),at:Date.now()});save('notes',a);if($('#nota'))$('#nota').value=a.map(x=>x.text).join('\n');return say('Nota salva neste aparelho.')}
 if(/^(?:minhas notas|mostrar notas|listar notas|ler notas|quais sao minhas notas)$/.test(s)){return say(notesText())}
 if(/^(?:apagar todas as notas|limpar notas)$/.test(s)){return say('Para proteger suas informações, apague as notas manualmente no painel. Não executei nenhuma exclusão.')}
 // Reminders
 m=s.match(/^(?:me lembre|lembre me|lembrete|crie um lembrete)\s+(?:de\s+)?(.+?)\s+(?:em|daqui a)\s+(.+)$/);
 if(m){const ms=minsFrom(m[2]);if(!ms)return say('Não identifiquei o prazo. Diga, por exemplo: lembre-me de estudar em 20 minutos.');const a=reminderList();a.push({text:m[1].trim(),at:Date.now()+ms,done:false});save('reminders',a);if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});return say('Lembrete programado para '+new Date(Date.now()+ms).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'. Mantenha esta página aberta para receber o aviso.')}
 if(/^(?:meus lembretes|listar lembretes|mostrar lembretes)$/.test(s)){const a=reminderList().filter(x=>!x.done);return say(a.length?'Seus lembretes: '+a.map(x=>x.text+' às '+new Date(x.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})).join('; '):'Não há lembretes pendentes.')}
 // Countdown with flexible duration
 if(/^(?:temporizador|timer|cronometro|contagem regressiva)\s+/.test(s)){const ms=minsFrom(s);if(ms>0){const secs=Math.ceil(ms/1000);if(typeof window.timer==='function')window.timer(secs);else setTimeout(()=>notify('O temporizador terminou.'),ms);return say('Temporizador iniciado para '+Math.round(ms/60000)+' minutos.')} }
 // Media and app launcher shortcuts
 if(/^(?:abrir|abre|inicie|iniciar)\s+(?:o\s+)?(spotify|youtube|whatsapp|instagram|gmail)$/ .test(s)){const app=s.split(' ').pop(),u={spotify:'https://open.spotify.com',youtube:'https://youtube.com',whatsapp:'https://web.whatsapp.com',instagram:'https://instagram.com',gmail:'https://mail.google.com'}[app];open(u);return say('Abrindo '+app+'.')}
 return false;
}
const previous=window.cmd;
window.cmd=async function(text){
 if(await handle(text))return true;
 if(typeof previous==='function')return await previous(text);
 return false;
};
window.jarvisExtraCommands={version:'1.1.0',location:'São Gonçalo, RJ',list:['clima e previsão do tempo em São Gonçalo','localização aproximada São Gonçalo','pesquisa Google','busca Spotify/YouTube','abre sites','abre configurações Wi-Fi/Bluetooth','notas locais','lembretes locais','temporizadores','hora e data','mapas']};
})();