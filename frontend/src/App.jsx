
import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

function App() {
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])

  // Gerenciamento de produtos desativados
  const [produtosDesativados, setProdutosDesativados] = useState([])
  const [mostrarProdutosDesativados, setMostrarProdutosDesativados] = useState(false)
  const [carregandoProdutosDesativados, setCarregandoProdutosDesativados] = useState(false)

  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [carrinho, setCarrinho] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState('cardapio')

  // Dados do administrador
  const [tokenAdmin, setTokenAdmin] = useState('')
  const [administrador, setAdministrador] = useState(null)

  // Dados do login
  const [emailAdmin, setEmailAdmin] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [carregandoLogin, setCarregandoLogin] = useState(false)

  // Dados dos pedidos
  const [pedidos, setPedidos] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('')
  const [erroPedidos, setErroPedidos] = useState('')

  // Seção atual da área administrativa
  const [secaoAdmin, setSecaoAdmin] = useState('pedidos')

  
  // Gerenciamento de administradores
  const [administradores, setAdministradores] = useState([])
  const [erroAdministradores, setErroAdministradores] = useState('')
  const [mensagemAdministradores, setMensagemAdministradores] = useState('')
  const [carregandoAdministradores, setCarregandoAdministradores] = useState(false)

  // Gerenciamento de administradores desativados
  const [administradoresDesativados, setAdministradoresDesativados] = useState([])
  const [mostrarAdministradoresDesativados, setMostrarAdministradoresDesativados] = useState(false)
  const [carregandoAdministradoresDesativados, setCarregandoAdministradoresDesativados] = useState(false)

  const [formAdministrador, setFormAdministrador] = useState({
    nome: '',
    email: '',
    senha: ''
  })


  // Cadastro e edição de produtos
  const [mostrarFormularioProduto, setMostrarFormularioProduto] = useState(false)
  const [produtoEditandoId, setProdutoEditandoId] = useState(null)

  const [formProduto, setFormProduto] = useState({
    nome: '',
    descricao: '',
    ingredientes: '',
    preco: '',
    imagem_url: '',
    categoria_id: ''
  })

  const [erroProduto, setErroProduto] = useState('')
  const [mensagemProduto, setMensagemProduto] = useState('')

  const [avisoNovoPedido, setAvisoNovoPedido] = useState(false)
  const idsPedidosAnteriores = useRef(null)

  const [nomeCliente, setNomeCliente] = useState('')
  const [mesa, setMesa] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null)
  const [erroPedido, setErroPedido] = useState('')

  const quantidadeItens = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  )

  const valorTotal = carrinho.reduce(
    (total, item) => total + (Number(item.preco) * item.quantidade),
    0
  )

  // Encerra a sessão quando o token expira ou deixa de ser válido
