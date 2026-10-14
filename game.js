const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const elPontuacao = document.getElementById("pontuacao");
const elRecorde = document.getElementById("recorde");
const elMensagem = document.getElementById("mensagem");
const elTituloMensagem = document.getElementById("titulo-mensagem");
const elTextoMensagem = document.getElementById("texto-mensagem");
const botaoJogar = document.getElementById("botao-jogar");

const TAMANHO_CELULA = 20;
const CELULAS = canvas.width / TAMANHO_CELULA; // 20 x 20
const VELOCIDADE_MS = 110;

const DIRECOES = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

let cobra;
let direcao;
let filaDirecoes; // guarda as teclas apertadas entre um passo e outro
let comida;
let pontuacao;
let recorde = carregarRecorde();
let intervalo = null;
let estado; // "esperando" | "jogando" | "fim"

function carregarRecorde() {
  try {
    return Number(localStorage.getItem("recorde-cobrinha")) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde() {
  try {
    localStorage.setItem("recorde-cobrinha", String(recorde));
  } catch {
    // sem armazenamento disponível: o recorde vale só nesta sessão
  }
}

function iniciar() {
  const meio = Math.floor(CELULAS / 2);
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

  clearInterval(intervalo);
  intervalo = null;

  atualizarPlacar();
  elTituloMensagem.classList.add("oculto");
  elTextoMensagem.textContent = "Pressione uma seta para começar";
  botaoJogar.classList.add("oculto");
  elMensagem.classList.remove("oculto");
  desenhar();
}

function comecar() {
  estado = "jogando";
  elMensagem.classList.add("oculto");
  intervalo = setInterval(passo, VELOCIDADE_MS);
}

function novaComida() {
  const livres = [];
  for (let x = 0; x < CELULAS; x++) {
    for (let y = 0; y < CELULAS; y++) {
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
    cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= CELULAS || cabeca.y >= CELULAS;
  const bateuEmSi = corpo.some((p) => p.x === cabeca.x && p.y === cabeca.y);

  if (bateuNaParede || bateuEmSi) {
    fimDeJogo();
    return;
  }

  cobra.unshift(cabeca);
  if (comeu) {
    pontuacao += 10;
    atualizarPlacar();
    if (cobra.length === CELULAS * CELULAS) {
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
  clearInterval(intervalo);
  intervalo = null;
  estado = "fim";

  if (pontuacao > recorde) {
    recorde = pontuacao;
    salvarRecorde();
    atualizarPlacar();
  }

  desenhar();
  elTituloMensagem.textContent = venceu ? "Você venceu!" : "Fim de jogo";
  elTituloMensagem.classList.toggle("vitoria", venceu);
  elTituloMensagem.classList.remove("oculto");
  elTextoMensagem.textContent = `Pontuação: ${pontuacao}`;
  botaoJogar.classList.remove("oculto");
  elMensagem.classList.remove("oculto");
  botaoJogar.focus();
}

function atualizarPlacar() {
  elPontuacao.textContent = pontuacao;
  elRecorde.textContent = recorde;
}

const CORES = {
  tela: "#0b0f0c",
  grade: "rgba(57, 255, 20, 0.05)",
  neon: "#39ff14",
  cabeca: "#b6ff9e",
  comida: "#ff2a3d",
  brilhoComida: "#ff4d5e",
};

function desenharGrade() {
  ctx.strokeStyle = CORES.grade;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < CELULAS; i++) {
    const p = i * TAMANHO_CELULA + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
  }
  ctx.stroke();
}

function desenharComida() {
  const cx = comida.x * TAMANHO_CELULA + TAMANHO_CELULA / 2;
  const cy = comida.y * TAMANHO_CELULA + TAMANHO_CELULA / 2;

  ctx.save();
  ctx.shadowColor = CORES.brilhoComida;
  ctx.shadowBlur = 14;
  ctx.fillStyle = CORES.comida;
  ctx.beginPath();
  ctx.arc(cx, cy, TAMANHO_CELULA / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // pequeno reflexo para dar volume
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function desenharCobra() {
  const margem = 2;
  const lado = TAMANHO_CELULA - margem * 2;

  ctx.save();
  ctx.shadowColor = CORES.neon;
  ctx.shadowBlur = 10;
  // desenha da cauda para a cabeça, assim a cabeça fica por cima
  for (let i = cobra.length - 1; i >= 0; i--) {
    const parte = cobra[i];
    ctx.fillStyle = i === 0 ? CORES.cabeca : CORES.neon;
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.55, 1 - i * 0.02);
    ctx.fillRect(
      parte.x * TAMANHO_CELULA + margem,
      parte.y * TAMANHO_CELULA + margem,
      lado,
      lado
    );
  }
  ctx.restore();

  desenharOlhos();
}

function desenharOlhos() {
  const cabeca = cobra[0];
  const cx = cabeca.x * TAMANHO_CELULA + TAMANHO_CELULA / 2;
  const cy = cabeca.y * TAMANHO_CELULA + TAMANHO_CELULA / 2;
  // olhos ficam do lado para onde a cobra está indo
  const frente = 4;
  const lado = 4;
  const px = -direcao.y; // vetor perpendicular à direção
  const py = direcao.x;

  ctx.fillStyle = CORES.tela;
  for (const s of [-1, 1]) {
    ctx.fillRect(
      Math.round(cx + direcao.x * frente + px * lado * s) - 1.5,
      Math.round(cy + direcao.y * frente + py * lado * s) - 1.5,
      3,
      3
    );
  }
}

function desenhar() {
  ctx.fillStyle = CORES.tela;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharGrade();
  desenharComida();
  desenharCobra();
}

document.addEventListener("keydown", (evento) => {
  const nova = DIRECOES[evento.key];
  if (!nova) return;
  evento.preventDefault(); // evita rolar a página com as setas

  if (estado === "fim") return;

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

botaoJogar.addEventListener("click", iniciar);

iniciar();
