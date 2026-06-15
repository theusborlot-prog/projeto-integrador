import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Adicionar novo produto
document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputNome = document.getElementById('nome-prod');
    const inputPreco = document.getElementById('preco-prod');
    const btnSubmit = e.target.querySelector('button');

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Salvando...";

    try {
        await addDoc(collection(db, "produtos"), { 
            nome: inputNome.value.trim(), 
            preco: parseFloat(inputPreco.value), 
            ativo: true 
        });
        
        mostrarToast("Produto salvo com sucesso!");
        inputNome.value = '';
        inputPreco.value = '';
    } catch (error) {
        console.error("Erro:", error);
        mostrarToast("Não foi possível salvar o produto.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar`;
    }
});

// Listar produtos em tempo real
onSnapshot(collection(db, "produtos"), (snap) => {
    const container = document.getElementById('lista-produtos-admin');
    container.innerHTML = '';

    if (snap.empty) {
        container.innerHTML = `<p style="color: var(--cor-secundaria);">Nenhum produto cadastrado.</p>`;
        return;
    }

    // Ordena alfabeticamente
    const produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    produtos.forEach(p => {
        const opacidade = p.ativo ? "1" : "0.5";
        const textoBotaoStatus = p.ativo ? "Pausar Vendas" : "Retomar Vendas";
        const corBotaoStatus = p.ativo ? "var(--cor-secundaria)" : "var(--cor-sucesso)";

        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--cor-surface); padding:16px 20px; margin-bottom:12px; border-radius:12px; box-shadow: var(--sombra-sm); opacity: ${opacidade}; transition: 0.3s;">
                <div>
                    <h4 style="margin: 0; font-size: 1.1rem; ${!p.ativo ? 'text-decoration: line-through;' : ''}">${p.nome}</h4>
                    <span style="color: var(--cor-primaria); font-weight: bold; font-size: 1.1rem;">R$ ${p.preco.toFixed(2)}</span>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="alternarStatus('${p.id}', ${p.ativo})" style="background:${corBotaoStatus}; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600;">
                        ${textoBotaoStatus}
                    </button>
                    <button onclick="apagarProduto('${p.id}')" style="background:transparent; color:var(--cor-primaria); border:2px solid var(--cor-primaria); padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
    });
});

// Funções Globais (Expostas para o HTML)
window.alternarStatus = async (id, statusAtual) => {
    try {
        await updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });
        mostrarToast(statusAtual ? "Produto pausado temporariamente." : "Produto ativado para vendas!");
    } catch (error) {
        mostrarToast("Erro ao atualizar status.");
    }
};

window.apagarProduto = async (id) => {
    if (confirm("ATENÇÃO: Deseja apagar este produto permanentemente do cardápio?")) {
        try {
            await deleteDoc(doc(db, "produtos", id));
            mostrarToast("Produto excluído.");
        } catch (error) {
            mostrarToast("Erro ao excluir.");
        }
    }
};

function mostrarToast(mensagem) {
    const toast = document.getElementById('toast-notificacao');
    if (!toast) return;
    toast.innerText = mensagem;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), 3500);
}