const tratarSessaoExpirada = useCallback(() => {
  setTokenAdmin('')
  setAdministrador(null)

  // Limpa os dados administrativos
  setPedidos([])
  setFiltroStatus('')
  setErroPedidos('')
  setAvisoNovoPedido(false)
  idsPedidosAnteriores.current = null

  setAdministradores([])
  setAdministradoresDesativados([])
  setProdutosDesativados([])

  // Informa o motivo e retorna à tela de login
  setErroLogin('Sua sessão expirou. Faça login novamente.')
  setPaginaAtual('login')
}, [])


  const verificarSessaoExpirada = useCallback((resposta) => {
  if (resposta.status === 401) {
    tratarSessaoExpirada()
    return true
  }

  return false
}, [tratarSessaoExpirada])

  function adicionarAoCarrinho(produto) {
    setCarrinho((carrinhoAtual) => {
        const produtoExistente = carrinhoAtual.find(
            (item) => item.id === produto.id
        );

        if (produtoExistente) {
            return carrinhoAtual.map((item) =>
                item.id === produto.id
                    ? { ...item, quantidade: item.quantidade + 1 }
                    : item
            );
        }

        return [
            ...carrinhoAtual,
            { ...produto, quantidade: 1 }
        ];
    });
}

  function alterarQuantidade(id, variacao) {
    setCarrinho((carrinhoAtual) =>
      carrinhoAtual
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade + variacao }
            : item
        )
        .filter(item => item.quantidade > 0)
    )
  }

  function removerDoCarrinho(id) {
    setCarrinho((carrinhoAtual) =>
      carrinhoAtual.filter(item => item.id !== id)
    )
  }


  async function finalizarPedido() {

    // Verifica se o carrinho possui produtos
    if (carrinho.length === 0) {
      setErroPedido('Adicione pelo menos um produto ao carrinho.')
      return
    }

    // Verifica se o nome do cliente foi preenchido
    if (!nomeCliente.trim()) {
      setErroPedido('Informe o nome do cliente.')
      return
    }

    // Informa que o envio está começando
    setEnviandoPedido(true)
    setErroPedido('')

    // Organiza os dados no formato esperado pelo backend
    const dadosPedido = {
      nome_cliente: nomeCliente,
      mesa: mesa || null,
      observacoes: observacoes || null,
      itens: carrinho.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade,
        observacoes: null
      }))
    }

    try {

      // Envia o pedido para a API
      const resposta = await fetch('http://127.0.0.1:8000/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosPedido)
      })

      // Converte a resposta da API para JSON
      const dadosResposta = await resposta.json()

      // Verifica se ocorreu algum erro no backend
      if (!resposta.ok) {
        throw new Error(
          dadosResposta.detail || 'Não foi possível realizar o pedido.'
        )
      }

      // Armazena a confirmação recebida
      setPedidoConfirmado(dadosResposta)

      // Limpa o carrinho e os campos do cliente
      setCarrinho([])
      setNomeCliente('')
      setMesa('')
      setObservacoes('')

    } catch (erro) {

      // Armazena e apresenta o erro
      setErroPedido(erro.message)

    } finally {

      // Finaliza o estado de envio
      setEnviandoPedido(false)

    }
  }

  function editarProduto(produto) {
    setProdutoEditandoId(produto.id);

    setFormProduto({
      nome: produto.nome,
      descricao: produto.descricao,
      ingredientes: produto.ingredientes,
      preco: produto.preco,
      imagem_url: produto.imagem_url || '',
      categoria_id: produto.categoria_id
    });

    setMensagemProduto('');
    setErroProduto('');
    setMostrarFormularioProduto(true);
  }

  async function desativarProduto(produtoId) {
    const confirmar = window.confirm(
      'Tem certeza de que deseja desativar este produto?'
    );

    if (!confirmar) {
      return;
    }

    setErroProduto('');
    setMensagemProduto('');

    try {
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/produtos/${produtoId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      );

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível desativar o produto.'
        );
      }

      const respostaProdutos = await fetch(
        'http://127.0.0.1:8000/produtos'
      );

      const produtosAtualizados = await respostaProdutos.json();

      if (!respostaProdutos.ok) {
        throw new Error(
          'Produto desativado, mas não foi possível atualizar a lista.'
        );
      }

      setProdutos(produtosAtualizados);
      setMensagemProduto('Produto desativado com sucesso!');

    } catch (erro) {
      setErroProduto(erro.message);
    }
  }

  // Busca os produtos desativados no backend
  async function carregarProdutosDesativados() {
    setCarregandoProdutosDesativados(true)
    setErroProduto('')

    try {
      const resposta = await fetch(
        'http://127.0.0.1:8000/admin/produtos/desativados',
        {
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível carregar os produtos desativados.'
        )
      }

      setProdutosDesativados(dados)

    } catch (erro) {
      setErroProduto(erro.message)

    } finally {
      setCarregandoProdutosDesativados(false)
    }
  }

  // Reativa um produto anteriormente desativado
  async function reativarProduto(produtoId) {
    const confirmar = window.confirm(
      'Deseja reativar este produto e disponibilizá-lo novamente no cardápio?'
    )

    if (!confirmar) {
      return
    }

    setErroProduto('')
    setMensagemProduto('')

    try {
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/produtos/${produtoId}/reativar`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível reativar o produto.'
        )
      }

      // Atualiza os produtos ativos
      const respostaProdutos = await fetch(
        'http://127.0.0.1:8000/produtos'
      )

      const produtosAtualizados = await respostaProdutos.json()

      if (!respostaProdutos.ok) {
        throw new Error(
          'Produto reativado, mas não foi possível atualizar o cardápio.'
        )
      }

      setProdutos(produtosAtualizados)

      // Atualiza a lista de produtos desativados
      await carregarProdutosDesativados()

      setMensagemProduto(
        dados.mensagem || 'Produto reativado com sucesso!'
      )

    } catch (erro) {
      setErroProduto(erro.message)
    }
  }

  async function cadastrarProduto(e) {
    e.preventDefault();

    setErroProduto('');
    setMensagemProduto('');

    try {
      const editando = produtoEditandoId !== null;

      const url = editando
        ? `http://127.0.0.1:8000/admin/produtos/${produtoEditandoId}`
        : 'http://127.0.0.1:8000/admin/produtos';

      const resposta = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          nome: formProduto.nome,
          descricao: formProduto.descricao,
          ingredientes: formProduto.ingredientes,
          preco: Number(formProduto.preco),
          imagem_url: formProduto.imagem_url || null,
          categoria_id: Number(formProduto.categoria_id)
        })
      });

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível cadastrar o produto.'
        );
      }

      // Atualiza a lista de produtos
      const respostaProdutos = await fetch('http://127.0.0.1:8000/produtos');
      const produtosAtualizados = await respostaProdutos.json();

      if (!respostaProdutos.ok) {
        throw new Error('Produto cadastrado, mas não foi possível atualizar a lista.');
      }

      setProdutos(produtosAtualizados);

      // Limpa os campos do formulário
      setFormProduto({
        nome: '',
        descricao: '',
        ingredientes: '',
        preco: '',
        imagem_url: '',
        categoria_id: ''
      });

      setMostrarFormularioProduto(false);
      setMensagemProduto(
        editando
          ? 'Produto atualizado com sucesso!'
          : 'Produto cadastrado com sucesso!'
      );

      setProdutoEditandoId(null);
    } catch (erro) {
      setErroProduto(erro.message);
    }
  }

  

  const carregarPedidos = useCallback(async () => {
    //setErroPedidos('')

    try {
      // Monta a URL com o filtro de status, se houver
      const parametroStatus = filtroStatus
        ? `?status=${encodeURIComponent(filtroStatus)}`
        : ''

      // Solicita os pedidos ao backend
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/pedidos${parametroStatus}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      // Verifica se a sessão expirou ou deixou de ser válida
      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()
      setErroPedidos('')

      // Verifica se a API retornou algum outro erro
      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível carregar os pedidos.'
        )
      }

      // Identifica os pedidos recebidos nesta consulta
      const idsAtuais = dados.map(pedido => pedido.id)

      // Na primeira consulta, apenas registra os pedidos existentes
      if (idsPedidosAnteriores.current === null) {
        idsPedidosAnteriores.current = idsAtuais
      } else if (!filtroStatus) {

        // Verifica se apareceu algum pedido que ainda não conhecíamos
        const novosPedidos = dados.filter(
          pedido => !idsPedidosAnteriores.current.includes(pedido.id)
        )

        // Exibe o aviso se houver novos pedidos
        if (novosPedidos.length > 0) {
          setAvisoNovoPedido(true)
        }

        // Atualiza a lista de IDs conhecidos
        idsPedidosAnteriores.current = idsAtuais
      }

      // Armazena os pedidos recebidos
      setPedidos(dados)

    } catch (erro) {
      setErroPedidos(erro.message)
    }
  }, [filtroStatus, tokenAdmin, verificarSessaoExpirada])

  // Busca os administradores cadastrados no backend
  async function carregarAdministradores() {
    setErroAdministradores('')
    setCarregandoAdministradores(true)

    try {
      const resposta = await fetch(
        'http://127.0.0.1:8000/admin/administradores',
        {
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      // Verifica se a sessão expirou ou deixou de ser válida
      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível carregar os administradores.'
        )
      }

      setAdministradores(dados)

    } catch (erro) {
      setErroAdministradores(erro.message)

    } finally {
      setCarregandoAdministradores(false)
    }
  }

  // Busca os administradores desativados no backend
  async function carregarAdministradoresDesativados() {
    setCarregandoAdministradoresDesativados(true)
    setErroAdministradores('')

    try {
      const resposta = await fetch(
        'http://127.0.0.1:8000/admin/administradores',
        {
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível carregar os administradores.'
        )
      }

      // Mantém somente os administradores desativados
      setAdministradoresDesativados(
        dados.filter(administrador => !administrador.ativo)
      )

    } catch (erro) {
      setErroAdministradores(erro.message)

    } finally {
      setCarregandoAdministradoresDesativados(false)
    }
  }

  // Reativa um administrador anteriormente desativado
  async function reativarAdministrador(administradorId) {
    const confirmar = window.confirm(
      'Deseja reativar este administrador? Ele poderá acessar novamente o painel administrativo.'
    )

    if (!confirmar) return

    setErroAdministradores('')
    setMensagemAdministradores('')

    try {
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/administradores/${administradorId}/reativar`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível reativar o administrador.'
        )
      }

      // Atualiza as duas listagens
      await carregarAdministradores()
      await carregarAdministradoresDesativados()

      setMensagemAdministradores(
        dados.mensagem || 'Administrador reativado com sucesso!'
      )

    } catch (erro) {
      setErroAdministradores(erro.message)
    }
  }

  // Cadastra um novo administrador
  async function cadastrarAdministrador(e) {
    e.preventDefault()

    setErroAdministradores('')
    setMensagemAdministradores('')

    try {
      const resposta = await fetch(
        'http://127.0.0.1:8000/admin/administradores',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenAdmin}`
          },
          body: JSON.stringify({
            nome: formAdministrador.nome,
            email: formAdministrador.email,
            senha: formAdministrador.senha
          })
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível cadastrar o administrador.'
        )
      }

      setFormAdministrador({
        nome: '',
        email: '',
        senha: ''
      })

      setMensagemAdministradores('Administrador cadastrado com sucesso!')

      await carregarAdministradores()

    } catch (erro) {
      setErroAdministradores(erro.message)
    }
  }

  // Desativa um administrador
  async function desativarAdministrador(administradorId) {
    const confirmar = window.confirm(
      'Tem certeza de que deseja desativar este administrador?'
    )

    if (!confirmar) {
      return
    }

    setErroAdministradores('')
    setMensagemAdministradores('')

    try {
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/administradores/${administradorId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokenAdmin}`
          }
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível desativar o administrador.'
        )
      }

      setMensagemAdministradores(
        dados.mensagem || 'Administrador desativado com sucesso!'
      )

      await carregarAdministradores()

    } catch (erro) {
      setErroAdministradores(erro.message)
    }
  }

  async function atualizarStatusPedido(pedidoId, novoStatus) {
    setErroPedidos('')

    try {
      const resposta = await fetch(
        `http://127.0.0.1:8000/admin/pedidos/${pedidoId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenAdmin}`
          },
          body: JSON.stringify({
            novo_status: novoStatus
          })
        }
      )

      if (verificarSessaoExpirada(resposta)) {
        return
      }

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'Não foi possível atualizar o status.'
        )
      }

      await carregarPedidos()

    } catch (erro) {
      setErroPedidos(erro.message)
    }
  }

  async function fazerLogin() {
    // Limpa mensagens de erro anteriores
    setErroLogin('')

    // Verifica se os campos foram preenchidos
    if (!emailAdmin.trim() || !senhaAdmin) {
      setErroLogin('Informe o e-mail e a senha.')
      return
    }

    setCarregandoLogin(true)

    try {
      // Envia as credenciais para o backend
      const resposta = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailAdmin,
          senha: senhaAdmin
        })
      })

      const dados = await resposta.json()

      // Verifica se a autenticação foi bem-sucedida
      if (!resposta.ok) {
        throw new Error(
          dados.detail || 'E-mail ou senha incorretos.'
        )
      }

      // Armazena o token e os dados do administrador
      setTokenAdmin(dados.access_token)
      setAdministrador(dados.administrador)

      // Limpa os campos de login
      setEmailAdmin('')
      setSenhaAdmin('')

      // Abre a área administrativa
      setPaginaAtual('admin')

    } catch (erro) {
      setErroLogin(erro.message)

    } finally {
      setCarregandoLogin(false)
    }
  }

  // Encerra a sessão do administrador
