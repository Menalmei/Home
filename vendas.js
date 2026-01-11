const API = "https://script.google.com/macros/s/AKfycbwYgAW9WlamF3c9YYK4LAy7SYWgnQsDS4PWgDwp_iPDbVy_BdalCVy3G_jseog1sxrd/exec";

let produtos = [];
let cupons = [];
let carrinho = [];
let desconto = 0;

document.addEventListener("DOMContentLoaded", () => {

    esconderLoadingEstoque(); // garante estado inicial
    carregarDados();

});

function mostrarLoadingEstoque() {
    document.getElementById("loadingEstoque").style.display = "flex";
}

function esconderLoadingEstoque() {
    document.getElementById("loadingEstoque").style.display = "none";
}


// ================= DADOS =================
async function carregarDados(mostrarLoadingTela = true) {

    if (mostrarLoadingTela) {
        mostrarLoadingEstoque();
    }

    try {
        produtos = await fetch(`${API}?tipo=produtos`).then(r => r.json());
        cupons = await fetch(`${API}?tipo=cupons`).then(r => r.json());
        renderCategorias();
    } catch (e) {
        alert("Erro ao carregar estoque");
        console.error(e);
    } finally {
        if (mostrarLoadingTela) {
            esconderLoadingEstoque();
        }
    }
}

function renderCategorias() {
    const area = document.getElementById("listaProdutos");
    area.innerHTML = "";

    const categorias = [...new Set(produtos.map(p => p.tipo))];

    categorias.forEach(cat => {

        // 🔥 SOMA TOTAL DO ESTOQUE (COLUNA G)
        const totalPecas = produtos
            .filter(p => p.tipo === cat)
            .reduce((soma, p) => soma + Number(p.estoque || 0), 0);

        area.innerHTML += `
            <div class="produto categoria" onclick="selecionarCategoria('${cat}')">

                <div class="img-categoria">

                    <img src="Imagens/Categorias/${cat}.png"
                         onerror="this.src='Imagens/Produtos/sem-imagem.png'">
                </div>
                <span class="quantidade-categoria">${totalPecas}</span>
                <div class="nome-produto">${cat}</div>
            </div>
        `;
    });
}




function selecionarCategoria(categoria) {
    categoriaSelecionada = categoria;

    const filtrados = produtos.filter(p => p.tipo === categoria);
    renderProdutos(filtrados);

    mostrarBotaoVoltar();
}


// ================= PRODUTOS =================
function renderProdutos(lista = []) {
    const area = document.getElementById("listaProdutos");
    area.innerHTML = "";

    lista.forEach(p => {
        if (Number(p.estoque) <= 0) return;

        // normaliza o tipo (remove acentos e espaços)
        const tipoClasse = p.tipo
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");

        area.innerHTML += `
            <div class="produto tipo-${tipoClasse}" onclick="addCarrinho('${p.id}')">

                <img src="Imagens/Produtos/${p.produto}.png"
                     onerror="this.src='Imagens/Produtos/sem-imagem.png'">

                <div class="nome-produto">${p.produto}</div>

                <div class="preco-produto">
                    R$ ${Number(p.preco).toFixed(2)}
                </div>

                <div class="tamanho">${p.tamanho}</div>
                <div class="estoque">Qtd: ${p.estoque}</div>

            </div>
        `;
    });
}



// ================= BUSCA =================
document.getElementById("busca").addEventListener("input", e => {
    const v = e.target.value.toLowerCase();

    let lista = produtos;

    if (categoriaSelecionada) {
        lista = lista.filter(p => p.tipo === categoriaSelecionada);
    }

    renderProdutos(
        lista.filter(p => p.produto.toLowerCase().includes(v))
    );
});



function mostrarBotaoVoltar() {
    document.getElementById("btnVoltar").style.display = "block";
}

function esconderBotaoVoltar() {
    document.getElementById("btnVoltar").style.display = "none";
}

function voltarCategorias() {
    categoriaSelecionada = null;
    document.getElementById("busca").value = "";
    esconderBotaoVoltar();
    renderCategorias();
}


