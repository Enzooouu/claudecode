const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const elPontuacao = document.getElementById("pontuacao");
const elRecorde = document.getElementById("recorde");
const elMensagem = document.getElementById("mensagem");
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
  elTextoMensagem.textContent = venceu
    ? `Você venceu! Pontuação: ${pontuacao}`
    : `Fim de jogo! Pontuação: ${pontuacao}`;
  botaoJogar.classList.remove("oculto");
  elMensagem.classList.remove("oculto");
  botaoJogar.focus();
}

function atualizarPlacar() {
  elPontuacao.textContent = pontuacao;
  elRecorde.textContent = recorde;
}

function desenharCelula(x, y, cor, margem = 1) {
  ctx.fillStyle = cor;
  ctx.fillRect(
    x * TAMANHO_CELULA + margem,
    y * TAMANHO_CELULA + margem,
    TAMANHO_CELULA - margem * 2,
    TAMANHO_CELULA - margem * 2
  );
}

function desenhar() {
  ctx.fillStyle = "#22272e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // comida
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(
    comida.x * TAMANHO_CELULA + TAMANHO_CELULA / 2,
    comida.y * TAMANHO_CELULA + TAMANHO_CELULA / 2,
    TAMANHO_CELULA / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // cobra (cabeça mais clara)
  cobra.forEach((parte, i) => {
    desenharCelula(parte.x, parte.y, i === 0 ? "#b5f5c1" : "#7bd88f");
  });
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
