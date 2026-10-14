const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const elPontuacao = document.getElementById("pontuacao");
const elRecorde = document.getElementById("recorde");
const elNivel = document.getElementById("nivel");
const tabuleiro = document.getElementById("tabuleiro");
const telaMenu = document.getElementById("tela-menu");
const telaDificuldade = document.getElementById("tela-dificuldade");
const telaRecordes = document.getElementById("tela-recordes");
const telaSair = document.getElementById("tela-sair");
const listaRecordes = document.getElementById("lista-recordes");
const elMensagem = document.getElementById("mensagem");
const TELAS = [telaMenu, telaDificuldade, telaRecordes, telaSair, elMensagem];
const elTituloMensagem = document.getElementById("titulo-mensagem");
const elTextoMensagem = document.getElementById("texto-mensagem");
const botoesFimDeJogo = document.getElementById("botoes-fim");
const botaoJogar = document.getElementById("botao-jogar");

// Quanto maior o tabuleiro, mais rápida a cobrinha (menos ms por passo).
const DIFICULDADES = {
  facil: { nome: "Facil", celulas: 7, velocidadeMs: 200 },
  medio: { nome: "Medio", celulas: 15, velocidadeMs: 140 },
  dificil: { nome: "Dificil", celulas: 23, velocidadeMs: 95 },
  extremo: { nome: "Extremo", celulas: 30, velocidadeMs: 60 },
};

const DIRECOES = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const CORES = {
  tela: "#0b0f0c",
  grade: "rgba(57, 255, 20, 0.05)",
  neon: "#39ff14",
  cabeca: "#b6ff9e",
  comida: "#ff2a3d",
  brilhoComida: "#ff4d5e",
};

let dificuldade = DIFICULDADES.medio;
let celulas = dificuldade.celulas;
let tamanhoCelula;
let cobra;
let direcao;
let filaDirecoes; // guarda as teclas apertadas entre um passo e outro
let comida;
let pontuacao = 0;
let recordes = carregarRecordes();
let intervalo = null;
let estado; // "menu" | "esperando" | "jogando" | "fim"

/* ---------- Recordes (um por dificuldade) ---------- */

function carregarRecordes() {
  try {
    return JSON.parse(localStorage.getItem("recordes-cobrinha")) || {};
  } catch {
    return {};
  }
}

function salvarRecordes() {
  try {
    localStorage.setItem("recordes-cobrinha", JSON.stringify(recordes));
  } catch {
    // sem armazenamento disponível: os recordes valem só nesta sessão
  }
}

function chaveDificuldade() {
  return Object.keys(DIFICULDADES).find((k) => DIFICULDADES[k] === dificuldade);
}

function recordeAtual() {
  return recordes[chaveDificuldade()] || 0;
}

/* ---------- Telas ---------- */

function mostrarTela(tela) {
  for (const t of TELAS) {
    t.classList.toggle("oculto", t !== tela);
  }
  const primeiroBotao = tela && tela.querySelector("button:not(.oculto)");
  if (primeiroBotao) primeiroBotao.focus();
}

function abrirMenu() {
  pararLoop();
  estado = "menu";
  pontuacao = 0;
  elNivel.textContent = "-";
  elPontuacao.textContent = "0";
  elRecorde.textContent = "-";
  configurarTabuleiro(DIFICULDADES.medio.celulas);
  cobra = [];
  comida = null;
  desenhar();
  mostrarTela(telaMenu);
}

function abrirDificuldades() {
  mostrarTela(telaDificuldade);
}

function abrirRecordes() {
  listaRecordes.innerHTML = "";
  for (const [chave, d] of Object.entries(DIFICULDADES)) {
    const item = document.createElement("li");
    const nome = document.createElement("span");
    nome.className = "nome";
    nome.textContent = d.nome;
    const valor = document.createElement("span");
    const pontos = recordes[chave];
    valor.className = pontos ? "valor" : "valor vazio";
    valor.textContent = pontos ? pontos : "---";
    item.append(nome, valor);
    listaRecordes.append(item);
  }
  mostrarTela(telaRecordes);
}

function abrirConfirmacaoSair() {
  mostrarTela(telaSair);
  // foca o "Nao" para que um Enter sem querer não feche o site
  telaSair.querySelector("[data-acao=voltar]").focus();
}

function sairDoSite() {
  // Só funciona se a aba foi aberta por um script; senão, o navegador ignora.
  window.close();
  // Se a aba continuar aberta, sai do site indo para uma página em branco.
  setTimeout(() => location.replace("about:blank"), 100);
}

/* ---------- Jogo ---------- */

