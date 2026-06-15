import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let mapaCategorias = {};
let listaProdutosGlobal = []; // Guarda todos os produtos para facilitar a edição

// ================== CONTROLO DOS MODAIS ==================
window.abrirModal = (id) => document.getElementById(id).classList.add('ativo');
window.fecharModal = (id) => document.getElementById(id).classList.remove('ativo');

// ================== GERENCIADOR DE CATEGORIAS ==================
document.getElementById('form-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputNome = document.getElementById('nome-cat');
    const nomeCat = inputNome.value.trim();
    const btn = e.target.querySelector('button');

    btn.disabled = true;

    try {
        await addDoc(collection(db, "categorias"), { nome: nomeCat });
        inputNome.value = '';
        mostrarToast("Categoria adicionada!");
    } catch (error) {
        mostrarToast("Erro ao salvar categoria.");
    } finally {
        btn.disabled = false;
    }
});

window.apagarCategoria = async (id) => {
    if (confirm("Deseja remover esta categoria? Itens vinculados ficarão sem categoria.")) {
        try {
            await deleteDoc(doc(db, "categorias", id));
            mostrarToast("Categoria removida.");
        } catch (error) {
            mostrarToast("Erro ao excluir categoria.");
        }
    }
};

onSnapshot(collection(db, "categorias"), (snap) => {
    const selectNovo = document.getElementById('categoria-prod');
    const selectEdit = document.getElementById('edit-categoria-prod'); // O select do modal de edição
    const listaUI = document.getElementById('lista-categorias-admin');
    const kpiCategorias = document.getElementById('kpi-categorias');
    
    selectNovo.innerHTML = '<option value="">Selecione uma categoria...</option>';
    selectEdit.innerHTML = '<option value="">Selecione uma categoria...</option>';
    listaUI.innerHTML = '';
    mapaCategorias = {};
    kpiCategorias.innerText = snap.size;

    if (snap.empty) {
        selectNovo.innerHTML = '<option value="">Crie uma categoria primeiro...</option>';
        listaUI.innerHTML = '<p class="empty-text-mini">Nenhuma categoria ativa.</p>';
        return;
    }

    const cats = snap.docs.map(d => ({ id: d.id, nome: d.data().nome }));
    cats.sort((a, b) => a.nome.localeCompare(b.nome));

    cats.forEach(c => {
        mapaCategorias[c.id] = c.nome;
        
        // Adiciona as opções nos dois selects (Novo e Editar)
        const optionHTML = `<option value="${c.id}">${c.nome}</option>`;
        selectNovo.innerHTML += optionHTML;
        selectEdit.innerHTML += optionHTML;

        listaUI.innerHTML += `
            <div class="tag-categoria-painel">
                <span>${c.nome}</span>
                <button onclick="apagarCategoria('${c.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
    });
});

// ================== GERENCIADOR DE PRODUTOS ==================

// 1. ADICIONAR NOVO PRODUTO
document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';

    const produtoPayload = {
        nome: document.getElementById('nome-prod').value.trim(),
        preco: parseFloat(document.getElementById('preco-prod').value),
        categoriaId: document.getElementById('categoria-prod').value,
        descricao: document.getElementById('desc-prod').value.trim(),
        imagemUrl: document.getElementById('img-prod').value.trim(),
        ativo: true
    };

    try {
        await addDoc(collection(db, "produtos"), produtoPayload);
        mostrarToast("Item publicado no catálogo!");
        e.target.reset(); 
        fecharModal('modal-produto'); 
    } catch (error) {
        mostrarToast("Falha ao salvar produto.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Publicar no Cardápio';
    }
});

// 2. EDITAR PRODUTO EXISTENTE
document.getElementById('form-editar-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Atualizando...';

    const idProduto = document.getElementById('edit-id-prod').value;

    const produtoAtualizado = {
        nome: document.getElementById('edit-nome-prod').value.trim(),
        preco: parseFloat(document.getElementById('edit-preco-prod').value),
        categoriaId: document.getElementById('edit-categoria-prod').value,
        descricao: document.getElementById('edit-desc-prod').value.trim(),
        imagemUrl: document.getElementById('edit-img-prod').value.trim()
    };

    try {
        await updateDoc(doc(db, "produtos", idProduto), produtoAtualizado);
        mostrarToast("Item atualizado com sucesso!");
        fecharModal('modal-editar-produto');
    } catch (error) {
        mostrarToast("Falha ao atualizar produto.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
    }
});

// ================== LISTAGEM E AÇÕES NA TABELA ==================
onSnapshot(collection(db, "produtos"), (snap) => {
    const container = document.getElementById('lista-produtos-admin');
    const kpiAtivos = document.getElementById('kpi-ativos');
    const kpiPausados = document.getElementById('kpi-pausados');
    
    container.innerHTML = '';
    listaProdutosGlobal = []; // Limpa e recarrega a lista global
    let contagemAtivos = 0;
    let contagemPausados = 0;

    if (snap.empty) {
        kpiAtivos.innerText = "0";
        kpiPausados.innerText = "0";
        container.innerHTML = `
            <div class="dashboard-empty-state">
                <i class="fa-solid fa-box-open"></i>
                <p>O seu cardápio está vazio.</p>
                <button onclick="abrirModal('modal-produto')" class="btn-top-primario" style="margin-top: 15px;">Adicionar Primeiro Item</button>
            </div>`;
        return;
    }

    const grupos = {};

    snap.forEach(doc => {
        const p = { id: doc.id, ...doc.data() };
        listaProdutosGlobal.push(p); // Salva na memória global para a edição funcionar

        if (p.ativo) contagemAtivos++; else contagemPausados++;
        const nomeDaCategoria = mapaCategorias[p.categoriaId] || "Sem Categoria";
        if (!grupos[nomeDaCategoria]) grupos[nomeDaCategoria] = [];
        grupos[nomeDaCategoria].push(p);
    });

    kpiAtivos.innerText = contagemAtivos;
    kpiPausados.innerText = contagemPausados;

    Object.keys(grupos).sort().forEach(nomeCat => {
        const itens = grupos[nomeCat];
        itens.sort((a, b) => a.nome.localeCompare(b.nome));

        container.innerHTML += `<div class="categoria-separador-admin">${nomeCat}</div>`;

        itens.forEach(p => {
            const imgDisplay = p.imagemUrl || "https://images.unsplash.com/photo-1544025162-831550f83fc4?w=150";
            const itemClasseStatus = p.ativo ? "" : "item-pausado-layout";
            const badgeHTML = p.ativo 
                ? `<span class="badge-status badge-ativo">Disponível</span>` 
                : `<span class="badge-status badge-pausado">Pausado</span>`;
                
            const iconeToggle = p.ativo ? "fa-eye-slash" : "fa-eye";

            container.innerHTML += `
                <div class="item-linha ${itemClasseStatus}">
                    <img src="${imgDisplay}" class="item-img-min" alt="">
                    <div class="item-dados">
                        <div class="item-dados-top">
                            <h4>${p.nome}</h4>
                            ${badgeHTML}
                        </div>
                        <p class="desc-limiter-admin">${p.descricao || 'Sem descrição.'}</p>
                        <strong class="preco-admin">R$ ${p.preco.toFixed(2)}</strong>
                    </div>
                    <div class="acoes-linha">
                        <button onclick="abrirEdicao('${p.id}')" class="btn-icon edit" title="Editar Informações">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        
                        <button onclick="alternarStatus('${p.id}', ${p.ativo})" class="btn-icon toggle" title="Ocultar/Exibir">
                            <i class="fa-solid ${iconeToggle}"></i>
                        </button>
                        <button onclick="apagarProduto('${p.id}')" class="btn-icon delete" title="Apagar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>`;
        });
    });
});

// Ações disparadas pelos botões da lista
window.abrirEdicao = (idProduto) => {
    // Procura o produto na lista global usando o ID
    const p = listaProdutosGlobal.find(item => item.id === idProduto);
    if(!p) return;

    // Preenche os campos do formulário de edição
    document.getElementById('edit-id-prod').value = p.id;
    document.getElementById('edit-nome-prod').value = p.nome;
    document.getElementById('edit-preco-prod').value = p.preco;
    document.getElementById('edit-categoria-prod').value = p.categoriaId || '';
    document.getElementById('edit-desc-prod').value = p.descricao || '';
    document.getElementById('edit-img-prod').value = p.imagemUrl || '';

    // Abre o Modal
    abrirModal('modal-editar-produto');
};

window.alternarStatus = async (id, statusAtual) => updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });
window.apagarProduto = async (id) => { if (confirm("Tem a certeza que deseja apagar permanentemente este produto?")) deleteDoc(doc(db, "produtos", id)); };

function mostrarToast(mensagem) {
    const toast = document.getElementById('toast-notificacao');
    if (!toast) return;
    toast.innerText = mensagem;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), 3000);
}