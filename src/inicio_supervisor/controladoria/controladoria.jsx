import { useEffect, useMemo, useState } from "react";
import "./controladoria.css";

const AUTO_REFRESH_MS = 15000;
const MAX_INPUT_LENGTH = 100;

export default function Controladoria({ currentUser }) {
    const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
    const tipoHeader = String(currentUser?.TIPO || currentUser?.tipo || "").trim().toUpperCase();
    const podeAcesso = ['CONTROLADORIA', 'GERENTE', 'ADMIN'].includes(tipoHeader);
    const ehGerente = ['GERENTE', 'ADMIN'].includes(tipoHeader);
    const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";

    const formatKg = (value) => {
        const digitos = String(value || "").replace(/\D/g, "").slice(0, 7);
        if (!digitos) return "";
        return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    const parseKg = (value = "") => Number(String(value).replace(/\D/g, "")) || 0;
    const calcularPesoLiquido = (pesoBruto, tara) => {
        const liquido = Math.max(0, parseKg(pesoBruto) - parseKg(tara));
        return formatKg(String(liquido));
    };
    const withKg = (value) => (hasValue(value) ? `${String(value).trim()} KG` : "-");

    const formatTextoMaiusculo = (value, limite = 80) => String(value || "").toUpperCase().slice(0, limite);
    const formatNome = (value) => String(value || "").replace(/[^a-zA-ZÀ-ÿ ]/g, "").toUpperCase().slice(0, 80);
    const formatPlaca = (value) => String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
    const formatFotoSrc = (value) => {
        const texto = String(value || "").trim();
        if (!texto) return "";
        if (texto.startsWith("data:image") || texto.startsWith("http://") || texto.startsWith("https://") || texto.startsWith("blob:")) {
            return texto;
        }
        return `data:image/jpeg;base64,${texto}`;
    };

    const [registros, setRegistros] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [busca, setBusca] = useState("");
    const [statusFiltro, setStatusFiltro] = useState("TODOS");
    const [registroAbertoId, setRegistroAbertoId] = useState(null);
    const [idsSelecionados, setIdsSelecionados] = useState([]);
    const [recusandoCarga, setRecusandoCarga] = useState(false);
    const [obsRecusa, setObsRecusa] = useState("");
    const [carregandoEdicao, setCarregandoEdicao] = useState(false);
    const [carregandoFinalizacao, setCarregandoFinalizacao] = useState(false);
    const [carregandoRecusa, setCarregandoRecusa] = useState(false);
    const [edicao, setEdicao] = useState({
        unidade: "",
        zona: "",
        fazenda: "",
        empresa: "",
        motorista: "",
        placa: "",
        pesoEstimado: "",
        pesoLiquido: "",
        pesoBruto: "",
        tara: "",
        tipoPesagem: "BRUTO-TARA",
        refugo: "",
        temDivergencia: false,
        motivoDivergencia: "",
        status: "CGA",
        operacao: "",
        estoqueInicial: "",
        colheitaDia: "",
        saldoDisponivel: "",
        prevColheita: "",
        observacao: "",
        fotos: []
    });

    const carregarProcessos = async () => {
        try {
            setCarregando(true);
            const response = await fetch(`${API_BASE_URL}/controladoria/processos`, {
                headers: { "x-user-type": tipoHeader }
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || "Falha ao carregar processos da controladoria.");
            }

            setRegistros(Array.isArray(data.processos) ? data.processos : []);
        } catch (error) {
            alert(`Erro ao carregar controladoria: ${error.message}`);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarProcessos();

        const intervalId = setInterval(() => {
            carregarProcessos();
        }, AUTO_REFRESH_MS);

        return () => clearInterval(intervalId);
    }, [API_BASE_URL, tipoHeader]);

    useEffect(() => {
        setIdsSelecionados((anteriores) =>
            anteriores.filter((id) => registros.some((registro) => String(registro.id) === id))
        );
    }, [registros]);

    const registroAberto = useMemo(
        () => registros.find((item) => item.id === registroAbertoId) || null,
        [registroAbertoId, registros]
    );

    const podeEditar = useMemo(
        () => {
            // Registros finalizados não podem ser editados (FNL ou FNL/DVG)
            if (registroAberto?.status === 'FNL' || registroAberto?.status === 'FNL/DVG') {
                return false;
            }
            // Apenas CONTROLADORIA, GERENTE e ADMIN podem editar
            if (!['CONTROLADORIA', 'GERENTE', 'ADMIN'].includes(tipoHeader)) {
                return false;
            }
            // GERENTE só pode editar apontamentos com status RCD
            if (tipoHeader === 'GERENTE') {
                return registroAberto?.status === 'RCD';
            }
            // CONTROLADORIA não pode editar se status é RCD
            if (tipoHeader === 'CONTROLADORIA' && registroAberto?.status === 'RCD') {
                return false;
            }
            // CONTROLADORIA e ADMIN podem editar normalmente
            return true;
        },
        [registroAberto, tipoHeader]
    );

    const camposControladoria = ['pesoBruto', 'tara', 'refugo', 'temDivergencia', 'motivoDivergencia', 'observacao'];

    const podeEditarCampo = (nomecampo) => {
        // Se não pode editar nada, retorna false
        if (!podeEditar) return false;
        
        // Apenas ADMIN pode editar status
        if (nomecampo === 'status') {
            return tipoHeader === 'ADMIN';
        }
        
        // Campos administrativos da CONTROLADORIA
        const camposControladoriaAdm = ['pesoBruto', 'tara', 'refugo', 'temDivergencia', 'motivoDivergencia', 'observacao'];
        
        // CONTROLADORIA pode editar seus campos administrativos
        if (tipoHeader === 'CONTROLADORIA') {
            return camposControladoria.includes(nomecampo);
        }
        
        // GERENTE NÃO pode editar campos administrativos, mas pode editar fotos e outros
        if (tipoHeader === 'GERENTE') {
            return !camposControladoriaAdm.includes(nomecampo);
        }
        
        // ADMIN pode editar tudo (menos status que já foi tratado)
        return tipoHeader === 'ADMIN';
    };

    const pesoLiquidoCalculado = useMemo(
        () => calcularPesoLiquido(edicao.pesoBruto, edicao.tara),
        [edicao.pesoBruto, edicao.tara]
    );

    const kpis = useMemo(() => {
        const total = registros.length;
        const pendentes = registros.filter((item) => ["DIS", "AGE", "CGA"].includes(item.status)).length;
        const divergencia = registros.filter((item) => item.status === "DVG").length;
        const recusadas = registros.filter((item) => item.status === "RCD").length;
        const finalizados = registros.filter((item) => item.status === "FNL" || item.status === "FNL/DVG").length;
        return { total, pendentes, divergencia, recusadas, finalizados };
    }, [registros]);

    const registrosFiltrados = useMemo(() => {
        const termo = busca.trim().toUpperCase();

        const filtrados = registros.filter((item) => {
            const statusOk = statusFiltro === "TODOS" ? true : item.status === statusFiltro;
            if (!statusOk) return false;

            if (!termo) return true;
            const alvo = [
                item.id,
                item.unidade,
                item.zona,
                item.fazenda,
                item.empresa,
                item.motorista,
                item.placa
            ].join(" ").toUpperCase();

            return alvo.includes(termo);
        });

        return [...filtrados].sort((a, b) => {
            const aFinalizado = (a.status === "FNL" || a.status === "FNL/DVG") ? 1 : 0;
            const bFinalizado = (b.status === "FNL" || b.status === "FNL/DVG") ? 1 : 0;
            return aFinalizado - bFinalizado;
        });
    }, [busca, registros, statusFiltro]);

    const idsFiltrados = useMemo(
        () => registrosFiltrados.map((item) => String(item.id)),
        [registrosFiltrados]
    );

    const todosFiltradosSelecionados = idsFiltrados.length > 0
        && idsFiltrados.every((id) => idsSelecionados.includes(id));

    const fotosRegistroAberto = useMemo(() => {
        const lista = Array.isArray(registroAberto?.fotos) ? registroAberto.fotos : [];
        return lista.map((item) => formatFotoSrc(item)).filter(Boolean);
    }, [registroAberto]);

    const notificacoes = useMemo(() => {
        const lista = [];
        if (kpis.pendentes > 0) lista.push(`${kpis.pendentes} processo(s) aguardando validação final`);
        if (kpis.divergencia > 0) lista.push(`${kpis.divergencia} processo(s) com divergência`);
        if (kpis.recusadas > 0) lista.push(`${kpis.recusadas} processo(s) recusado(s) aguardando correção do GERENTE`);
        if (kpis.finalizados > 0) lista.push(`${kpis.finalizados} processo(s) finalizados hoje`);
        return lista;
    }, [kpis]);

    const abrirRegistro = (registro) => {
        setRegistroAbertoId(registro.id);
        setRecusandoCarga(false);
        setObsRecusa("");
        setEdicao({
            unidade: registro.unidade || "",
            zona: registro.zona || "",
            fazenda: registro.fazenda || "",
            empresa: registro.empresa || "",
            motorista: registro.motorista || "",
            placa: registro.placa || "",
            pesoEstimado: registro.pesoEstimado || "",
            pesoLiquido: registro.pesoLiquido || "",
            pesoBruto: registro.pesoBruto || "",
            tara: registro.tara || "",
            tipoPesagem: "BRUTO-TARA",
            refugo: registro.refugo || "",
            temDivergencia: false,
            motivoDivergencia: registro.motivoDivergencia || "",
            status: registro.status || "CGA",
            operacao: registro.operacao || "",
            estoqueInicial: registro.estoqueInicial || "",
            colheitaDia: registro.colheitaDia || "",
            saldoDisponivel: registro.saldoDisponivel || "",
            prevColheita: registro.prevColheita || "",
            observacao: registro.observacao || "",
            fotos: Array.isArray(registro.fotos) ? registro.fotos : []
        });
    };

    const atualizarRegistroAberto = async (action, statusOverride = null) => {
        if (!registroAbertoId) return;
        
        // Define qual estado de carregamento usar baseado na ação
        const setLoadingByAction = (valor) => {
            if (action === "editar") setCarregandoEdicao(valor);
            else if (action === "finalizar") setCarregandoFinalizacao(valor);
        };
        
        try {
            setLoadingByAction(true);
            // Se statusOverride for fornecido (ex: FNL/DVG), usa ele. Senão usa edicao.status
            const statusFinal = statusOverride !== null ? statusOverride : edicao.status;
            
            const response = await fetch(`${API_BASE_URL}/controladoria/processos/${encodeURIComponent(registroAbertoId)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-type": tipoHeader
                },
                body: JSON.stringify({
                    action,
                    unidade: edicao.unidade,
                    zona: edicao.zona,
                    fazenda: edicao.fazenda,
                    empresa: edicao.empresa,
                    motorista: edicao.motorista,
                    placa: edicao.placa,
                    pesoEstimado: edicao.pesoEstimado,
                    pesoLiquido: pesoLiquidoCalculado,
                    pesoBruto: edicao.pesoBruto,
                    tara: edicao.tara,
                    tipoPesagem: edicao.tipoPesagem,
                    refugo: edicao.refugo,
                    motivoDivergencia: edicao.temDivergencia ? edicao.motivoDivergencia : "SEM COMENTARIOS",
                    status: statusFinal,
                    estoqueInicial: edicao.estoqueInicial,
                    colheitaDia: edicao.colheitaDia,
                    saldoDisponivel: edicao.saldoDisponivel,
                    prevColheita: edicao.prevColheita,
                    fotos: edicao.fotos || []
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || data.detail || "Falha ao atualizar processo da controladoria.");
            }

            await carregarProcessos();
            if (action === "finalizar") {
                setRegistroAbertoId(null);
            }
            alert(data.message || "Processo atualizado com sucesso!");
            return true;
        } catch (error) {
            alert(`Erro ao atualizar processo: ${error.message}`);
            return false;
        } finally {
            setLoadingByAction(false);
        }
    };

    const salvarEdicao = () => {
        if (!registroAberto) return;

        const divergenciaOriginal = hasValue(registroAberto.motivoDivergencia) || registroAberto.status === "DVG";

        const houveAlteracao = (
            (registroAberto.unidade || "") !== edicao.unidade ||
            (registroAberto.zona || "") !== edicao.zona ||
            (registroAberto.fazenda || "") !== edicao.fazenda ||
            (registroAberto.empresa || "") !== edicao.empresa ||
            (registroAberto.motorista || "") !== edicao.motorista ||
            (registroAberto.placa || "") !== edicao.placa ||
            (registroAberto.pesoEstimado || "") !== edicao.pesoEstimado ||
            (registroAberto.pesoLiquido || "") !== pesoLiquidoCalculado ||
            (registroAberto.pesoBruto || "") !== edicao.pesoBruto ||
            (registroAberto.tara || "") !== edicao.tara ||
            (registroAberto.tipoPesagem || "") !== edicao.tipoPesagem ||
            (registroAberto.refugo || "") !== edicao.refugo ||
            divergenciaOriginal !== edicao.temDivergencia ||
            (registroAberto.motivoDivergencia || "") !== edicao.motivoDivergencia ||
            (registroAberto.status || "CGA") !== edicao.status ||
            (registroAberto.estoqueInicial || "") !== edicao.estoqueInicial ||
            (registroAberto.colheitaDia || "") !== edicao.colheitaDia ||
            (registroAberto.saldoDisponivel || "") !== edicao.saldoDisponivel ||
            (registroAberto.prevColheita || "") !== edicao.prevColheita
        );

        if (!houveAlteracao) {
            alert("Nenhuma alteração foi feita para salvar.");
            return;
        }

        // Se é gerente, sempre volta para CGA ao editar
        const statusParaEnviar = tipoHeader === 'GERENTE' ? 'CGA' : edicao.status;
        atualizarRegistroAberto("editar", statusParaEnviar);
    };

    const contarOcorrencias = (obsText) => {
        if (!obsText) return 0;
        const matches = obsText.match(/\d+\. OCORRENCIA:/g);
        return matches ? matches.length : 0;
    };

    const salvarRecusaCarga = async () => {
        if (!registroAbertoId || !obsRecusa.trim()) {
            alert("Preencha o motivo da recusa!");
            return;
        }

        const ocorrenciaNum = contarOcorrencias(edicao.observacao) + 1;
        const novaObs = edicao.observacao 
            ? `${edicao.observacao}\n${ocorrenciaNum}. OCORRENCIA: ${obsRecusa.trim()}`
            : `${ocorrenciaNum}. OCORRENCIA: ${obsRecusa.trim()}`;

        try {
            setCarregandoRecusa(true);
            const response = await fetch(`${API_BASE_URL}/controladoria/processos/${encodeURIComponent(registroAbertoId)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-type": tipoHeader
                },
                body: JSON.stringify({
                    action: "recusar",
                    observacao: novaObs
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || data.detail || "Falha ao recusar carga.");
            }

            await carregarProcessos();
            setRecusandoCarga(false);
            setObsRecusa("");
            alert(data.message || "Carga recusada com sucesso!");
        } catch (error) {
            alert(`Erro ao recusar carga: ${error.message}`);
        } finally {
            setCarregandoRecusa(false);
        }
    };

    const camposPendentesFinalizacao = useMemo(() => {
        if (!registroAberto) return [];

        const obrigatorios = [
            ["unidade", "unidade"],
            ["zona", "zona"],
            ["fazenda", "fazenda"],
            ["empresa", "empresa"],
            ["motorista", "motorista"],
            ["placa", "placa"],
            ["pesoEstimado", "peso estimado"],
            ["pesoLiquido", "peso liquido"],
            ["pesoBruto", "peso bruto"],
            ["tara", "tara"],
            ["tipoPesagem", "tipo de pesagem"],
            ["refugo", "refugo"]
        ];

        if (edicao.operacao === "CITRUS") {
            obrigatorios.push(
                ["estoqueInicial", "estoque inicial"],
                ["colheitaDia", "estoque do dia"],
                ["saldoDisponivel", "saldo disponível"]
            );
        } else if (edicao.operacao === "GRAOS") {
            obrigatorios.push(["prevColheita", "previsão de colheita"]);
        }

        // Se marcou que tem divergência, o motivo é obrigatório
        if (edicao.temDivergencia && !hasValue(edicao.motivoDivergencia)) {
            obrigatorios.push(["motivoDivergencia", "motivo da divergência"]);
        }

        const faltando = obrigatorios
            .filter(([chave]) => {
                if (chave === "pesoLiquido") return !hasValue(pesoLiquidoCalculado);
                return !hasValue(edicao[chave]);
            })
            .map(([, legenda]) => legenda);

        const qtdFotos = Number(registroAberto.fotosCount || 0);
        if (!Number.isFinite(qtdFotos) || qtdFotos <= 0) {
            faltando.push("fotos");
        }

        return faltando;
    }, [edicao, registroAberto, pesoLiquidoCalculado]);

    const finalizarRegistro = async () => {
        if (camposPendentesFinalizacao.length > 0) {
            alert(`Não é possível finalizar sem preencher todos os campos. Pendentes: ${camposPendentesFinalizacao.join(", ")}.`);
            return;
        }
        
        // Se tem divergência, usa status FNL/DVG, senão usa FNL
        const statusFinalizacao = edicao.temDivergencia ? "FNL/DVG" : "FNL";
        await atualizarRegistroAberto("finalizar", statusFinalizacao);
    };

    const registroJaFinalizado = registroAberto?.status === "FNL" || registroAberto?.status === "FNL/DVG";

    const alternarSelecaoLinha = (id) => {
        const idNormalizado = String(id);
        setIdsSelecionados((anteriores) => (
            anteriores.includes(idNormalizado)
                ? anteriores.filter((item) => item !== idNormalizado)
                : [...anteriores, idNormalizado]
        ));
    };

    const alternarSelecaoTodosFiltrados = () => {
        if (todosFiltradosSelecionados) {
            setIdsSelecionados((anteriores) => anteriores.filter((id) => !idsFiltrados.includes(id)));
            return;
        }

        setIdsSelecionados((anteriores) => {
            const combinados = new Set([...anteriores, ...idsFiltrados]);
            return Array.from(combinados);
        });
    };

    const obterRegistrosSelecionados = () => {
        const selecionados = registros.filter((item) => idsSelecionados.includes(String(item.id)));
        if (selecionados.length === 0) {
            alert("Selecione ao menos uma linha para exportar.");
            return [];
        }
        return selecionados;
    };

    const escaparHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const exportarCsv = () => {
        const selecionados = obterRegistrosSelecionados();
        if (selecionados.length === 0) return;

        const colunasPreferenciais = [
            "id",
            "unidade",
            "zona",
            "fazenda",
            "empresa",
            "cnpj",
            "motorista",
            "placa",
            "pesoEstimado",
            "pesoLiquido",
            "pesoBruto",
            "tara",
            "tipoPesagem",
            "refugo",
            "motivoDivergencia",
            "status",
            "criadoEm",
            "fotosCount",
            "fotos"
        ];

        const todasAsChaves = Array.from(
            new Set(selecionados.flatMap((item) => Object.keys(item || {})))
        );

        const colunas = [
            ...colunasPreferenciais.filter((chave) => todasAsChaves.includes(chave)),
            ...todasAsChaves.filter((chave) => !colunasPreferenciais.includes(chave))
        ];

        const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

        const formatarValorCsv = (value) => {
            if (Array.isArray(value)) return value.join(" | ");
            if (value && typeof value === "object") return JSON.stringify(value);
            return value ?? "";
        };

        const linhas = selecionados.map((item) =>
            colunas
                .map((coluna) => formatarValorCsv(item?.[coluna]))
                .map(escapeCsv)
                .join(",")
        );

        const csv = [colunas.join(","), ...linhas].join("\n");
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        link.href = url;
        link.download = `controladoria_export_${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const exportarPdf = () => {
        const selecionados = obterRegistrosSelecionados();
        if (selecionados.length === 0) return;

        const linhasHtml = selecionados.map((item) => `
            <tr>
                <td>${escaparHtml(item.id)}</td>
                <td>${escaparHtml(item.unidade)}</td>
                <td>${escaparHtml(item.zona)}</td>
                <td>${escaparHtml(item.fazenda)}</td>
                <td>${escaparHtml(item.empresa)}</td>
                <td>${escaparHtml(item.motorista)}</td>
                <td>${escaparHtml(item.placa)}</td>
                <td>${escaparHtml(item.pesoLiquido)}</td>
                <td>${escaparHtml(item.status)}</td>
            </tr>
        `).join("");

        const janela = window.open("", "_blank", "width=1200,height=800");
        if (!janela) {
            alert("Não foi possível abrir a impressão. Verifique se o navegador bloqueou pop-up.");
            return;
        }

        janela.document.write(`
            <html>
                <head>
                    <title>Exportação Controladoria</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
                        h2 { margin: 0 0 12px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
                        th { background: #f3f3f3; }
                    </style>
                </head>
                <body>
                    <h2>Exportação Controladoria (${selecionados.length} registro(s))</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Unidade</th>
                                <th>Zona</th>
                                <th>Fazenda</th>
                                <th>Empresa</th>
                                <th>Motorista</th>
                                <th>Placa</th>
                                <th>Peso Líquido</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${linhasHtml}</tbody>
                    </table>
                </body>
            </html>
        `);
        janela.document.close();
        janela.focus();
        janela.print();
    };

    return (
        <div className="controladoria-main">
            <header className="controladoria-header">
                <div className="header-title-with-loader">
                    <h3>CONTROLADORIA OPERACIONAL</h3>
                    {carregando && <div className="loading-spinner"></div>}
                </div>
            </header>

            <section className="controladoria-kpis">
                <article><span>Total</span><strong>{kpis.total}</strong></article>
                <article><span>Pendentes</span><strong>{kpis.pendentes}</strong></article>
                <article><span>Divergências</span><strong>{kpis.divergencia}</strong></article>
                <article><span>Recusadas</span><strong>{kpis.recusadas}</strong></article>
                <article><span>Finalizados</span><strong>{kpis.finalizados}</strong></article>
            </section>

            <section className="controladoria-filtros">
                <input
                    type="text"
                    maxLength={MAX_INPUT_LENGTH}
                    placeholder="Pesquisar por ID, unidade, zona, destino, empresa, motorista..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value.toUpperCase())}
                />
                <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                    <option value="TODOS">Todos os status</option>
                    <option value="DIS">Disponível (DIS)</option>
                    <option value="AGE">Agendado (AGE)</option>
                    <option value="CGA">Pendente (CGA)</option>
                    <option value="DVG">Divergência (DVG)</option>
                    <option value="RCD">Recusada (RCD)</option>
                    <option value="FNL">Finalizado (FNL)</option>
                    <option value="FNL/DVG">Finalizado com Divergência (FNL/DVG)</option>
                </select>
            </section>

            <section className="controladoria-acoes-exportacao">
                <button type="button" onClick={alternarSelecaoTodosFiltrados}>
                    {todosFiltradosSelecionados ? "Desmarcar filtrados" : "Selecionar filtrados"}
                </button>
                <button type="button" onClick={exportarCsv}>Exportar CSV</button>
                <button type="button" onClick={exportarPdf}>Imprimir / PDF</button>
                <span>{idsSelecionados.length} linha(s) selecionada(s)</span>
            </section>

            <section className="controladoria-notificacoes">
                <h4>Notificações</h4>
                {notificacoes.length === 0 ? (
                    <p>Sem alertas no momento.</p>
                ) : (
                    <ul>
                        {notificacoes.map((aviso) => <li key={aviso}>{aviso}</li>)}
                    </ul>
                )}
            </section>

            <section className="controladoria-tabela-wrapper">
                <table className="controladoria-tabela">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={todosFiltradosSelecionados}
                                    onChange={alternarSelecaoTodosFiltrados}
                                    aria-label="Selecionar todos filtrados"
                                />
                            </th>
                            <th>ID</th>
                            <th>Unidade</th>
                            <th>Zona</th>
                            <th>Empresa</th>
                            <th>Destino</th>
                            <th>Peso Líquido (KG)</th>
                            <th>Status</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrosFiltrados.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={idsSelecionados.includes(String(item.id))}
                                        onChange={() => alternarSelecaoLinha(item.id)}
                                        aria-label={`Selecionar ${item.id}`}
                                    />
                                </td>
                                <td>{item.id}</td>
                                <td>{item.unidade}</td>
                                <td>{item.zona}</td>
                                <td>{item.empresa}</td>
                                <td>{item.fazenda}</td>
                                <td>{withKg(item.pesoLiquido)}</td>
                                <td><span className={`badge-${item.status.toLowerCase().replace(/\//g, '-')}`}>{item.status}</span></td>
                                <td>
                                    <button type="button" onClick={() => abrirRegistro(item)}>Abrir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {registroAberto && (
                <div className="controladoria-overlay" onClick={() => setRegistroAbertoId(null)}>
                <aside className="controladoria-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-head">
                        <h4>{registroAberto.id}</h4>
                        <button type="button" onClick={() => setRegistroAbertoId(null)}>✕</button>
                    </div>

                    <p><strong>Empresa:</strong> {registroAberto.empresa}</p>
                    <p><strong>Destino:</strong> {registroAberto.fazenda}</p>
                    <p><strong>Motorista:</strong> {registroAberto.motorista}</p>

                    <div className="controladoria-fotos">
                        <h5>Fotos do carregamento</h5>
                        {(edicao.fotos?.length || 0) === 0 ? (
                            <p>Sem fotos anexadas.</p>
                        ) : (
                            <div className="controladoria-fotos-grid">
                                {(edicao.fotos || []).map((foto, index) => {
                                    const fotoSrc = formatFotoSrc(foto);
                                    const tipoFoto = index === 0 ? 'FOTO VEICULO' : 'FOTO PLACA';
                                    return (
                                        <div key={`foto-${index}`} style={{ position: 'relative', display: 'inline-block' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>
                                                {tipoFoto}
                                            </div>
                                            <a href={fotoSrc} target="_blank" rel="noreferrer">
                                                <img src={fotoSrc} alt={tipoFoto} />
                                            </a>
                                            {podeEditarCampo('fotos') && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const novasFotos = edicao.fotos.filter((_, i) => i !== index);
                                                        setEdicao((prev) => ({ ...prev, fotos: novasFotos }));
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '5px',
                                                        right: '5px',
                                                        background: 'red',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '30px',
                                                        height: '30px',
                                                        cursor: 'pointer',
                                                        fontSize: '18px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Remover foto"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {podeEditarCampo('fotos') && (
                            <label style={{ marginTop: '15px', display: 'block' }}>
                                Adicionar/Substituir fotos
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*"
                                    onChange={(e) => {
                                        const novosFotosArquivos = Array.from(e.target.files || []);
                                        if (novosFotosArquivos.length > 0) {
                                            Promise.all(
                                                novosFotosArquivos.map((file) => {
                                                    return new Promise((resolve, reject) => {
                                                        const reader = new FileReader();
                                                        reader.onload = () => resolve(reader.result);
                                                        reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
                                                        reader.readAsDataURL(file);
                                                    });
                                                })
                                            ).then((fotosBase64) => {
                                                setEdicao((prev) => ({
                                                    ...prev,
                                                    fotos: [...prev.fotos, ...fotosBase64].slice(0, 2) // Máximo 2 fotos
                                                }));
                                            }).catch((err) => alert(err.message));
                                        }
                                    }}
                                    style={{ marginTop: '8px' }}
                                />
                            </label>
                        )}
                    </div>

                    <label>
                        Unidade
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('unidade')}
                            value={edicao.unidade}
                            placeholder="Ex: 112"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, unidade: formatTextoMaiusculo(e.target.value, 40) }))}
                        />
                    </label>

                    <label>
                        Zona
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('zona')}
                            value={edicao.zona}
                            placeholder="Ex: 123"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, zona: formatTextoMaiusculo(e.target.value, 40) }))}
                        />
                    </label>

                    <label>
                        DESTINO
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('fazenda')}
                            value={edicao.fazenda}
                            placeholder="Ex: FAZENDA MODELO"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, fazenda: formatTextoMaiusculo(e.target.value, 80) }))}
                        />
                    </label>

                    <label>
                        Empresa
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('empresa')}
                            value={edicao.empresa}
                            placeholder="Ex: AGT TRANSPORTES"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, empresa: formatTextoMaiusculo(e.target.value, 80) }))}
                        />
                    </label>

                    <label>
                        Motorista
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('motorista')}
                            value={edicao.motorista}
                            placeholder="Ex: JOÃO SILVA"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, motorista: formatNome(e.target.value) }))}
                        />
                    </label>

                    <label>
                        Placa
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('placa')}
                            value={edicao.placa}
                            placeholder="Ex: ABC1234"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, placa: formatPlaca(e.target.value) }))}
                        />
                    </label>

                    <label>
                        Peso estimado (KG)
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('pesoEstimado')}
                            value={edicao.pesoEstimado}
                            placeholder="Ex: 3,000 KG"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, pesoEstimado: formatKg(e.target.value) }))}
                        />
                    </label>

                    <label>
                        Peso líquido conferido (KG)
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            value={pesoLiquidoCalculado}
                            placeholder="AUTOMÁTICO (BRUTO - TARA)"
                            readOnly
                        />
                    </label>

                    <label>
                        Peso bruto (KG)
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('pesoBruto')}
                            value={edicao.pesoBruto}
                            placeholder="Ex: 3,200 KG"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, pesoBruto: formatKg(e.target.value) }))}
                        />
                    </label>

                    <label>
                        Tara (KG)
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('tara')}
                            value={edicao.tara}
                            placeholder="Ex: 350 KG"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, tara: formatKg(e.target.value) }))}
                        />
                    </label>

                    <label>
                        Tipo de pesagem
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            value="BRUTO-TARA"
                            readOnly
                        />
                    </label>

                    <label>
                        Refugo (kg)
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('refugo')}
                            value={edicao.refugo}
                            placeholder="Ex: 50 KG"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, refugo: formatKg(e.target.value) }))}
                        />
                    </label>

                    {edicao.operacao === "CITRUS" && (
                    <>
                        <label>
                            Estoque inicial (KG)
                            <input
                                type="text"
                                maxLength={MAX_INPUT_LENGTH}
                                disabled={!podeEditarCampo('estoqueInicial')}
                                value={edicao.estoqueInicial}
                                placeholder="Ex: 1,000 KG"
                                onChange={(e) => setEdicao((prev) => ({ ...prev, estoqueInicial: formatKg(e.target.value) }))}
                            />
                        </label>

                        <label>
                            Estoque do dia (KG)
                            <input
                                type="text"
                                maxLength={MAX_INPUT_LENGTH}
                                disabled={!podeEditarCampo('colheitaDia')}
                                value={edicao.colheitaDia}
                                placeholder="Ex: 500 KG"
                                onChange={(e) => setEdicao((prev) => ({ ...prev, colheitaDia: formatKg(e.target.value) }))}
                            />
                        </label>

                        <label>
                            Saldo disponível (KG)
                            <input
                                type="text"
                                maxLength={MAX_INPUT_LENGTH}
                                disabled={!podeEditarCampo('saldoDisponivel')}
                                value={edicao.saldoDisponivel}
                                placeholder="Ex: 500 KG"
                                onChange={(e) => setEdicao((prev) => ({ ...prev, saldoDisponivel: formatKg(e.target.value) }))}
                            />
                        </label>
                    </>
                    )}

                    {edicao.operacao === "GRAOS" && (
                    <label>
                        Previsão de colheita
                        <input
                            type="text"
                            maxLength={MAX_INPUT_LENGTH}
                            disabled={!podeEditarCampo('prevColheita')}
                            value={edicao.prevColheita}
                            placeholder="Ex: 50 sacas"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, prevColheita: formatTextoMaiusculo(e.target.value, 80) }))}
                        />
                    </label>
                    )}

                    <label>
                        O item possui divergência?
                        <select
                            disabled={!podeEditarCampo('temDivergencia')}
                            value={edicao.temDivergencia ? "SIM" : "NAO"}
                            onChange={(e) => {
                                const possui = e.target.value === "SIM";
                                setEdicao((prev) => ({
                                    ...prev,
                                    temDivergencia: possui,
                                    motivoDivergencia: possui ? prev.motivoDivergencia : "SEM COMENTARIOS"
                                }));
                            }}
                        >
                            <option value="NAO" defaultValue>NÃO</option>
                            <option value="SIM">SIM</option>
                        </select>
                    </label>

                    {edicao.temDivergencia && (
                    <label>
                        Motivo de divergência
                        <input
                            type="text"
                            disabled={!podeEditarCampo('motivoDivergencia')}
                            value={edicao.motivoDivergencia}
                            placeholder="Descreva o motivo"
                            onChange={(e) => setEdicao((prev) => ({ ...prev, motivoDivergencia: formatTextoMaiusculo(e.target.value, 120) }))}
                        />
                    </label>
                    )}

                    <label>
                        Status
                        <select
                            disabled={!podeEditarCampo('status')}
                            value={edicao.status}
                            onChange={(e) => setEdicao((prev) => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="DIS">DIS</option>
                            <option value="AGE">AGE</option>
                            <option value="CGA">CGA</option>
                            <option value="DVG">DVG</option>
                            <option value="RCD">RCD (Carga Recusada)</option>
                            <option value="FNL">FNL</option>
                            <option value="FNL/DVG">FNL/DVG (Finalizado com Divergência)</option>
                        </select>
                    </label>
                    {edicao.observacao && edicao.observacao !== "SEM COMENTARIOS" && (
                    <label>
                        Observações de recusa
                        <textarea
                            readOnly
                            value={edicao.observacao}
                            style={{ height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
                        />
                    </label>
                    )}

                    <div className="drawer-actions">
                        {podeEditar && (
                            <>
                                {(tipoHeader === 'GERENTE' || tipoHeader === 'ADMIN') && (
                                <button 
                                    type="button" 
                                    onClick={salvarEdicao}
                                    disabled={carregandoEdicao}
                                >
                                    {carregandoEdicao ? "Salvando..." : "Salvar edição"}
                                </button>
                                )}
                                {(tipoHeader === 'CONTROLADORIA' || tipoHeader === 'ADMIN') && (
                                <button
                                    type="button"
                                    className={registroJaFinalizado ? "btn-finalizado" : ""}
                                    onClick={finalizarRegistro}
                                    disabled={registroJaFinalizado || carregandoFinalizacao}
                                    title={registroJaFinalizado
                                        ? "Processo já finalizado"
                                        : camposPendentesFinalizacao.length > 0
                                            ? `Preencha antes de finalizar: ${camposPendentesFinalizacao.join(", ")}`
                                            : "Finalizar processo"}
                                >
                                    {carregandoFinalizacao ? "Finalizando..." : registroJaFinalizado ? "Finalizado" : "Finalizar"}
                                </button>
                                )}
                                {(tipoHeader === 'CONTROLADORIA' || tipoHeader === 'ADMIN') && registroAberto?.status !== 'RCD' && (
                                    <button 
                                        type="button" 
                                        onClick={() => setRecusandoCarga(true)}
                                        disabled={carregandoRecusa}
                                    >
                                        {carregandoRecusa ? "Processando..." : "Recusar Carga"}
                                    </button>
                                )}
                            </>
                        )}
                        {!podeEditar && registroJaFinalizado && (
                            <p className="read-only-msg">Processo finalizado. Nenhuma edição é permitida.</p>
                        )}
                        {!podeEditar && !registroJaFinalizado && (
                            <p className="read-only-msg">Modo visualização. Dados travados. Apenas GERENTE/ADMIN podem editar apontamentos RCD.</p>
                        )}
                        {registroAberto?.status === 'RCD' && ehGerente && (
                            <p style={{ fontSize: '12px', color: '#f39200', marginTop: '8px' }}>📌 Após editar, mude o status para CGA para enviar de volta à controladoria.</p>
                        )}
                    </div>

                    {recusandoCarga && (
                    <div className="modal-recusa-overlay">
                        <div className="modal-recusa">
                            <h3>Recusar Carga</h3>
                            <p>Tem certeza que deseja recusar este apontamento?</p>
                            <label>
                                Motivo da recusa:
                                <textarea
                                    value={obsRecusa}
                                    onChange={(e) => setObsRecusa(e.target.value)}
                                    placeholder="Descreva o motivo da recusa..."
                                    style={{ height: '80px' }}
                                />
                            </label>
                            <div className="modal-recusa-botoes">
                                <button 
                                    onClick={() => { setRecusandoCarga(false); setObsRecusa(""); }}
                                    disabled={carregandoRecusa}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={salvarRecusaCarga}
                                    disabled={carregandoRecusa}
                                >
                                    {carregandoRecusa ? "Processando..." : "Confirmar Recusa"}
                                </button>
                            </div>
                        </div>
                    </div>
                    )}
                </aside>
                </div>
            )}
        </div>
    );
}
