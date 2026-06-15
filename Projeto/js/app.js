import { db } from './firebase-config.js';
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Listas em memória para unificar os dados do banco de dados
let listaCategorias = [];
let listaProdutos = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Escuta as categorias em tempo real
    onSnapshot(collection(db, "categorias"), (snapshotCats) => {
        listaCategorias = snapshotCats.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarVitrinePremium();
    });

    // 2. Escuta os produtos ativos em tempo real
    const qProdutos = query(collection(db, "produtos"), where("ativo", "==", true));
    onSnapshot(qProdutos, (snapshotProds) => {
        listaProdutos = snapshotProds.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarVitrinePremium();
    });
});

// FUNÇÃO RENDERIZADORA: Cruza as duas coleções instantaneamente
function renderizarVitrinePremium() {
    const containerProdutos = document.getElementById('lista-produtos');
    const menuCategorias = document.getElementById('menu-categorias');
    
    if (!containerProdutos || !menuCategorias) return;

    // Cria um dicionário de ID -> Nome da Categoria para mapeamento rápido
    const dicionarioCats = {};
    listaCategorias.forEach(c => {
        dicionarioCats[c.id] = c.nome;
    });

    if (listaProdutos.length === 0) {
        containerProdutos.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-plate-wheat"></i>
                <p>O nosso fogão está a aquecer.<br>O cardápio estará disponível em breve!</p>
            </div>`;
        menuCategorias.innerHTML = '';
        return;
    }

    // Agrupa os produtos de acordo com o nome real da categoria
    const grupos = {};
    listaProdutos.forEach(p => {
        const nomeCategoria = dicionarioCats[p.categoriaId] || "Outros";
        if (!grupos[nomeCategoria]) {
            grupos[nomeCategoria] = [];
        }
        grupos[nomeCategoria].push(p);
    });

    // Limpa os elementos visuais antes de redesenhar
    containerProdutos.innerHTML = '';
    menuCategorias.innerHTML = '';

    // Ordena as categorias alfabeticamente (deixando a categoria 'Outros' por último, se existir)
    const nomesCategoriasOrdenadas = Object.keys(grupos).sort((a, b) => {
        if (a === "Outros") return 1;
        if (b === "Outros") return -1;
        return a.localeCompare(b);
    });

    // 1. GERA A BARRA DE NAVEGAÇÃO SUPERIOR (STICKY NAV)
    nomesCategoriasOrdenadas.forEach((nomeGrupo, index) => {
        const idAncora = `secao-${nomeGrupo.replace(/\s+/g, '')}`;
        const classeAtivo = index === 0 ? 'ativo' : '';
        
        menuCategorias.innerHTML += `
            <a href="#${idAncora}" class="btn-nav-categoria ${classeAtivo}" onclick="ativarAba(event, this)">
                ${nomeGrupo}
            </a>
        `;
    });

    // 2. GERA AS SEÇÕES DE PRODUTOS (PADRÃO FLAT LIST DE ALTA CONVERSÃO)
    nomesCategoriasOrdenadas.forEach(nomeGrupo => {
        const pratos = grupos[nomeGrupo];
        pratos.sort((a, b) => a.nome.localeCompare(b.nome));

        const idAncora = `secao-${nomeGrupo.replace(/\s+/g, '')}`;

        let secaoHTML = `
            <section id="${idAncora}" class="secao-categoria">
                <h2 class="titulo-secao-app">${nomeGrupo}</h2>
                <div class="lista-nativa-produtos">
        `;

        pratos.forEach(p => {
            const imagemPadrao = "https://images.unsplash.com/photo-1544025162-831550f83fc4?w=500&q=80";
            const imgUrl = p.imagemUrl ? p.imagemUrl : imagemPadrao;
            
            secaoHTML += `
                <div class="item-nativo">
                    <div class="item-nativo-info">
                        <h3 class="item-nativo-titulo">${p.nome}</h3>
                        <p class="item-nativo-desc">${p.descricao || 'Sabor de casa, preparado com muito carinho.'}</p>
                        <span class="item-nativo-preco">R$ ${p.preco.toFixed(2)}</span>
                    </div>
                    
                    <div class="item-nativo-img">
                        <img src="${imgUrl}" alt="${p.nome}" loading="lazy">
                    </div>
                </div>
            `;
        });

        secaoHTML += `</div></section>`;
        containerProdutos.innerHTML += secaoHTML;
    });
}

// Controla graficamente o estado ativo da barra de navegação
window.ativarAba = (event, elemento) => {
    document.querySelectorAll('.btn-nav-categoria').forEach(btn => btn.classList.remove('ativo'));
    elemento.classList.add('ativo');
};