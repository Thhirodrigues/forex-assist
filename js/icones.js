// ===================================================
// FOREX ASSIST - ÍCONES (tema Aurora Glass)
//
// Substitui os emojis da interface por ícones próprios, em traço
// fino, com cor por função (menta = ganho/ok, coral = perda/erro,
// âmbar = atenção, ciano/violeta = informação e seções).
//
// COMO FUNCIONA: as telas (js/historico.js, config.js, resultados.js,
// manual.js...) continuam escrevendo o emoji no texto, como sempre.
// Depois que a tela é desenhada, este arquivo troca cada emoji
// CONHECIDO (mapa EMOJI_PARA_ICONE abaixo) por um <svg> no mesmo
// lugar. Emoji que não está no mapa fica como está. Nenhuma lógica
// das telas lê o emoji de volta (conferido em 30/09/2026), então a
// troca é só visual.
//
// Para trocar o ícone de um emoji: mude a linha dele em
// EMOJI_PARA_ICONE. Para desenhar um ícone novo: acrescente em ICONES
// (viewBox 24x24, traço; "cheio" = preenchido).
// ===================================================

(function () {

    // formas em viewBox 24x24; [d do <path>, ...] ou {cheio:true, ...}
    const ICONES = {
        ok:        ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12.5l2.7 2.7L16 9.5'],
        erro:      ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M9 9l6 6M15 9l-6 6'],
        alerta:    ['M12 4l9 16H3z', 'M12 10v4M12 17.2v.01'],
        pendente:  ['M7 4h10M7 20h10', 'M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8'],
        ponto:     { cheio: true, d: ['M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'] },
        bloqueado: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M5.6 5.6l12.8 12.8'],
        vela:      ['M12 3v4M12 17v4', 'M9 7h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z'],
        barras:    ['M5 20V11M12 20V4M19 20v-6'],
        lista:     ['M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01'],
        alta:      ['M4 16l6-6 4 4 6-7', 'M15 7h5v5'],
        baixa:     ['M4 8l6 6 4-4 6 7', 'M15 17h5v-5'],
        moeda:     ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M14.5 9.5c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2 0 3 5 1.6 5 4.2 0 1.2-1.1 2-2.5 2-1 0-1.9-.4-2.5-1.2M12 6.5v1.8M12 15.7v1.8'],
        alvo:      ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z'],
        chip:      ['M8 5h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z', 'M10 9h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z', 'M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3'],
        ajustes:   ['M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4'],
        fechar:    ['M6 6l12 12M18 6L6 18'],
        globo:     ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18'],
        estrela:   ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z'],
        robo:      ['M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M12 4v4M9 13.5h.01M15 13.5h.01M9.5 17h5'],
        relogio:   ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
        lupa:      ['M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M20 20l-4.2-4.2'],
        frasco:    ['M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3', 'M7.5 15h9'],
        salvar:    ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4M8 20v-6h8v6'],
        voltar:    ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
        cadeado:   ['M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V8a4 4 0 0 1 8 0v3'],
        baixar:    ['M12 4v12M7 11l5 5 5-5M5 20h14'],
        expandir:  ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
        recolher:  ['M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'],
        ancora:    ['M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M12 7v14M8 12h8M5 15a7 7 0 0 0 14 0'],
        bandeira:  ['M6 21V4', 'M6 4h11l-2 4 2 4H6'],
        caixa:     ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4M12 12v8'],
        parar:     ['M8 3h8l5 5v8l-5 5H8l-5-5V8z', 'M9 12h6'],
        maleta:    ['M6 8h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16'],
        cartao:    ['M6 6h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', 'M3 11h18M7 15h3'],
        banco:     ['M3 10l9-6 9 6', 'M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18'],
        dica:      ['M9 18h6M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'],
        antena:    ['M12 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', 'M12 14v7M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13'],
        mais:      ['M12 5v14M5 12h14'],
        livro:     ['M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h10'],
        trofeu:    ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8M10 17h4'],
        forca:     ['M13 3L5 13h6l-1 8 8-10h-6z'],
        folha:     ['M5 19c0-8 5-13 14-14 0 9-5 14-13 14', 'M5 19l7-7'],
        sino:      ['M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4']
    };

    // emoji -> [ícone, tom]. Tons: ciano, violeta, menta, coral, ambar, neutro.
    const EMOJI_PARA_ICONE = {
        '✅': ['ok', 'menta'],       '❌': ['erro', 'coral'],
        '⚠️': ['alerta', 'ambar'],   '⏳': ['pendente', 'ambar'],
        '🟢': ['ponto', 'menta'],    '🔵': ['ponto', 'ciano'],
        '🟡': ['ponto', 'ambar'],    '🔴': ['ponto', 'coral'],
        '⚪': ['ponto', 'neutro'],   '🚫': ['bloqueado', 'coral'],
        '🕯️': ['vela', 'violeta'],   '🔨': ['vela', 'violeta'],
        '🪢': ['vela', 'violeta'],   '🌠': ['estrela', 'ambar'],
        '📊': ['barras', 'ciano'],   '📋': ['lista', 'ciano'],
        '📈': ['alta', 'menta'],     '📉': ['baixa', 'coral'],
        '💰': ['moeda', 'ambar'],    '💵': ['moeda', 'menta'],
        '💲': ['moeda', 'menta'],    '🎯': ['alvo', 'ciano'],
        '🧠': ['chip', 'violeta'],   '⚙️': ['ajustes', 'ciano'],
        '✕':  ['fechar', 'neutro'],  '🌏': ['globo', 'menta'],
        '🌍': ['globo', 'ciano'],    '🇬🇧': ['globo', 'violeta'],
        '🇺🇸': ['globo', 'ciano'],   '🤖': ['robo', 'violeta'],
        '🕐': ['relogio', 'ciano'],  '🔬': ['lupa', 'violeta'],
        '🧪': ['frasco', 'violeta'], '💾': ['salvar', 'menta'],
        '↩️': ['voltar', 'neutro'],  '🔍': ['lupa', 'ciano'],
        '🔒': ['cadeado', 'ambar'],  '⬇️': ['baixar', 'ciano'],
        '⤢':  ['expandir', 'ciano'], '⤡':  ['recolher', 'ciano'],
        '🏠': ['ancora', 'violeta'], '🏁': ['bandeira', 'menta'],
        '📦': ['caixa', 'ciano'],    '🛑': ['parar', 'coral'],
        '💼': ['maleta', 'violeta'], '💳': ['cartao', 'ciano'],
        '🏦': ['banco', 'ciano'],    '☝️': ['dica', 'ambar'],
        '📡': ['antena', 'ciano'],   '⭐': ['estrela', 'ambar'],
        '➕': ['mais', 'ciano'],     '📖': ['livro', 'ciano'],
        '🏆': ['trofeu', 'ambar'],   '💪': ['forca', 'menta'],
        '🆗': ['ok', 'ciano'],       '🧘': ['folha', 'menta'],
        '🔔': ['sino', 'ambar'],     '🌐': ['globo', 'ciano']
    };

    // sequências de emoji reconhecidas: bandeiras (2 letras regionais) e
    // pictogramas com seletor de variação; mais os símbolos avulsos ✕ ⤢ ⤡
    const REGEX_EMOJI = /[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}️?|[✕⤡⤢]/gu;

    function normalizar(seq) {
        // "⚠" sem seletor de variação vira "⚠️" para achar no mapa
        return EMOJI_PARA_ICONE[seq] ? seq : (seq.endsWith("️") ? seq.slice(0, -1) : seq + "️");
    }

    function svgDoIcone(nome, tom) {

        const def = ICONES[nome];
        if (!def) return null;

        const cheio = !Array.isArray(def) && def.cheio;
        const partes = Array.isArray(def) ? def : def.d;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");

        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("class", "ic ic--" + tom + (cheio ? " ic--cheio" : ""));

        partes.forEach(d => {
            const p = document.createElementNS(ns, "path");
            p.setAttribute("d", d);
            svg.appendChild(p);
        });

        return svg;

    }

    // ícone é o primeiro conteúdo de um título? então vira "chip" grande
    function ehTitulo(el) {
        return el && (
            (el.classList && el.classList.contains("card-title")) ||
            el.tagName === "H2" || el.tagName === "H3"
        );
    }

    function trocarNoTexto(no) {

        const texto = no.nodeValue;

        if (!texto || !REGEX_EMOJI.test(texto)) { REGEX_EMOJI.lastIndex = 0; return; }
        REGEX_EMOJI.lastIndex = 0;

        const pai = no.parentNode;
        if (!pai) return;

        // <option> não aceita SVG: tira o emoji e fica só o texto
        if (pai.nodeName === "OPTION") {
            no.nodeValue = texto.replace(REGEX_EMOJI, m => EMOJI_PARA_ICONE[normalizar(m)] ? "" : m).replace(/^\s+/, "");
            REGEX_EMOJI.lastIndex = 0;
            return;
        }

        const frag = document.createDocumentFragment();
        let ultimo = 0;
        let houveTroca = false;

        // se o texto começa (só com espaços antes) num título, o ícone
        // vira o primeiro filho e ganha o formato de "chip"
        const primeiroDoTitulo = ehTitulo(pai) && !no.previousSibling;

        texto.replace(REGEX_EMOJI, (seq, pos) => {

            const alvo = EMOJI_PARA_ICONE[normalizar(seq)];
            if (!alvo) return seq;

            const svg = svgDoIcone(alvo[0], alvo[1]);
            if (!svg) return seq;

            let antes = texto.slice(ultimo, pos);

            if (primeiroDoTitulo && !houveTroca && antes.trim() === "") {
                antes = "";
                svg.classList.add("ic--chip");
            }

            if (antes) frag.appendChild(document.createTextNode(antes));
            frag.appendChild(svg);

            ultimo = pos + seq.length;
            houveTroca = true;

            return seq;

        });

        if (!houveTroca) return;

        if (ultimo < texto.length) frag.appendChild(document.createTextNode(texto.slice(ultimo)));

        pai.replaceChild(frag, no);

    }

    const IGNORAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SVG: 1, svg: 1, NOSCRIPT: 1 };

    function substituirEmojis(raiz) {

        if (!raiz) return;

        const nos = [];
        const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
            acceptNode(no) {
                const p = no.parentNode;
                if (!p || IGNORAR[p.nodeName]) return NodeFilter.FILTER_REJECT;
                return no.nodeValue && /[^\x00- ]/.test(no.nodeValue)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });

        while (walker.nextNode()) nos.push(walker.currentNode);

        nos.forEach(trocarNoTexto);

    }

    // Palavras de direção/estado no início de uma célula de tabela ganham cor
    // (ALTA/COMPRA = menta, BAIXA/VENDA = coral, atenção = âmbar). Só
    // pinta; o texto não muda. Vale para o Manual e para a tabela do
    // Histórico.
    const PALAVRAS_COR = {
        ALTA: 'menta', COMPRA: 'menta',
        BAIXA: 'coral', VENDA: 'coral',
        COMPRESSÃO: 'ambar', CONFLITO: 'ambar', SOBRECOMPRADO: 'ambar', SOBREVENDIDO: 'ambar'
    };

    const REGEX_PALAVRA = /^(\s*)(ALTA|COMPRA|BAIXA|VENDA|COMPRESSÃO|CONFLITO|SOBRECOMPRADO|SOBREVENDIDO)(?![A-Za-zÀ-ÿ])/;

    function colorirPalavras(raiz) {

        if (!raiz) return;

        raiz.querySelectorAll(".aba-manual td, #historicoLista td").forEach(td => {

            const no = td.firstChild;

            if (!no || no.nodeType !== 3) return;

            const m = REGEX_PALAVRA.exec(no.nodeValue);

            if (!m) return;

            const span = document.createElement("span");
            span.className = "pal pal--" + PALAVRAS_COR[m[2]];
            span.textContent = m[2];

            const resto = document.createTextNode(no.nodeValue.slice(m[0].length));

            td.replaceChild(resto, no);
            td.insertBefore(span, resto);
            if (m[1]) td.insertBefore(document.createTextNode(m[1]), span);

        });

    }

    window.substituirEmojis = substituirEmojis;

    // observa o app: qualquer tela (ou trecho carregado depois, como o
    // Histórico) é tratada no quadro seguinte, sem travar a renderização
    let agendado = false;

    function agendar() {

        if (agendado) return;
        agendado = true;

        requestAnimationFrame(() => {
            agendado = false;
            const app = document.getElementById("app");
            substituirEmojis(app);
            colorirPalavras(app);
        });

    }

    function iniciar() {

        const alvo = document.getElementById("app");
        if (!alvo) return;

        new MutationObserver(agendar).observe(alvo, {
            childList: true,
            subtree: true,
            characterData: true
        });

        agendar();

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

})();
