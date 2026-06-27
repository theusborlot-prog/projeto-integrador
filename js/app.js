import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let produtosGlobais = [];
let categoriasGlobais = {};
let categoriaSelecionada = 'todos';

// Mapeamento dos Nós do DOM
const domCategorias = document.getElementById('menu-categorias');
const domProdutos = document.getElementById('lista-produtos');
const telaEntrada = document.getElementById('tela-entrada');
const telaMenu = document.getElementById('tela-menu');
const containerModal = document.getElementById('container-modal-cliente');

// Gerenciamento de Transição Controlada de Telas
window.iniciarCardapio = () => {
    telaEntrada.classList.add('oculto');
    telaMenu.classList.remove('oculto');
    window.scrollTo(0, 0);
};

// Algoritmo de Correspondência Semântica para Ícones
function obterIconeCategoria(nomeCategoria) {
    const nomeLower = nomeCategoria.toLowerCase();
    if (nomeLower.includes('carne') || nomeLower.includes('churrasco') || nomeLower.includes('espeto')) return 'fa-cow';
    if (nomeLower.includes('bebida') || nomeLower.includes('suco') || nomeLower.includes('refrigerante')) return 'fa-beer-mug-empty';
    if (nomeLower.includes('sobremesa') || nomeLower.includes('doce') || nomeLower.includes('pudim')) return 'fa-ice-cream';
    if (nomeLower.includes('acompanhamento') || nomeLower.includes('porção') || nomeLower.includes('arroz')) return 'fa-bowl-food';
    return 'fa-tag';
}

// Escuta em Tempo Real: Categorias
onSnapshot(collection(db, "categorias"), (snap) => {
    categoriasGlobais = {};
    snap.forEach(doc => {
        categoriasGlobais[doc.id] = doc.data().nome;
    });
    renderizarMenuCategorias();
});

// Escuta em Tempo Real: Produtos Ativos
onSnapshot(collection(db, "produtos"), (snap) => {
    produtosGlobais = [];
    snap.forEach(doc => {
        const p = doc.data();
        if (p.ativo) {
            produtosGlobais.push({ id: doc.id, ...p });
        }
    });
    renderizarProdutos();
});

function renderizarMenuCategorias() {
    let html = `<button class="btn-nav-categoria ${categoriaSelecionada === 'todos' ? 'ativo' : ''}" onclick="mudarCategoria('todos')">
                    <i class="fa-solid fa-star"></i> Todos
                </button>`;
    
    const catsArray = Object.entries(categoriasGlobais).sort((a, b) => a[1].localeCompare(b[1]));
    
    catsArray.forEach(([id, nome]) => {
        const icone = obterIconeCategoria(nome);
        html += `<button class="btn-nav-categoria ${categoriaSelecionada === id ? 'ativo' : ''}" onclick="mudarCategoria('${id}')">
                    <i class="fa-solid ${icone}"></i> ${nome}
                 </button>`;
    });
    
    domCategorias.innerHTML = html;
}

window.mudarCategoria = (idCategoria) => {
    categoriaSelecionada = idCategoria;
    renderizarMenuCategorias();
    renderizarProdutos();
};

// Componente de Cartão Isolado para Evitar Duplicação de Código (DRY)
function criarCardProdutoHTML(p) {
    const imgDisplay = p.imagemUrl || "https://images.unsplash.com/photo-1544025162-831550f83fc4?w=150";
    const ehDestaque = p.nome.toLowerCase().includes('picanha') || p.nome.toLowerCase().includes('especial') || p.nome.toLowerCase().includes('premium');
    const badgeHtml = ehDestaque ? `<div class="badge-destaque"><i class="fa-solid fa-fire"></i> Sucesso</div>` : '';

    return `
        <div class="card-produto-mobile" onclick="abrirPopUpProduto('${p.id}')">
            <div class="img-container-mobile">
                <img src="${imgDisplay}" alt="${p.nome}" class="img-mobile-card">
                ${badgeHtml}
            </div>
            <div class="info-mobile-card">
                <h3 class="nome-mobile-card">${p.nome}</h3>
                <span class="preco-mobile-card">R$ ${p.preco.toFixed(2)}</span>
            </div>
        </div>
    `;
}

