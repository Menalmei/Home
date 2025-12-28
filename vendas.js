const API = "https://script.google.com/macros/s/AKfycbzSYctUQUnUyhgUeYhp7AmnYq77oJCtH0NkAkJkWBysZnmibXYGQWcbeAtXIZPIVbo-/exec";

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
        renderProdutos(produtos);
    } catch (e) {
        alert("Erro ao carregar estoque");
        console.error(e);
    } finally {
        if (mostrarLoadingTela) {
            esconderLoadingEstoque();
        }
    }
}


// ================= PRODUTOS =================
function renderProdutos(lista) {
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

                <div class="badge">${p.tipo}</div>

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
    renderProdutos(produtos.filter(p => p.produto.toLowerCase().includes(v)));
});

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
    // 🔄 MOSTRA LOADING
    mostrarLoadingVenda();

    try {
        // 🧾 Envia a venda
        await fetch(API, {
            method: "POST",
            body: JSON.stringify({
                tipo: "venda",
                pagamento: forma,
                itens: carrinho
            })
        });

        // 🧾 Gera e mostra comprovante
        gerarComprovante(forma);
        mostrarComprovante();

        // 🔄 Limpa venda
        carrinho = [];
        desconto = 0;
        atualizarCarrinho();
        fecharPagamento();

        // ✅ Mensagem de sucesso
        mostrarToast("Venda realizada com sucesso ✔");

        // 🔁 Atualiza dados
        carregarDados(false);

    } catch (erro) {
        console.error(erro);
        mostrarToast("Erro ao finalizar venda ❌");
    } finally {
        // ❌ ESCONDE LOADING (sempre)
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

function continuarComprando() {
    document.getElementById("comprovante").style.display = "none";

    carrinho = [];
    desconto = 0;

    atualizarCarrinho();

    document.getElementById("cupom").value = "";
    document.getElementById("infoCupom").innerText = "";
}



function imprimir() {
    const comp = document.getElementById("comprovante");

    comp.style.display = "block";   // garante que existe
    comp.style.margin = "0 auto";   // centraliza

    setTimeout(() => {
        window.print();
    }, 100);
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


// Atualiza a cada 5 segundos
setInterval(atualizarProdutosPeriodicamente, 60000);