// ================= CARRINHO =================
function addCarrinho(id) {
    const p = produtos.find(x => x.id === id);
    const i = carrinho.find(x => x.id === id);

    if (i) {
        if (i.qtd < p.estoque) i.qtd++;
    } else {
        carrinho.push({ ...p, qtd: 1 });
    }
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const area = document.getElementById("carrinho");
    area.innerHTML = "";
    let total = 0;

    carrinho.forEach((i, index) => {
        const sub = i.qtd * i.preco;
        total += sub;

        const div = document.createElement("div");
        div.className = "carrinho-item";

        div.innerHTML = `
        <span class="col-qtd">${i.qtd}</span>
        <span class="col-item">${i.produto}</span>
        <span class="col-valor">R$ ${sub.toFixed(2)}</span>
        <button class="remover-item" onclick="removerItem(${index})">✕</button>
        `;


        area.appendChild(div);
    });

    if (desconto) total -= total * desconto / 100;

    document.getElementById("total").innerText =
        `Total: R$ ${total.toFixed(2)}`;
}

function aplicarCupom() {
    const c = document.getElementById("cupom").value.toUpperCase();
    const cupom = cupons.find(x => x.nome.toUpperCase() === c);
    desconto = cupom ? cupom.porcentagem : 0;
    document.getElementById("infoCupom").innerText =
        cupom ? `Cupom aplicado (${desconto}%)` : "Cupom inválido";
    atualizarCarrinho();
}

// ================= PAGAMENTO =================
function finalizar() {
    if (!carrinho.length) return;
    document.getElementById("modalPagamento").style.display = "flex";
}

function fecharPagamento() {
    document.getElementById("modalPagamento").style.display = "none";
}

function calcularTotal() {
    let t = 0;
    carrinho.forEach(i => t += i.qtd * i.preco);
    if (desconto) t -= t * desconto / 100;
    return t;
}

function confirmarPagamento(forma) {
    const areaDinheiro = document.getElementById("pagamentoDinheiro");

    if (forma === "Dinheiro") {
        areaDinheiro.style.display = "block";
        document.getElementById("valorPago").value = "";
        document.getElementById("trocoInfo").innerText = "";
        return;
    }

    // Pix ou Cartão finalizam direto
    concluirVenda(forma);
}

function calcularTroco() {
    const pago = Number(valorPago.value);
    const total = calcularTotal();
    const troco = pago - total;
    trocoInfo.innerText = troco >= 0 ? `Troco: R$ ${troco.toFixed(2)}` : `Faltam R$ ${Math.abs(troco).toFixed(2)}`;
}

async function concluirVenda(forma) {
    mostrarLoadingVenda();

    try {
        const totalPedido = calcularTotal();

        const itensSimplificados = carrinho.map(i => ({
            id: i.id,
            produto: i.produto,
            qtd: i.qtd,
            preco: i.preco
        }));

        await fetch(API, {
            method: "POST",
            body: JSON.stringify({
                tipo: "venda",
                pagamento: forma,
                itens: itensSimplificados
            })
        });

        // Gera o comprovante
        gerarComprovante(forma);
        gerarComprovanteA4(forma);
        mostrarComprovante();

        // Chame a impressão AQUI, antes de limpar o carrinho
        // imprimirComprovante(); // descomente se quiser imprimir automático

        mostrarToast("Venda realizada com sucesso ✔");

        // Limpa o carrinho APÓS impressão
        carrinho = [];
        desconto = 0;
        atualizarCarrinho();
        fecharPagamento();

        // Atualiza dados
        carregarDados(false);

    } catch (erro) {
        console.error(erro);
        mostrarToast("Erro ao finalizar venda ❌");
    } finally {
        esconderLoadingVenda();
    }
}





// ================= COMPROVANTE =================
function gerarComprovante(pagamento) {
    const data = new Date().toLocaleString("pt-BR");

    let subtotal = 0;

    compItens.innerHTML = carrinho.map(i => {
        const sub = i.qtd * i.preco;
        subtotal += sub;

        return `
            <div class="comp-item">
                <span>${i.qtd}</span>
                <span>${i.produto}</span>
                <span>R$ ${sub.toFixed(2)}</span>
            </div>
        `;
    }).join("");

    let total = subtotal;
    let descontoValor = 0;

    if (desconto > 0) {
        descontoValor = subtotal * (desconto / 100);
        total -= descontoValor;
    }

    compData.innerText = `Data: ${data}`;
    compSubtotal.innerText = `Subtotal: R$ ${subtotal.toFixed(2)}`;

    compDesconto.innerText = desconto > 0
        ? `Desconto: -R$ ${descontoValor.toFixed(2)}`
        : "";

    compTotal.innerHTML = `<strong>Total: R$ ${total.toFixed(2)}</strong>`;
    compPagamento.innerText = `Pagamento: ${pagamento}`;

    // Troco (somente dinheiro)
    if (pagamento === "Dinheiro") {
        const pago = Number(document.getElementById("valorPago")?.value || 0);
        const troco = pago - total;
        compTroco.innerText = `Troco: R$ ${troco.toFixed(2)}`;
    } else {
        compTroco.innerText = "";
    }

}

