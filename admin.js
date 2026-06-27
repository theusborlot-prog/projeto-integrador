import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let mapaCategorias = {};
let listaProdutosGlobal = [];

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

window.apagarCategoria = (id) => {
    confirmarAcaoInterface("Deseja remover esta categoria? Itens vinculados ficarão temporariamente órfãos.", async () => {
        try {
            await deleteDoc(doc(db, "categorias", id));
            mostrarToast("Categoria removida com sucesso.");
        } catch (error) {
            mostrarToast("Erro ao excluir categoria.");
        }
    });
};

onSnapshot(collection(db, "categorias"), (snap) => {
    const selectNovo = document.getElementById('categoria-prod');
    const selectEdit = document.getElementById('edit-categoria-prod');
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
        const optionHTML = `<option value="${c.id}">${c.nome}</option>`;
        selectNovo.innerHTML += optionHTML;
        selectEdit.innerHTML += optionHTML;

        listaUI.innerHTML += `
            <div class="tag-categoria-painel">
                <span>${c.nome}</span>
                <button onclick="apagarCategoria('${c.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
    });

    // Força a atualização dos nomes das categorias na listagem de itens
    renderizarProdutosAdmin();
});

// ================== GERENCIADOR DE PRODUTOS ==================
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

// ================== RENDERIZAÇÃO FILTRADA (MECANISMO DE BUSCA LOCAL) ==================
function renderizarProdutosAdmin() {
    const container = document.getElementById('lista-produtos-admin');
    if (!container) return;
    
    container.innerHTML = '';
    
    const termoBusca = document.getElementById('busca-produto-admin')?.value.toLowerCase().trim() || '';
    
    // Algoritmo de filtragem local por correspondência parcial
    const produtosFiltrados = listaProdutosGlobal.filter(p => 
        p.nome.toLowerCase().includes(termoBusca) || 
        (p.descricao && p.descricao.toLowerCase().includes(termoBusca))
    );

    if (produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="dashboard-empty-state" style="text-align: center; padding: 40px 0; color: #94A3B8;">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <p>${listaProdutosGlobal.length === 0 ? 'O seu cardápio está vazio.' : 'Nenhum item corresponde à sua pesquisa.'}</p>
            </div>`;
        return;
    }

    const grupos = {};

    produtosFiltrados.forEach(p => {
        const nomeDaCategoria = mapaCategorias[p.categoriaId] || "Sem Categoria";
        if (!grupos[nomeDaCategoria]) grupos[nomeDaCategoria] = [];
        grupos[nomeDaCategoria].push(p);
    });

    Object.keys(grupos).sort().forEach(nomeCat => {
        const itens = grupos[nomeCat];
        itens.sort((a, b) => a.nome.localeCompare(b.nome));

        container.innerHTML += `<div class="categoria-separador-admin">${nomeCat}</div>`;

        itens.forEach(p => {
            const imgDisplay = p.imagemUrl || "https://images.unsplash.com/photo-1544025162-831550f83fc4?w=150";
            const itemClasseStatus = p.ativo ? "" : "item-pausado-layout";
            const badgeHTML = p.ativo 
                ? `<span class="badge-status badge-ativo" style="background:#ECFDF5; color:#059669; padding:2px 8px; font-size:0.75rem; font-weight:600; border-radius:4px;">Disponível</span>` 
                : `<span class="badge-status badge-pausado" style="background:#FEF2F2; color:#EF4444; padding:2px 8px; font-size:0.75rem; font-weight:600; border-radius:4px;">Pausado</span>`;
                
            const iconeToggle = p.ativo ? "fa-eye-slash" : "fa-eye";

            container.innerHTML += `
                <div class="item-linha ${itemClasseStatus}">
                    <img src="${imgDisplay}" class="item-img-min" alt="">
                    <div class="item-dados">
                        <div class="item-dados-top" style="display:flex; align-items:center; gap:8px;">
                            <h4>${p.nome}</h4>
                            ${badgeHTML}
                        </div>
                        <p class="desc-limiter-admin">${p.descricao || 'Sem descrição cadastrada.'}</p>
                        <strong class="preco-admin">R$ ${p.preco.toFixed(2)}</strong>
                    </div>
                    <div class="acoes-linha" style="display:flex; gap:6px;">
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
}

// Ouvinte em Tempo Real do Firestore (Monitora adições, remoções e status)
onSnapshot(collection(db, "produtos"), (snap) => {
    const kpiAtivos = document.getElementById('kpi-ativos');
    const kpiPausados = document.getElementById('kpi-pausados');
    
    listaProdutosGlobal = [];
    let contagemAtivos = 0;
    let contagemPausados = 0;

    snap.forEach(doc => {
        const p = { id: doc.id, ...doc.data() };
        listaProdutosGlobal.push(p);
        if (p.ativo) contagemAtivos++; else contagemPausados++;
    });

    if (kpiAtivos) kpiAtivos.innerText = contagemAtivos;
    if (kpiPausados) kpiPausados.innerText = contagemPausados;

    renderizarProdutosAdmin();
});

// Vinculação do evento de digitação do input para filtragem reativa
document.getElementById('busca-produto-admin')?.addEventListener('input', renderizarProdutosAdmin);

window.abrirEdicao = (idProduto) => {
    const p = listaProdutosGlobal.find(item => item.id === idProduto);
    if(!p) return;

    document.getElementById('edit-id-prod').value = p.id;
    document.getElementById('edit-nome-prod').value = p.nome;
    document.getElementById('edit-preco-prod').value = p.preco;
    document.getElementById('edit-categoria-prod').value = p.categoriaId || '';
    document.getElementById('edit-desc-prod').value = p.descricao || '';
    document.getElementById('edit-img-prod').value = p.imagemUrl || '';

    abrirModal('modal-editar-produto');
};

window.alternarStatus = async (id, statusAtual) => updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });

window.apagarProduto = (id) => { 
    confirmarAcaoInterface("Tem a certeza que deseja apagar permanentemente este produto?", async () => {
        try {
            await deleteDoc(doc(db, "produtos", id));
            mostrarToast("Produto excluído do sistema.");
        } catch (error) {
            mostrarToast("Erro ao excluir produto.");
        }
    }); 
};

function mostrarToast(mensagem) {
    const toast = document.getElementById('toast-notificacao');
    if (!toast) return;
    toast.innerText = mensagem;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), 3000);
}

window.confirmarAcaoInterface = (mensagem, callbackConfirmacao) => {
    let modalConfirma = document.getElementById('modal-confirmacao-ui');
    
    if (!modalConfirma) {
        modalConfirma = document.createElement('div');
        modalConfirma.id = 'modal-confirmacao-ui';
        modalConfirma.className = 'modal-overlay';
        document.body.appendChild(modalConfirma);
    }

    modalConfirma.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center; padding: 30px 20px; border-radius:16px;">
            <div style="font-size: 3rem; color: #EA580C; margin-bottom: 15px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style="margin-bottom: 10px; color: #1E293B; font-weight:700;">Confirmação</h3>
            <p style="color: #64748B; margin-bottom: 25px; line-height: 1.5; font-size:0.95rem;">${mensagem}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="document.getElementById('modal-confirmacao-ui').classList.remove('ativo')" class="btn-top-secundario" style="flex: 1; padding:10px;">Cancelar</button>
                <button id="btn-confirmar-ui" class="btn-top-primario" style="flex: 1; background-color: #EF4444; padding:10px;">Confirmar</button>
            </div>
        </div>
    `;

    document.getElementById('btn-confirmar-ui').onclick = () => {
        callbackConfirmacao();
        modalConfirma.classList.remove('ativo');
    };

    setTimeout(() => modalConfirma.classList.add('ativo'), 10);
};