function fazerLogout() {
  // Remove os dados de autenticação
  setTokenAdmin('')
  setAdministrador(null)

  // Limpa os dados administrativos
  setPedidos([])
  setFiltroStatus('')
  setErroPedidos('')
  setAvisoNovoPedido(false)
  idsPedidosAnteriores.current = null

  // Limpa os dados de gerenciamento
  setAdministradores([])
  setAdministradoresDesativados([])
  setProdutosDesativados([])

  // Retorna à página inicial
  setSecaoAdmin('pedidos')
  setPaginaAtual('cardapio')
}

  useEffect(() => {
    fetch('http://127.0.0.1:8000/categorias')
      .then(resposta => resposta.json())
      .then(dados => {
        setCategorias(dados)
      })
      .catch(erro => {
        console.error('Erro ao buscar categorias:', erro)
      })

    fetch('http://127.0.0.1:8000/produtos')
      .then(resposta => resposta.json())
      .then(dados => {
        setProdutos(dados)
      })
      .catch(erro => {
        console.error('Erro ao buscar produtos:', erro)
      })
  }, [])

  useEffect(() => {
    if (paginaAtual === 'admin' && tokenAdmin) {

      // Agenda o primeiro carregamento dos pedidos
      const carregamentoInicial = setTimeout(() => {
        carregarPedidos()
      }, 0)

      // Atualiza a lista a cada 10 segundos
      const intervalo = setInterval(() => {
        carregarPedidos()
      }, 10000)

      // Encerra as atualizações ao sair da área administrativa
      return () => {
        clearTimeout(carregamentoInicial)
        clearInterval(intervalo)
      }
    }
  }, [paginaAtual, tokenAdmin, carregarPedidos])

  return (
    <>

      <header>
        <div className="header-banner">
          <h1 className="titulo-oculto">CARDOKE Doceria</h1>
        </div>

        <div className="header-botoes">
          <button onClick={() => setPaginaAtual('carrinho')}>
            🛒 Meu carrinho ({quantidadeItens})
          </button>

          <button
            onClick={() => {
              if (tokenAdmin && administrador) {
                setPaginaAtual('admin')
              } else {
                setErroLogin('')
                setPaginaAtual('login')
              }
            }}
          >
            Área administrativa
          </button>
        </div>
      </header>

      {paginaAtual === 'login' && (
        <section className="login-admin">

          <button
            className="botao-voltar"
            onClick={() => setPaginaAtual('cardapio')}
          >
            ← Voltar ao cardápio
          </button>

          <h2>Área administrativa</h2>
          <p>Entre com suas credenciais para acessar os pedidos.</p>

          <div className="dados-login">

            <label>E-mail:</label>
            <input
              type="email"
              value={emailAdmin}
              onChange={(e) => setEmailAdmin(e.target.value)}
              placeholder="Digite seu e-mail"
            />

            <label>Senha:</label>
            <input
              type="password"
              value={senhaAdmin}
              onChange={(e) => setSenhaAdmin(e.target.value)}
              placeholder="Digite sua senha"
            />

          </div>

          {erroLogin && (
            <p className="erro-pedido">
              {erroLogin}
            </p>
          )}

          <button
            onClick={fazerLogin}
            disabled={carregandoLogin}
          >
            {carregandoLogin ? 'Verificando...' : 'Entrar'}
          </button>

        </section>
      )}

    
      {paginaAtual === 'admin' && (
        <section className="admin-pedidos">

          <div className="admin-cabecalho">
            <div>
              <h2>Gerenciamento de pedidos</h2>
              <p>
                Bem-vindo(a), {administrador?.nome}!
              </p>
            </div>

            <div>
              <button
                className="botao-voltar"
                onClick={() => setPaginaAtual('cardapio')}
              >
                Voltar ao cardápio
              </button>

              <button
                className="botao-voltar"
                onClick={fazerLogout}
              >
                Sair da conta
              </button>
            </div>
          </div>

          <div className="navegacao-admin">
            <button
              className={secaoAdmin === 'pedidos' ? 'aba-admin ativa' : 'aba-admin'}
              onClick={() => setSecaoAdmin('pedidos')}
            >
              Gerenciar pedidos
            </button>

            <button
              className={secaoAdmin === 'produtos' ? 'aba-admin ativa' : 'aba-admin'}
              onClick={() => setSecaoAdmin('produtos')}
            >
              Gerenciar produtos
            </button>

            {administrador?.perfil === 'proprietario' && (
              <button
                className={
                  secaoAdmin === 'administradores'
                    ? 'aba-admin ativa'
                    : 'aba-admin'
                }
                onClick={() => {
                  setSecaoAdmin('administradores')
                  carregarAdministradores()
                }}
              >
                Gerenciar administradores
              </button>
            )}

          </div>

          {secaoAdmin === 'pedidos' && (
            <>      
            <div className="filtro-pedidos">
              <label>Filtrar pedidos por status:</label>

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos os pedidos</option>
                <option value="Recebido">Recebido</option>
                <option value="Em preparo">Em preparo</option>
                <option value="Pronto">Pronto</option>
                <option value="Entregue">Entregue</option>
              </select>
            </div>
          

          {erroPedidos && (
            <p className="erro-pedido">{erroPedidos}</p>
          )}

          {avisoNovoPedido && (
            <div className="aviso-novo-pedido">
              <div>
                <strong> Novo pedido recebido!</strong>
                <p>Um novo pedido foi adicionado à lista.</p>
              </div>

              <button
                onClick={() => setAvisoNovoPedido(false)}
              >
                Entendi
              </button>
            </div>
          )}

          {pedidos.length === 0 && !erroPedidos ? (
            <p>Nenhum pedido encontrado.</p>
          ) : (
            <div className="lista-pedidos">

              {pedidos.map(pedido => (
                <div className="pedido-admin" key={pedido.id}>

                  <div className="pedido-admin-cabecalho">
                    <h3>Pedido #{pedido.numero}</h3>
                    <span
                      className={`status-pedido ${
                        pedido.status === 'Recebido'
                          ? 'status-recebido'
                          : pedido.status === 'Em preparo'
                            ? 'status-em-preparo'
                            : pedido.status === 'Pronto'
                              ? 'status-pronto'
                              : 'status-entregue'
                      }`}
                    >
                      {pedido.status}
                    </span>
                  </div>

                  <p><strong>Cliente:</strong> {pedido.nome_cliente}</p>

                  <p><strong>Mesa:</strong> {pedido.mesa || 'Não informada'}</p>

                  <p>
                    <strong>Data:</strong>{' '}
                    {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                  </p>

                  <h4>Itens do pedido</h4>

                  <div className="controle-status-pedido">
                    <label htmlFor={`status-${pedido.id}`}>
                      Alterar status:
                    </label>

                    <select
                      id={`status-${pedido.id}`}
                      value={pedido.status}
                      onChange={(e) =>
                        atualizarStatusPedido(pedido.id, e.target.value)
                      }
                    >
                      <option value="Recebido">Recebido</option>
                      <option value="Em preparo">Em preparo</option>
                      <option value="Pronto">Pronto</option>
                      <option value="Entregue">Entregue</option>
                    </select>
                  </div>

                  {pedido.itens.map(item => (
                    <div key={item.id} className="item-pedido-admin">
                      <p>
                        {item.quantidade}x {item.nome_produto}
                      </p>

                      <p>
                        Subtotal: {Number(item.subtotal).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>

                      {item.observacoes && (
                        <p>Observação: {item.observacoes}</p>
                      )}
                    </div>
                  ))}

                  <p className="total-pedido-admin">
                    Total: {Number(pedido.total).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>

                  {pedido.observacoes && (
                    <p>Observações: {pedido.observacoes}</p>
                  )}

                </div>
              ))}

            </div>
          )}
          </>
        )}

        {secaoAdmin === 'produtos' && (
          <div className="admin-produtos">
            <h3>Produtos cadastrados</h3>

            {mensagemProduto && (
              <p className="mensagem-produto">{mensagemProduto}</p>
            )}

            <button
              className="botao-cadastrar-produto"
              onClick={() => {
                setMostrarFormularioProduto(!mostrarFormularioProduto);

                if (mostrarFormularioProduto) {
                  setProdutoEditandoId(null);
                  setFormProduto({
                    nome: '',
                    descricao: '',
                    ingredientes: '',
                    preco: '',
                    imagem_url: '',
                    categoria_id: ''
                  });
                }
              }}
            >
              {mostrarFormularioProduto
                ? 'Cancelar'
                : 'Cadastrar produto'}
            </button>

            {mostrarFormularioProduto && (
              <form
                className="form-produto-admin"
                onSubmit={cadastrarProduto}
              >
                <h4>
                  {produtoEditandoId !== null ? 'Editar produto' : 'Novo produto'}
                </h4>

                <label>Nome do produto:</label>
                <input
                  type="text"
                  name="nome"
                  value={formProduto.nome}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, nome: e.target.value })
                  }
                />

                <label>Descrição:</label>
                <textarea
                  name="descricao"
                  value={formProduto.descricao}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, descricao: e.target.value })
                  }
                />

                <label>Ingredientes:</label>
                <textarea
                  name="ingredientes"
                  value={formProduto.ingredientes}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, ingredientes: e.target.value })
                  }
                />

                <label>Preço:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="preco"
                  value={formProduto.preco}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, preco: e.target.value })
                  }
                />

                <label>Caminho da imagem:</label>
                <input
                  type="text"
                  name="imagem_url"
                  placeholder="/imagens/nome-da-imagem.jpg"
                  value={formProduto.imagem_url}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, imagem_url: e.target.value })
                  }
                />

                <label>Categoria:</label>
                <select
                  name="categoria_id"
                  value={formProduto.categoria_id}
                  onChange={(e) =>
                    setFormProduto({ ...formProduto, categoria_id: e.target.value })
                  }
                >
                  <option value="">Selecione uma categoria</option>

                  {categorias.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>

                {erroProduto && (
                  <p className="erro-pedido">{erroProduto}</p>
                )}

                <button type="submit" className="botao-salvar-produto">
                  {produtoEditandoId !== null ? 'Salvar alterações' : 'Cadastrar produto'}
                </button>

              </form>
            )}

            {produtos.length === 0 ? (
              <p>Nenhum produto cadastrado.</p>
           ) : (
              <div className="lista-produtos-admin">
                {produtos.map(produto => (
                  <div className="produto-admin" key={produto.id}>
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                    />
                      <div>
                       <h4>{produto.nome}</h4>
                       <p>{produto.descricao}</p>
                       <p>
                         {Number(produto.preco).toLocaleString('pt-BR', {
                           style: 'currency',
                           currency: 'BRL'
                         })}
                       </p>
                     </div>
                     <button
                      className="botao-editar-produto"
                      onClick={() => editarProduto(produto)}
                    >
                      Editar
                    </button>
                    
                    <button
                      className="botao-desativar-produto"
                      onClick={() => desativarProduto(produto.id)}
                    >
                      Desativar
                    </button>

                   </div>
                  
                 ))}
               </div>
             )}

              {/* Área de produtos desativados */}
              <div className="produtos-desativados">

                <button
                  className="botao-cadastrar-produto"
                  onClick={() => {
                    const novaExibicao = !mostrarProdutosDesativados

                    setMostrarProdutosDesativados(novaExibicao)

                    if (novaExibicao) {
                      carregarProdutosDesativados()
                    }
                  }}
                >
                  {mostrarProdutosDesativados
                    ? 'Ocultar produtos desativados'
                    : 'Ver produtos desativados'}
                </button>

                {mostrarProdutosDesativados && (
                  <div>
                    <h3>Produtos desativados</h3>

                    {carregandoProdutosDesativados ? (
                      <p>Carregando produtos desativados...</p>
                    ) : produtosDesativados.length === 0 ? (
                      <p>Nenhum produto desativado encontrado.</p>
                    ) : (
                      <div className="lista-produtos-admin">

                        {produtosDesativados.map(produto => (
                          <div
                            className="produto-admin"
                            key={produto.id}
                          >
                            <img
                              src={produto.imagem_url}
                              alt={produto.nome}
                            />

                            <div>
                              <h4>{produto.nome}</h4>
                              <p>{produto.descricao}</p>

                              <p>
                                {Number(produto.preco).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                            </div>

                            <button
                              className="botao-editar-produto"
                              onClick={() => reativarProduto(produto.id)}
                            >
                              Reativar
                            </button>

                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
         )}

        {secaoAdmin === 'administradores' &&
          administrador?.perfil === 'proprietario' && (
            <div className="admin-administradores">

              <h3>Administradores cadastrados</h3>

              <p>
                Cadastre e gerencie os usuários que terão acesso à área administrativa.
              </p>

              {mensagemAdministradores && (
                <p className="mensagem-produto">
                  {mensagemAdministradores}
                </p>
              )}

              {erroAdministradores && (
                <p className="erro-pedido">
                  {erroAdministradores}
                </p>
              )}

              <form
                className="form-produto-admin"
                onSubmit={cadastrarAdministrador}
              >
                <h4>Novo administrador</h4>

                <label>Nome:</label>
                <input
                  type="text"
                  value={formAdministrador.nome}
                  onChange={(e) =>
                    setFormAdministrador({
                      ...formAdministrador,
                      nome: e.target.value
                    })
                  }
                  placeholder="Nome do administrador"
                  required
                  minLength={2}
                  maxLength={150}
                />

                <label>E-mail:</label>
                <input
                  type="email"
                  value={formAdministrador.email}
                  onChange={(e) =>
                    setFormAdministrador({
                      ...formAdministrador,
                      email: e.target.value
                    })
                  }
                  placeholder="E-mail de acesso"
                  required
                  maxLength={150}
                />

                <label>Senha:</label>
                <input
                  type="password"
                  value={formAdministrador.senha}
                  onChange={(e) =>
                    setFormAdministrador({
                      ...formAdministrador,
                      senha: e.target.value
                    })
                  }
                  placeholder="Mínimo de 8 caracteres"
                  required
                  minLength={8}
                />

                <button
                  type="submit"
                  className="botao-salvar-produto"
                >
                  Cadastrar administrador
                </button>
              </form>

              <h4>Contas existentes</h4>

              {carregandoAdministradores ? (
                <p>Carregando administradores...</p>
              ) : administradores.length === 0 ? (
                <p>Nenhum administrador cadastrado.</p>
              ) : (
                <div className="lista-administradores">

                  {administradores.map(admin => (
                    <div
                      className="administrador-card"
                      key={admin.id}
                    >
                      <div>
                        <h4>{admin.nome}</h4>

                        <p>
                          <strong>E-mail:</strong> {admin.email}
                        </p>

                        <p>
                          <strong>Perfil:</strong>{' '}
                          {admin.perfil === 'proprietario'
                            ? 'Proprietário'
                            : 'Administrador'}
                        </p>

                        <p>
                          <strong>Situação:</strong>{' '}
                          {admin.ativo ? 'Ativo' : 'Desativado'}
                        </p>

                        <p>
                          <strong>Cadastrado em:</strong>{' '}
                          {new Date(admin.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {admin.perfil !== 'proprietario' &&
                        admin.ativo && (
                          <button
                            className="botao-desativar-produto"
                            onClick={() => desativarAdministrador(admin.id)}
                          >
                            Desativar conta
                          </button>
                        )}
                    </div>
                  ))}

                </div>
              )}


              {/* Área de administradores desativados */}
              <div className="administradores-desativados">

                <button
                  className="botao-cadastrar-produto"
                  onClick={() => {
                    const novaExibicao = !mostrarAdministradoresDesativados

                    setMostrarAdministradoresDesativados(novaExibicao)

                    if (novaExibicao) {
                      carregarAdministradoresDesativados()
                    }
                  }}
                >
                  {mostrarAdministradoresDesativados
                    ? 'Ocultar administradores desativados'
                    : 'Ver administradores desativados'}
                </button>

                {mostrarAdministradoresDesativados && (
                  <div>
                    <h3>Administradores desativados</h3>

                    {carregandoAdministradoresDesativados ? (
                      <p>Carregando administradores desativados...</p>
                    ) : administradoresDesativados.length === 0 ? (
                      <p>Nenhum administrador desativado encontrado.</p>
                    ) : (
                      <div className="lista-administradores">

                        {administradoresDesativados.map(administradorDesativado => (
                          <div
                            className="administrador-card"
                            key={administradorDesativado.id}
                          >

                            <div>
                              <h4>{administradorDesativado.nome}</h4>
                              <p>{administradorDesativado.email}</p>
                              <p>Perfil: Administrador</p>
                              <p>Status: Desativado</p>
                            </div>

                            <button
                              className="botao-editar-produto"
                              onClick={() =>
                                reativarAdministrador(administradorDesativado.id)
                              }
                            >
                              Reativar
                            </button>

                          </div>
                        ))}

                      </div>
                    )}
                  </div>
                )}

              </div>


            </div>
          )}

        </section>
      )}

    
    {paginaAtual === 'carrinho' && (
        <section className="carrinho">

          <button
            className="botao-voltar"
            onClick={() => setPaginaAtual('cardapio')}
          >
            ← Voltar ao cardápio
          </button>

          <h2>Meu carrinho</h2>

          {pedidoConfirmado && (
            <div className="confirmacao-pedido">
              <h3>Pedido realizado com sucesso!</h3>

              <p>
                Obrigado, {pedidoConfirmado.nome_cliente}!
              </p>

              <p>
                Número do pedido: <strong>{pedidoConfirmado.numero_pedido}</strong>
              </p>

              <p>
                Status: {pedidoConfirmado.status}
              </p>

              <p>
                Total: {Number(pedidoConfirmado.total).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
          )}

          {carrinho.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <div>
              {carrinho.map(item => (
                <div key={item.id}>
                  <h3>{item.nome}</h3>

                  <div className="controle-quantidade">
                    <button
                      onClick={() => alterarQuantidade(item.id, -1)}
                    >
                      −
                    </button>

                    <span>{item.quantidade}</span>

                    <button
                      onClick={() => alterarQuantidade(item.id, 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removerDoCarrinho(item.id)}
                  >
                    Remover
                  </button>

                  <p>
                    Preço unitário: {Number(item.preco).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>

                  <p>
                    Subtotal: {(Number(item.preco) * item.quantidade).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h3>
            Total: {valorTotal.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </h3>

          <div className="dados-cliente">
            <h3>Identificação do cliente</h3>

            <label>Nome:</label>
            <input
              type="text"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              placeholder="Digite seu nome"
            />

            <label>Número da mesa:</label>
            <input
              type="number"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              placeholder="Digite o número da mesa"
            />

            <label>Observações do pedido:</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: retirar algum ingrediente ou outra orientação"
            />
          </div>

          {erroPedido && (
            <p className="erro-pedido">
              {erroPedido}
            </p>
          )}

          {carrinho.length > 0 && (
            <button
              className="botao-finalizar"
              onClick={finalizarPedido}
              disabled={enviandoPedido}
            >
              {enviandoPedido ? 'Enviando pedido...' : 'Finalizar pedido'}
            </button>
          )}

        </section>
      )}
        
      {paginaAtual === 'cardapio' && (
        <main>
          <section>
            
          <h2>Nosso Cardápio</h2>
          <p>Conheça nossas delícias!</p>

          <nav className="categorias-nav">
            {categorias.map(categoria => (
              <a
                key={categoria.id}
                href={`#categoria-${categoria.id}`}
              >
                {categoria.nome}
              </a>
            ))}
          </nav>

          <div className="categorias">

              {categorias.map(categoria => (
                <div
                  key={categoria.id}
                  id={`categoria-${categoria.id}`}
                  className="categoria"
                >
                  <h3>{categoria.nome}</h3>
                  <p>{categoria.descricao}</p>

                  <div className="produtos">
                    {produtos
                      .filter(produto => produto.categoria_id === categoria.id)
                      .map(produto => (
                        <div key={produto.id} className="produto">
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="produto-imagem"
                          />
                          
                          <h4>{produto.nome}</h4>

                          <p>{produto.descricao}</p>

                          <p>
                            {produto.preco.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>

                          <button
                            className="botao-detalhes"
                            onClick={() => setProdutoSelecionado(produto)}
                          >
                            Ver detalhes
                          </button>

                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
      
      {produtoSelecionado && (
        <div className="modal-fundo">
          <div className="modal-produto">

            <button
              className="botao-fechar"
              onClick={() => setProdutoSelecionado(null)}
            >
              ×
            </button>

            <img
              src={produtoSelecionado.imagem_url}
              alt={produtoSelecionado.nome}
            />

            <div className="modal-conteudo">
              <h2>{produtoSelecionado.nome}</h2>

              <p>{produtoSelecionado.descricao}</p>

              <h3>Ingredientes</h3>
              <p>{produtoSelecionado.ingredientes}</p>

              <p className="modal-preco">
                {produtoSelecionado.preco.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
              <button
                className="botao-detalhes"
                onClick={() => adicionarAoCarrinho(produtoSelecionado)}
              >
                Adicionar ao carrinho
              </button>
            </div>

          </div>
        </div>
      )}


      <footer>
        <p>Todos os direitos reservados.</p>
      </footer>
    </>
  )
}

export default App