function gerarComprovanteA4(pagamento) {

  const itensBody = document.getElementById("a4-itens");
  const totalSpan = document.getElementById("a4-total");
  const dataSpan = document.getElementById("a4-data");

  const subtotalSpan = document.getElementById("a4-subtotal");
  const descontoSpan = document.getElementById("a4-desconto");
  const totalResumoSpan = document.getElementById("a4-total-resumo");
  const pagamentoSpan = document.getElementById("a4-pagamento");
  const trocoSpan = document.getElementById("a4-troco");

  const linhaDesconto = document.getElementById("linha-desconto");
  const linhaTroco = document.getElementById("linha-troco");

  // 🔒 segurança
  if (!itensBody || !totalSpan || !dataSpan) return;

  let subtotal = 0;

  // ITENS
  itensBody.innerHTML = carrinho.map(i => {
    const totalItem = i.qtd * i.preco;
    subtotal += totalItem;

    return `
      <tr>
        <td>${i.produto}</td>
        <td>${i.qtd}</td>
        <td>R$ ${i.preco.toFixed(2)}</td>
        <td>R$ ${totalItem.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  // DESCONTO
  let valorDesconto = 0;
  let totalFinal = subtotal;

  if (desconto > 0) {
    valorDesconto = subtotal * (desconto / 100);
    totalFinal -= valorDesconto;

    linhaDesconto.style.display = "flex";
    descontoSpan.innerText = `- R$ ${valorDesconto.toFixed(2)}`;
  } else {
    linhaDesconto.style.display = "none";
  }

  // SUBTOTAL
  subtotalSpan.innerText = `R$ ${subtotal.toFixed(2)}`;

  // TOTAL
  totalResumoSpan.innerText = `R$ ${totalFinal.toFixed(2)}`;
  totalSpan.innerText = totalFinal.toFixed(2);

  // PAGAMENTO
  pagamentoSpan.innerText = pagamento;

  // TROCO (somente dinheiro)
  if (pagamento === "Dinheiro" && typeof troco !== "undefined" && troco > 0) {
    linhaTroco.style.display = "flex";
    trocoSpan.innerText = `R$ ${troco.toFixed(2)}`;
  } else {
    linhaTroco.style.display = "none";
  }

  // DATA
  dataSpan.innerText = new Date().toLocaleString("pt-BR");
}




function continuarComprando() {
    document.getElementById("comprovante").style.display = "none";

    carrinho = [];
    desconto = 0;

    atualizarCarrinho();

    document.getElementById("cupom").value = "";
    document.getElementById("infoCupom").innerText = "";
}

async function imprimir() {
    const elemento = document.getElementById("comprovante-a4");

    // Mostra temporariamente
    elemento.style.display = "block";

    // Salva tamanho original
    const originalStyle = {
        width: elemento.style.width,
        height: elemento.style.height,
        padding: elemento.style.padding
    };

    // Ajusta para proporção A4 e remove padding/margens
    elemento.style.width = "210mm"; // largura A4
    elemento.style.height = "297mm"; // altura A4
    elemento.style.padding = "5";
    elemento.style.boxSizing = "border-box";

    // Renderiza canvas
    const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff"
    });

    // Restaura estilo original
    elemento.style.width = originalStyle.width;
    elemento.style.height = originalStyle.height;
    elemento.style.padding = originalStyle.padding;

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    // Ajusta imagem para preencher a largura da página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // Centraliza verticalmente caso fique menor que a página
    const marginY = Math.max((pageHeight - imgHeight) / 2, 0);

    pdf.addImage(imgData, "PNG", 0, marginY, imgWidth, imgHeight);
    pdf.save("comprovante.pdf");

    elemento.style.display = "none";
}







function confirmarDinheiro() {
    const pago = Number(document.getElementById("valorPago").value);
    const total = calcularTotal();

    if (!pago || pago < total) {
        document.getElementById("trocoInfo").innerText =
            "Valor insuficiente para finalizar";
        document.getElementById("trocoInfo").style.color = "#dc2626";
        return;
    }

    concluirVenda("Dinheiro");
}

function cancelarVenda() {
    carrinho = [];
    desconto = 0;

    atualizarCarrinho();
    fecharPagamento();

    const msg = document.getElementById("mensagemVenda");
    msg.innerText = "Venda cancelada";
    msg.style.display = "block";

    setTimeout(() => msg.style.display = "none", 2000);
}

function removerItem(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
    
}

async function atualizarProdutosPeriodicamente() {
    try {
        const novosProdutos = await fetch(`${API}?tipo=produtos`).then(r => r.json());
        produtos = novosProdutos;
        renderProdutos(produtos);
    } catch (e) {
        console.error("Erro ao atualizar produtos:", e);
    }
}

function mostrarComprovante() {
    document.getElementById("comprovante").style.display = "block";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function mostrarToast(mensagem) {
    const toast = document.getElementById("toast");
    toast.textContent = mensagem;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000); // 3 segundos
}

function mostrarLoadingVenda() {
    document.getElementById("loadingVenda").style.display = "flex";
}

function esconderLoadingVenda() {
    document.getElementById("loadingVenda").style.display = "none";
}

function mostrarTela(tela) {

  // botões ativos
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('ativo'));
  event.currentTarget?.classList.add('ativo');

  // telas
  const vendasEsquerda = document.querySelector('.esquerda');
  const vendasDireita  = document.querySelector('.direita');
  const registros      = document.getElementById('tela-registros');
  const comprovantes   = document.getElementById('tela-comprovantes');

  // esconde tudo
  vendasEsquerda.style.display = 'none';
  vendasDireita.style.display  = 'none';
  registros.style.display      = 'none';
  comprovantes.style.display   = 'none';

  if (tela === 'vendas') {
    vendasEsquerda.style.display = '';
    vendasDireita.style.display  = '';
  }

  if (tela === 'registros') {
    registros.style.display = 'block';
    registros.querySelector('iframe').src = 'registro.html';
  }

  if (tela === 'comprovantes') {
    comprovantes.style.display = 'block';
    comprovantes.querySelector('iframe').src = 'comprovante.html';
  }
}

window.addEventListener("message", function (event) {

  const menu = document.querySelector('.menu-inferior');

  if (!menu) return;

  if (event.data.modoTV === true) {
    menu.style.display = 'none';
  }

  if (event.data.modoTV === false) {
    menu.style.display = 'flex';
  }
});

let modoTVAtivo = false;

function toggleModoTV() {
  modoTVAtivo ? sairModoTV() : entrarModoTV();
}

function entrarModoTV() {

  const el = document.documentElement;

  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }

  document.body.classList.add('modo-tv');

  document.querySelector('.menu-inferior')?.style.setProperty('display', 'none');

  document.getElementById('btnModoTV').innerText = '↩ Sair do modo TV';
  modoTVAtivo = true;
}

function sairModoTV() {

  if (document.exitFullscreen) {
    document.exitFullscreen();
  }

  document.body.classList.remove('modo-tv');

  document.querySelector('.menu-inferior')?.style.setProperty('display', 'flex');

  document.getElementById('btnModoTV').innerText = '📺 Modo TV';
  modoTVAtivo = false;
}

async function copiarImagem(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      resolve();
    });
  });
}

function abrirWhatsapp(numero, mensagem) {
  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

async function enviarComprovanteWhatsapp() {
  const numero = prompt("Digite o número com DDD:");
  if (!numero) return;

  const canvas = await html2canvas(document.getElementById("comprovante-a4"));

  // 1️⃣ copia a imagem
  await copiarImagem(canvas);

  // 2️⃣ abre o WhatsApp com texto
  abrirWhatsapp(
    numero,
    "Olá! Segue seu comprovante de compra. 📄✅"
  );

  alert("Comprovante copiado! No WhatsApp é só colar (CTRL+V) e enviar.");
}







// Atualiza a cada 5 segundos
//setInterval(atualizarProdutosPeriodicamente, 60000);