// O canvas acompanha o tamanho real do tabuleiro na tela (em pixels do
// dispositivo, para ficar nítido); cada célula ocupa um número inteiro de pixels.
function configurarTabuleiro(n) {
  celulas = n;
  const lado = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)) || 420;
  tamanhoCelula = Math.max(1, Math.floor(lado / n));
  canvas.width = canvas.height = tamanhoCelula * n;
}

function escolherDificuldade(chave) {
  dificuldade = DIFICULDADES[chave];
  iniciar();
}

function iniciar() {
  pararLoop();
  configurarTabuleiro(dificuldade.celulas);

  const meio = Math.floor(celulas / 2);
  cobra = [
    { x: meio, y: meio },
    { x: meio - 1, y: meio },
    { x: meio - 2, y: meio },
  ];
  direcao = DIRECOES.ArrowRight;
  filaDirecoes = [];
  pontuacao = 0;
  comida = novaComida();
  estado = "esperando";

  elNivel.textContent = dificuldade.nome;
  atualizarPlacar();
  elTituloMensagem.textContent = dificuldade.nome;
  elTituloMensagem.className = "titulo-mensagem nivel";
  elTextoMensagem.textContent = "Pressione uma seta para comecar";
  elTextoMensagem.classList.add("piscando");
  botoesFimDeJogo.classList.add("oculto");
  mostrarTela(elMensagem);
  desenhar();
}

function comecar() {
  estado = "jogando";
  mostrarTela(null);
  intervalo = setInterval(passo, dificuldade.velocidadeMs);
}

function pararLoop() {
  clearInterval(intervalo);
  intervalo = null;
}

function novaComida() {
  const livres = [];
  for (let x = 0; x < celulas; x++) {
    for (let y = 0; y < celulas; y++) {
      if (!cobra.some((p) => p.x === x && p.y === y)) livres.push({ x, y });
    }
  }
  return livres[Math.floor(Math.random() * livres.length)];
}

function passo() {
  if (filaDirecoes.length > 0) direcao = filaDirecoes.shift();

  const cabeca = { x: cobra[0].x + direcao.x, y: cobra[0].y + direcao.y };
  const comeu = cabeca.x === comida.x && cabeca.y === comida.y;

  // Se não comeu, a cauda sai do lugar neste passo, então pode ser ocupada.
  const corpo = comeu ? cobra : cobra.slice(0, -1);
  const bateuNaParede =
    cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= celulas || cabeca.y >= celulas;
  const bateuEmSi = corpo.some((p) => p.x === cabeca.x && p.y === cabeca.y);

  if (bateuNaParede || bateuEmSi) {
    fimDeJogo();
    return;
  }

  cobra.unshift(cabeca);
  if (comeu) {
    pontuacao += 10;
    atualizarPlacar();
    if (cobra.length === celulas * celulas) {
      fimDeJogo(true);
      return;
    }
    comida = novaComida();
  } else {
    cobra.pop();
  }

  desenhar();
}

function fimDeJogo(venceu = false) {
  pararLoop();
  estado = "fim";

  if (pontuacao > recordeAtual()) {
    recordes[chaveDificuldade()] = pontuacao;
    salvarRecordes();
    atualizarPlacar();
  }

  desenhar();
  elTituloMensagem.textContent = venceu ? "Voce venceu!" : "Fim de jogo";
  elTituloMensagem.className = venceu ? "titulo-mensagem vitoria" : "titulo-mensagem";
  elTextoMensagem.textContent = `Pontuacao: ${pontuacao}`;
  elTextoMensagem.classList.remove("piscando");
  botoesFimDeJogo.classList.remove("oculto");
  mostrarTela(elMensagem);
}

function atualizarPlacar() {
  elPontuacao.textContent = pontuacao;
  elRecorde.textContent = recordeAtual();
}

/* ---------- Desenho ---------- */

function desenharGrade() {
  ctx.strokeStyle = CORES.grade;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < celulas; i++) {
    const p = i * tamanhoCelula + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
  }
  ctx.stroke();
}

