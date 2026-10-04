// Projeto Firebase SEPARADO do Laboratório (forex-assist-lab). A config web do Firebase é pública
// por desenho (não é segredo); quem protege os dados são as regras do Firestore (lab/firestore.rules:
// só `placar/atual` é legível). Falhar aqui nunca pode derrubar o app: a aba só mostra "indisponível".
(function () {
    try {
        const labConfig = {
            apiKey: "AIzaSyCShYzOaXiQTLfmArT5h8t7IeUTGEacUFc",
            authDomain: "forex-assist-lab.firebaseapp.com",
            projectId: "forex-assist-lab",
            storageBucket: "forex-assist-lab.firebasestorage.app",
            messagingSenderId: "888507165197",
            appId: "1:888507165197:web:7c17e8dc1132771aa60344"
        };
        const appLab = firebase.initializeApp(labConfig, "lab");
        window.dbLab = appLab.firestore();
    } catch (e) {
        window.dbLab = null;
        window.dbLabErro = e && e.message;
    }
})();
