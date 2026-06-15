// Importando as funções essenciais do Firebase pela internet (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUBSTITUA ESTE BLOCO PELAS SUAS CHAVES DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBq1LhOcYmnNJgidQuUO4NuCLg8gc2Qg6c",
  authDomain: "sistema-churrascado.firebaseapp.com",
  projectId: "sistema-churrascado",
  storageBucket: "sistema-churrascado.firebasestorage.app",
  messagingSenderId: "548057338801",
  appId: "1:548057338801:web:f190cf317ac5a512f1a390",
  measurementId: "G-8GD294K6ZB"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);

// Inicializando o Banco de Dados (Firestore) e exportando para usarmos nos outros arquivos
export const db = getFirestore(app);