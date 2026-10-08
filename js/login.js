// ===================================================
// FOREX ASSIST - LOGIN (Firebase Authentication, e-mail e senha)
//
// Por quê: o banco oficial é legível por QUALQUER pessoa com a configuração pública do app (achado de 08/10/2026, caderno
// 6.29). A correção é: login + regras do Firestore que só aceitam o UID do dono (firestore.rules, workflow regras-oficial).
// Os scripts do GitHub Actions usam credencial de administrador e NÃO são afetados pelas regras.
//
// ETAPAS (nada trava antes da etapa 3):
//   1) este arquivo + cartão "Segurança da conta" na Config: dá para entrar e ver o UID. EXIGIR_LOGIN = false (o app abre sem login).
//   2) o usuário cria o usuário no Console do Firebase e entra uma vez aqui.
//   3) publica as regras (workflow regras-oficial, modo "proteger", com o UID) e vira EXIGIR_LOGIN = true no mesmo commit.
// ===================================================
(function (raiz) {

const EXIGIR_LOGIN = false;

const MENSAGENS = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão. Verifique a internet e tente de novo.",
    "auth/user-disabled": "Esta conta está desativada.",
    "auth/operation-not-allowed": "Login por e-mail e senha ainda não foi ativado no Firebase (Authentication > Sign-in method)."
};

const mensagemErro = (erro) => MENSAGENS[erro && erro.code] || `Não foi possível entrar (${(erro && (erro.code || erro.message)) || "erro desconhecido"}).`;

function validarEntrada(email, senha) {
    const e = String(email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return { ok: false, erro: "Digite um e-mail válido." };
    if (String(senha || "").length < 6) return { ok: false, erro: "A senha tem pelo menos 6 caracteres." };
    return { ok: true, email: e };
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const api = { EXIGIR_LOGIN, mensagemErro, validarEntrada, esc };

if (typeof window !== "undefined" && typeof document !== "undefined") {

    let usuario = null, pronto = false;
    const auth = () => (window.auth && typeof window.auth.signInWithEmailAndPassword === "function" ? window.auth : null);

    api.recarregar = () => window.location.reload();

    // ---- tela de login (só quando EXIGIR_LOGIN e sem usuário) ----
    const estiloCampo = "width:100%; box-sizing:border-box; padding:12px; margin-top:8px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.06); color:#f9fafd; font-size:16px;";

    function mostrarTela() {
        if (document.getElementById("loginTela")) return;
        const div = document.createElement("div");
        div.id = "loginTela";
        div.style.cssText = "position:fixed; inset:0; z-index:99999; background:#0b1020; display:flex; align-items:center; justify-content:center; padding:24px; font-family:sans-serif;";
        div.innerHTML = `
          <form id="loginForm" style="width:100%; max-width:360px; color:#f9fafd;">
            <div style="font-size:22px; font-weight:bold; margin-bottom:4px;">Forex Assist</div>
            <div style="font-size:13px; color:#bcc4d5; margin-bottom:16px;">Acesso restrito ao dono da conta.</div>
            <input id="loginEmail" type="email" autocomplete="username" placeholder="E-mail" style="${estiloCampo}">
            <input id="loginSenha" type="password" autocomplete="current-password" placeholder="Senha" style="${estiloCampo}">
            <button id="loginBotao" type="submit" style="width:100%; margin-top:14px; padding:12px; border-radius:10px; border:0; background:#3ae0e8; color:#06202a; font-weight:bold; font-size:16px;">Entrar</button>
            <div id="loginErro" style="min-height:20px; margin-top:10px; font-size:13px; color:#f87171;"></div>
          </form>`;
        document.body.appendChild(div);
        document.getElementById("loginForm").addEventListener("submit", (ev) => { ev.preventDefault(); entrar(document.getElementById("loginEmail").value, document.getElementById("loginSenha").value, "loginErro", "loginBotao", true); });
    }

    function esconderTela() { const el = document.getElementById("loginTela"); if (el) el.remove(); }

    async function entrar(email, senha, idErro, idBotao, recarregar) {
        const v = validarEntrada(email, senha);
        const erroEl = document.getElementById(idErro), botao = document.getElementById(idBotao);
        if (!v.ok) { if (erroEl) erroEl.textContent = v.erro; return; }
        if (!auth()) { if (erroEl) erroEl.textContent = "Firebase Authentication não carregou. Recarregue a página."; return; }
        if (botao) { botao.disabled = true; botao.textContent = "Entrando..."; }
        if (erroEl) erroEl.textContent = "";
        try {
            await auth().signInWithEmailAndPassword(v.email, senha);
            if (recarregar) api.recarregar();   // recarrega: os listeners do banco recomeçam já autenticados
        } catch (erro) {
            if (erroEl) erroEl.textContent = mensagemErro(erro);
            if (botao) { botao.disabled = false; botao.textContent = "Entrar"; }
        }
    }

    // ---- cartão "Segurança da conta" (Config) ----
    api.htmlSeguranca = () => {
        let corpo;
        if (!pronto) corpo = `<div style="color:#bcc4d5;">Verificando login...</div>`;
        else if (usuario) {
            corpo = `
              <div>Conectado como <b>${esc(usuario.email)}</b></div>
              <div style="margin-top:6px; font-size:12px; color:#bcc4d5; word-break:break-all;">UID: <span id="segUid">${esc(usuario.uid)}</span></div>
              <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" data-seg-acao="copiar-uid" style="padding:8px 12px; border-radius:8px;">Copiar UID</button>
                <button type="button" data-seg-acao="sair" style="padding:8px 12px; border-radius:8px;">Sair</button>
              </div>`;
        } else {
            corpo = `
              <input id="segEmail" type="email" autocomplete="username" placeholder="E-mail" style="${estiloCampo}">
              <input id="segSenha" type="password" autocomplete="current-password" placeholder="Senha" style="${estiloCampo}">
              <button type="button" id="segEntrar" data-seg-acao="entrar" style="margin-top:10px; padding:10px 14px; border-radius:8px;">Entrar</button>
              <div id="segErro" style="min-height:18px; margin-top:6px; font-size:12px; color:#f87171;"></div>`;
        }
        return `
        <div class="card" id="cardSeguranca">
          <div class="card-title">🔐 Segurança da conta</div>
          <div class="list-item">
            ${corpo}
            <div style="font-size:11px; color:#bcc4d5; margin-top:8px;">
              ${EXIGIR_LOGIN
                ? "O banco só aceita o dono da conta logado."
                : "Hoje o banco ainda está ABERTO para leitura por qualquer pessoa. Depois que você entrar aqui uma vez, o UID é usado para trancar o banco (só você lê e grava). Os robôs do GitHub não são afetados."}
            </div>
          </div>
        </div>`;
    };

    function atualizarCartao() {
        const el = document.getElementById("cardSeguranca");
        if (!el) return;
        const novo = document.createElement("div");
        novo.innerHTML = api.htmlSeguranca();
        el.replaceWith(novo.firstElementChild);
    }

    document.addEventListener("click", (ev) => {
        const alvo = ev.target && ev.target.closest && ev.target.closest("[data-seg-acao]");
        if (!alvo) return;
        const acao = alvo.dataset.segAcao;
        if (acao === "entrar") entrar(document.getElementById("segEmail").value, document.getElementById("segSenha").value, "segErro", "segEntrar", false);
        if (acao === "sair" && auth()) auth().signOut().then(() => { if (EXIGIR_LOGIN) api.recarregar(); });
        if (acao === "copiar-uid" && usuario && navigator.clipboard) navigator.clipboard.writeText(usuario.uid).then(() => { alvo.textContent = "UID copiado"; });
    });

    const iniciar = () => {
        const a = auth();
        if (!a) { pronto = true; if (EXIGIR_LOGIN) mostrarTela(); return; }
        a.onAuthStateChanged((u) => {
            usuario = u || null; pronto = true;
            if (EXIGIR_LOGIN) { if (usuario) esconderTela(); else mostrarTela(); }
            atualizarCartao();
        });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
}

if (typeof module !== "undefined" && module.exports) module.exports = api;
else raiz.LoginApp = api;

})(typeof window !== "undefined" ? window : globalThis);