function renderizarProdutos() {
    domProdutos.innerHTML = '';
    
    if (produtosGlobais.length === 0) {
        domProdutos.innerHTML = `<div class="empty-state" style="text-align:center; padding: 60px 20px; color: #888; font-weight: 500;">Não existem itens disponíveis no momento.</div>`;
        return;
    }

    if (categoriaSelecionada === 'todos') {
        // Agrupamento Estruturado por Categoria
        const grupos = {};
        produtosGlobais.forEach(p => {
            const nomeCat = categoriasGlobais[p.categoriaId] || "Sem Categoria";
            if (!grupos[nomeCat]) grupos[nomeCat] = [];
            grupos[nomeCat].push(p);
        });

        const categoriasOrdenadas = Object.keys(grupos).sort();

        categoriasOrdenadas.forEach(nomeCat => {
            const itensDoGrupo = grupos[nomeCat];
            itensDoGrupo.sort((a, b) => a.nome.localeCompare(b.nome));

            // Injeta o Cabeçalho da Categoria com o Ícone Dinâmico
            const icone = obterIconeCategoria(nomeCat);
            domProdutos.innerHTML += `
                <h2 class="titulo-categoria-vitrine">
                    <i class="fa-solid ${icone}"></i> ${nomeCat}
                </h2>
                <div class="lista-mobile-produtos">
                    ${itensDoGrupo.map(p => criarCardProdutoHTML(p)).join('')}
                </div>
            `;
        });
    } else {
        // Filtragem Direta para Categoria Isolada
        const produtosFiltrados = produtosGlobais.filter(p => p.categoriaId === categoriaSelecionada);
        produtosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));

        const nomeCat = categoriasGlobais[categoriaSelecionada] || "Categoria";
        const icone = obterIconeCategoria(nomeCat);

        domProdutos.innerHTML += `
            <h2 class="titulo-categoria-vitrine">
                <i class="fa-solid ${icone}"></i> ${nomeCat}
            </h2>
        `;

        if (produtosFiltrados.length === 0) {
            domProdutos.innerHTML += `<div class="empty-state" style="text-align:center; padding: 40px 20px; color: #888;">Nenhum produto disponível nesta categoria.</div>`;
            return;
        }

        domProdutos.innerHTML += `
            <div class="lista-mobile-produtos">
                ${produtosFiltrados.map(p => criarCardProdutoHTML(p)).join('')}
            </div>
        `;
    }
}

window.abrirPopUpProduto = (idProduto) => {
    const p = produtosGlobais.find(item => item.id === idProduto);
    if (!p) return;

    const imgDisplay = p.imagemUrl || "https://images.unsplash.com/photo-1544025162-831550f83fc4?w=400";
    
    containerModal.innerHTML = `
        <div id="modal-detalhe" class="modal-overlay">
            <div class="modal-vitrine-centered">
                <div class="modal-header-img" style="background-image: url('${imgDisplay}')">
                    <button class="btn-fechar-circulo" onclick="fecharPopUpProduto()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="glass-body-centered">
                    <h2 style="font-family: 'Playfair Display', serif; margin-bottom: 5px; color: #111; font-size: 1.5rem;">${p.nome}</h2>
                    <h3 style="color: var(--cor-primaria); margin-bottom: 15px; font-size: 1.3rem;">R$ ${p.preco.toFixed(2)}</h3>
                    <p style="color: #555; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px;">
                        ${p.descricao || 'Este item não possui uma descrição comercial informada.'}
                    </p>
                    <button class="btn-submit-premium" onclick="fecharPopUpProduto()">
                        <i class="fa-solid fa-arrow-left"></i> Voltar ao Cardápio
                    </button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => document.getElementById('modal-detalhe').classList.add('ativo'), 10);
};

window.fecharPopUpProduto = () => {
    const modal = document.getElementById('modal-detalhe');
    if (modal) {
        modal.classList.remove('ativo');
        setTimeout(() => modal.remove(), 300);
    }
};