function desenharComida() {
  const cx = comida.x * tamanhoCelula + tamanhoCelula / 2;
  const cy = comida.y * tamanhoCelula + tamanhoCelula / 2;
  const escala = tamanhoCelula / 20;

  ctx.save();
  ctx.shadowColor = CORES.brilhoComida;
  ctx.shadowBlur = 14 * escala;
  ctx.fillStyle = CORES.comida;
  ctx.beginPath();
  ctx.arc(cx, cy, tamanhoCelula / 2 - 3 * escala, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // pequeno reflexo para dar volume
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(cx - 3 * escala, cy - 3 * escala, 2 * escala, 0, Math.PI * 2);
  ctx.fill();
}

function desenharCobra() {
  const margem = Math.max(1, Math.round(tamanhoCelula / 10));
  const lado = tamanhoCelula - margem * 2;

  ctx.save();
  ctx.shadowColor = CORES.neon;
  ctx.shadowBlur = 10 * (tamanhoCelula / 20);
  // desenha da cauda para a cabeça, assim a cabeça fica por cima
  for (let i = cobra.length - 1; i >= 0; i--) {
    const parte = cobra[i];
    ctx.fillStyle = i === 0 ? CORES.cabeca : CORES.neon;
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.55, 1 - i * 0.02);
    ctx.fillRect(
      parte.x * tamanhoCelula + margem,
      parte.y * tamanhoCelula + margem,
      lado,
      lado
    );
  }
  ctx.restore();

  desenharOlhos();
}

function desenharOlhos() {
  const cabeca = cobra[0];
  const escala = tamanhoCelula / 20;
  const cx = cabeca.x * tamanhoCelula + tamanhoCelula / 2;
  const cy = cabeca.y * tamanhoCelula + tamanhoCelula / 2;
  // olhos ficam do lado para onde a cobra está indo
  const frente = 4 * escala;
  const lado = 4 * escala;
  const olho = Math.max(2, Math.round(3 * escala));
  const px = -direcao.y; // vetor perpendicular à direção
  const py = direcao.x;

  ctx.fillStyle = CORES.tela;
  for (const s of [-1, 1]) {
    ctx.fillRect(
      Math.round(cx + direcao.x * frente + px * lado * s - olho / 2),
      Math.round(cy + direcao.y * frente + py * lado * s - olho / 2),
      olho,
      olho
    );
  }
}

function desenhar() {
  ctx.fillStyle = CORES.tela;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharGrade();
  if (comida) desenharComida();
  if (cobra.length) desenharCobra();
}

/* ---------- Controles ---------- */

// Nos menus, as setas ↑ ↓ movem o foco entre os botões.
function navegarMenu(evento) {
  const tela = TELAS.find(
    (t) => !t.classList.contains("oculto")
  );
  if (!tela || (evento.key !== "ArrowUp" && evento.key !== "ArrowDown")) return false;

  const botoes = [...tela.querySelectorAll("button")].filter((b) => b.offsetParent);
  if (!botoes.length) return false;
  const atual = botoes.indexOf(document.activeElement);
  const passoFoco = evento.key === "ArrowDown" ? 1 : -1;
  const proximo = (atual + passoFoco + botoes.length) % botoes.length;
  botoes[proximo].focus();
  evento.preventDefault();
  return true;
}

document.addEventListener("keydown", (evento) => {
  if (estado === "menu" || estado === "fim") {
    // Esc volta ao menu a partir das telas de dificuldade, recordes e sair
    if (evento.key === "Escape" && estado === "menu") mostrarTela(telaMenu);
    navegarMenu(evento);
    return;
  }

  const nova = DIRECOES[evento.key];
  if (!nova) return;
  evento.preventDefault(); // evita rolar a página com as setas

  // Compara com a última direção pedida para não deixar a cobra dar meia-volta,
  // mesmo quando duas teclas são apertadas rapidamente no mesmo passo.
  const ultima = filaDirecoes.length ? filaDirecoes[filaDirecoes.length - 1] : direcao;
  const meiaVolta = nova.x === -ultima.x && nova.y === -ultima.y;
  const repetida = nova === ultima;

  if (estado === "esperando") {
    if (meiaVolta) return;
    filaDirecoes.push(nova);
    comecar();
    return;
  }

  if (!meiaVolta && !repetida && filaDirecoes.length < 3) {
    filaDirecoes.push(nova);
  }
});

// Um único ouvinte trata os botões de todas as telas pelo atributo data-*.
tabuleiro.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button");
  if (!botao) return;

  if (botao.dataset.dificuldade) {
    escolherDificuldade(botao.dataset.dificuldade);
    return;
  }

  switch (botao.dataset.acao) {
    case "jogar":
      abrirDificuldades();
      break;
    case "recordes":
      abrirRecordes();
      break;
    case "sair":
      abrirConfirmacaoSair();
      break;
    case "confirmar-saida":
      sairDoSite();
      break;
    case "voltar":
      mostrarTela(telaMenu);
      break;
    case "menu":
      abrirMenu();
      break;
  }
});

botaoJogar.addEventListener("click", iniciar);

// Quando a janela muda de tamanho, o canvas é recalculado e redesenhado.
new ResizeObserver(() => {
  configurarTabuleiro(celulas);
  desenhar();
}).observe(canvas);

abrirMenu();
