
# Importa o FastAPI
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

# Importa ferramentas do SQLAlchemy
from sqlalchemy import text

# Importa o mecanismo de conexão com o banco
from database.connection import engine

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from uuid import uuid4                #O uuid4() gera um identificador praticamente único
from fastapi import HTTPException, Depends, Query
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import re

# Chave secreta utilizada para assinar os tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY não foi configurada no arquivo .env."
    )

# Algoritmo utilizado para gerar e validar os tokens
ALGORITHM = "HS256"

# Tempo de validade do token: 30 minutos
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuração para verificar as senhas dos administradores
contexto_senha = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# Define o mecanismo de autenticação por token Bearer
oauth2_scheme = HTTPBearer(auto_error=False)

# Função responsável por gerar o token de autenticação
def criar_token_acesso(dados: dict):

    # Cria uma cópia dos dados que serão armazenados no token
    dados_token = dados.copy()

    # Define o horário de expiração do token
    expiracao = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    # Adiciona a data de expiração
    dados_token.update({
        "exp": expiracao
    })

    # Gera e retorna o token JWT
    token = jwt.encode(
        dados_token,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token

def obter_administrador_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
):

    if credenciais is None:
        raise HTTPException(
            status_code=401,
            detail="Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credenciais.credentials

    credenciais_invalidas = HTTPException(
        status_code=401,
        detail="Não foi possível validar as credenciais.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        # Decodifica e valida o token
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # Recupera o ID do administrador armazenado no token
        administrador_id = payload.get("sub")

        if not administrador_id or not str(administrador_id).isdigit():
            raise credenciais_invalidas

        administrador_id = int(administrador_id)

    except JWTError:
        raise credenciais_invalidas

    # Consulta o administrador no banco de dados
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT id, nome, email, ativo, perfil
                FROM administradores
                WHERE id = :id;
            """),
            {"id": administrador_id}
        )

        administrador = resultado.fetchone()

    # Verifica se o administrador existe e está ativo
    if administrador is None or not administrador.ativo:
        raise credenciais_invalidas

    return dict(administrador._mapping)

# Verifica se o administrador autenticado é o proprietário
def obter_proprietario_atual(
    administrador: dict = Depends(obter_administrador_atual)
):
    if administrador["perfil"] != "proprietario":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido somente ao proprietário."
        )

    return administrador


class ItemPedido(BaseModel):
    produto_id: int = Field(
        gt=0,
        description="Identificador do produto que será incluído no pedido."
    )
    quantidade: int = Field(
        gt=0,
        le=100,
        description="Quantidade de unidades do produto. Deve estar entre 1 e 100."
    )
    observacoes: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Observações específicas sobre o item."
    )


class Pedido(BaseModel):

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nome_cliente": "Maria",
                    "mesa": "5",
                    "observacoes": "Entregar o pedido na mesa.",
                    "itens": [
                        {
                            "produto_id": 1,
                            "quantidade": 2,
                            "observacoes": "Uma unidade sem embalagem."
                        },
                        {
                            "produto_id": 13,
                            "quantidade": 1,
                            "observacoes": None
                        }
                    ]
                }
            ]
        }
    }

    nome_cliente: str = Field(
        min_length=2,
        max_length=150,
        description="Nome do cliente responsável pelo pedido."
    )
    mesa: Optional[str] = Field(
        default=None,
        max_length=30,
        description="Identificação da mesa do cliente, quando aplicável."
    )
    observacoes: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Observações gerais sobre o pedido."
    )
    itens: List[ItemPedido] = Field(
        min_length=1,
        description="Lista de produtos incluídos no pedido. Deve conter pelo menos um item."
    )

# Modelo dos dados recebidos no login do administrador
class DadosLogin(BaseModel):
    email: str = Field(min_length=5, max_length=150)
    senha: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor):
        valor = valor.strip().lower()

        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", valor):
            raise ValueError("Informe um endereço de e-mail válido.")

        return valor

    @field_validator("senha")
    @classmethod
    def validar_tamanho_senha(cls, valor):
        if len(valor.encode("utf-8")) > 72:
            raise ValueError("A senha ultrapassa o limite permitido.")

        return valor

# Modelo dos dados recebidos no cadastro de produtos
class ProdutoCadastro(BaseModel):

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nome": "Bolo de pote de cenoura com brigadeiro",
                    "descricao": "Bolo de cenoura fofinho com cobertura de brigadeiro.",
                    "ingredientes": "Farinha de trigo, cenoura, ovos, chocolate e leite condensado.",
                    "preco": 14.90,
                    "imagem_url": "/imagens/bolo-pote-cenoura-brigadeiro.jpg",
                    "categoria_id": 1
                }
            ]
        }
    }
        
    nome: str = Field(
        min_length=2,
        max_length=150,
        description="Nome do produto."
    )
    descricao: str = Field(
        min_length=1,
        max_length=500,
        description="Descrição do produto apresentada no cardápio."
    )

    ingredientes: str = Field(
        min_length=1,
        max_length=1000,
        description="Lista ou descrição dos ingredientes do produto."
    )
    preco: Decimal = Field(
        gt=0,
        description="Preço unitário do produto. Deve ser maior que zero."
    )
    imagem_url: Optional[str] = Field(
        default=None,
        description="Caminho ou endereço da imagem do produto."
    )
    categoria_id: int = Field(
        gt=0,
        description="Identificador da categoria à qual o produto pertence."
    )

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor):
        valor = valor.strip()

        if len(valor) < 2:
            raise ValueError("O nome do produto deve possuir pelo menos 2 caracteres.")

        return valor



class ItemPedidoResposta(BaseModel):
    id: int
    produto_id: int
    nome_produto: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal
    observacoes: Optional[str]


class PedidoResposta(BaseModel):

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "numero": "PED-EXEMPLO123",
                    "nome_cliente": "Maria",
                    "mesa": "5",
                    "observacoes": "Entregar na mesa.",
                    "status": "Em preparo",
                    "total": 38.80,
                    "criado_em": "2026-11-14T14:30:00",
                    "itens": [
                        {
                            "id": 1,
                            "produto_id": 13,
                            "nome_produto": "Cookie recheado de Nutella",
                            "quantidade": 2,
                            "preco_unitario": 16.99,
                            "subtotal": 33.98,
                            "observacoes": None
                        },
                        {
                            "id": 2,
                            "produto_id": 24,
                            "nome_produto": "Beijinho",
                            "quantidade": 1,
                            "preco_unitario": 4.82,
                            "subtotal": 4.82,
                            "observacoes": "Sem embalagem"
                        }
                    ]
                }
            ]
        }
    }

    id: int
    numero: str
    nome_cliente: str
    mesa: Optional[str]
    observacoes: Optional[str]
    status: str
    total: Decimal
    criado_em: datetime
    itens: List[ItemPedidoResposta]

class ProdutoResposta(BaseModel):
    id: int
    nome: str
    descricao: str
    ingredientes: str
    preco: Decimal
    imagem_url: Optional[str]
    categoria_id: int

class CategoriaResposta(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]

class ItemPedidoCriadoResposta(BaseModel):
    produto_id: int
    nome_produto: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal
    observacoes: Optional[str]

class PedidoCriadoResposta(BaseModel):
    mensagem: str
    pedido_id: int
    numero_pedido: str
    nome_cliente: str
    status: str
    itens: List[ItemPedidoCriadoResposta]
    total: Decimal

class AdministradorLoginResposta(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str

class LoginResposta(BaseModel):
    access_token: str
    token_type: str
    administrador: AdministradorLoginResposta

class AdministradorResposta(BaseModel):
    id: int
    nome: str
    email: str
    ativo: bool
    perfil: str

# Dados recebidos para cadastrar um novo administrador
class AdministradorCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=150)
    senha: str = Field(min_length=8)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor):
        valor = valor.strip()

        if len(valor) < 2:
            raise ValueError("O nome deve possuir pelo menos 2 caracteres.")

        return valor

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor):
        valor = valor.strip().lower()

        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", valor):
            raise ValueError("Informe um endereço de e-mail válido.")

        return valor

    @field_validator("senha")
    @classmethod
    def validar_tamanho_senha(cls, valor):
        if len(valor.encode("utf-8")) > 72:
            raise ValueError("A senha ultrapassa o limite permitido pelo sistema.")

        return valor


# Dados retornados no gerenciamento de administradores
class AdministradorGerenciamentoResposta(BaseModel):
    id: int
    nome: str
    email: str
    ativo: bool
    perfil: str
    criado_em: datetime

class ProdutoOperacaoResposta(BaseModel):
    mensagem: str
    produto_id: int
    nome: str
    preco: Decimal
    categoria_id: int

class ProdutoDesativacaoResposta(BaseModel):
    mensagem: str
    produto_id: int

class StatusPedidoResposta(BaseModel):
    mensagem: str
    pedido_id: int
    status_anterior: Optional[str]
    novo_status: str

class InicioResposta(BaseModel):
    mensagem: str
    status: str

class AtualizacaoStatus(BaseModel):

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "novo_status": "Em preparo"
                }
            ]
        }
    }

    novo_status: Literal[
        "Recebido",
        "Em preparo",
        "Pronto",
        "Entregue"
    ] = Field(
        description="Novo status do pedido."
    )

# Cria a aplicação
app = FastAPI(
    title="API da Doceria",
    description="""
    API REST para gerenciamento da doceria.

    Permite:
    - Consultar categorias e produtos do cardápio.
    - Cadastrar, editar e desativar produtos.
    - Registrar e consultar pedidos.
    - Gerenciar o status dos pedidos.
    - Realizar autenticação de administradores.
    """,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rota inicial
@app.get(
    "/",
    response_model=InicioResposta,
    tags=["Geral"],
    summary="Verificar funcionamento da API",
    description="Retorna uma mensagem de boas-vindas e informa se a API da doceria está funcionando."
)
def inicio():
    return {
        "mensagem": "Bem-vindo à API da Doceria!",
        "status": "API funcionando"
    }


# Rota para realizar o login do administrador
@app.post(
    "/login",
    response_model=LoginResposta,
    tags=["Autenticação"],
    summary="Realizar login do administrador",
    description="Autentica o administrador por meio do e-mail e da senha. "
                "Em caso de sucesso, retorna um token JWT para acessar as rotas protegidas.",
    responses={
        401: {
            "description": "E-mail ou senha incorretos, ou administrador inativo."
        }
    }
)
def login(dados: DadosLogin):

    # Consulta o administrador pelo e-mail informado
    with engine.connect() as conexao:

        resultado = conexao.execute(
            text("""
                SELECT id, nome, email, senha_hash, ativo, perfil
                FROM administradores
                WHERE email = :email;
            """),
            {"email": dados.email.strip().lower()}
        )

        administrador = resultado.fetchone()

    # Verifica se o administrador existe e está ativo
    if administrador is None or not administrador.ativo:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha incorretos."
        )

    # Verifica se a senha informada corresponde ao hash armazenado
    senha_valida = contexto_senha.verify(
        dados.senha,
        administrador.senha_hash
    )

    if not senha_valida:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha incorretos."
        )

    # Cria o token com o identificador do administrador
    token = criar_token_acesso({
        "sub": str(administrador.id),
        "perfil": administrador.perfil
    })

    # Retorna o token e os dados básicos do administrador
    return {
        "access_token": token,
        "token_type": "bearer",
        "administrador": {
            "id": administrador.id,
            "nome": administrador.nome,
            "email": administrador.email,
            "perfil": administrador.perfil
        }
    }

@app.get(
    "/admin/me",
    response_model=AdministradorResposta,
    tags=["Autenticação"],
    summary="Consultar administrador autenticado",
    description="Retorna os dados do administrador associado ao token JWT. "
                "Requer autenticação por meio de um token Bearer válido.",
    responses={
        401: {
            "description": "Token ausente, inválido, expirado ou administrador inativo."
        }
    }
)
def consultar_administrador_atual(
    administrador: dict = Depends(obter_administrador_atual)
):
    return administrador

@app.post(
    "/admin/administradores",
    response_model=AdministradorGerenciamentoResposta,
    tags=["Administração de Administradores"],
    summary="Cadastrar administrador",
    description="Cadastra um novo administrador. Acesso exclusivo do proprietário."
)
def cadastrar_administrador(
    dados: AdministradorCadastro,
    proprietario: dict = Depends(obter_proprietario_atual)
):
    nome = dados.nome.strip()
    email = dados.email.strip().lower()

    if not nome or not email:
        raise HTTPException(
            status_code=400,
            detail="Nome e e-mail são obrigatórios."
        )

    senha_hash = contexto_senha.hash(dados.senha)

    try:
        with engine.begin() as conexao:
            resultado = conexao.execute(
                text("""
                    INSERT INTO administradores (
                        nome, email, senha_hash, perfil
                    )
                    VALUES (
                        :nome, :email, :senha_hash, 'administrador'
                    )
                    RETURNING id, nome, email, ativo, perfil, criado_em;
                """),
                {
                    "nome": nome,
                    "email": email,
                    "senha_hash": senha_hash
                }
            )

            administrador = resultado.mappings().one()

    except Exception as erro:
        if "administradores_email_key" in str(erro):
            raise HTTPException(
                status_code=409,
                detail="Já existe um administrador cadastrado com esse e-mail."
            )
        raise

    return dict(administrador)

@app.get(
    "/admin/administradores",
    response_model=List[AdministradorGerenciamentoResposta],
    tags=["Administração de Administradores"],
    summary="Listar administradores",
    description="Lista os administradores cadastrados. Acesso exclusivo do proprietário."
)
def listar_administradores(
    proprietario: dict = Depends(obter_proprietario_atual)
):
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT id, nome, email, ativo, perfil, criado_em
                FROM administradores
                ORDER BY id;
            """)
        )

        administradores = [
            dict(administrador._mapping)
            for administrador in resultado
        ]

    return administradores

@app.delete(
    "/admin/administradores/{administrador_id}",
    tags=["Administração de Administradores"],
    summary="Desativar administrador",
    description="Desativa um administrador comum. Acesso exclusivo do proprietário.",
    responses={
        400: {"description": "Não é permitido desativar a própria conta ou um proprietário."},
        403: {"description": "Acesso permitido somente ao proprietário."},
        404: {"description": "Administrador não encontrado ou já desativado."}
    }
)
def desativar_administrador(
    administrador_id: int,
    proprietario: dict = Depends(obter_proprietario_atual)
):
    if administrador_id == proprietario["id"]:
        raise HTTPException(
            status_code=400,
            detail="Não é permitido desativar a própria conta."
        )

    with engine.begin() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT id, perfil, ativo
                FROM administradores
                WHERE id = :id
                FOR UPDATE;
            """),
            {"id": administrador_id}
        )

        administrador = resultado.fetchone()

        if administrador is None or not administrador.ativo:
            raise HTTPException(
                status_code=404,
                detail="Administrador não encontrado ou já desativado."
            )

        if administrador.perfil == "proprietario":
            raise HTTPException(
                status_code=400,
                detail="Não é permitido desativar uma conta proprietária."
            )

        conexao.execute(
            text("""
                UPDATE administradores
                SET ativo = FALSE
                WHERE id = :id;
            """),
            {"id": administrador_id}
        )

    return {
        "mensagem": "Administrador desativado com sucesso!",
        "administrador_id": administrador_id
    }


# Rota para reativar administradores (somente proprietário)
@app.put(
    "/admin/administradores/{administrador_id}/reativar",
    tags=["Administração de Administradores"],
    summary="Reativar administrador",
    description="Reativa um administrador anteriormente desativado. "
                "Acesso exclusivo do proprietário.",
    responses={
        400: {
            "description": "O administrador já está ativo ou possui perfil de proprietário."
        },
        403: {
            "description": "Acesso permitido somente ao proprietário."
        },
        404: {
            "description": "Administrador não encontrado."
        }
    }
)
def reativar_administrador(
    administrador_id: int,
    proprietario: dict = Depends(obter_proprietario_atual)
):

    with engine.begin() as conexao:

        # Verifica se o administrador existe e bloqueia sua linha
        resultado = conexao.execute(
            text("""
                SELECT id, perfil, ativo
                FROM administradores
                WHERE id = :id
                FOR UPDATE;
            """),
            {"id": administrador_id}
        )

        administrador = resultado.fetchone()

        if administrador is None:
            raise HTTPException(
                status_code=404,
                detail="Administrador não encontrado."
            )

        if administrador.perfil == "proprietario":
            raise HTTPException(
                status_code=400,
                detail="Não é permitido reativar uma conta proprietária por esta rota."
            )

        if administrador.ativo:
            raise HTTPException(
                status_code=400,
                detail="O administrador já está ativo."
            )

        # Reativa o administrador no banco de dados
        conexao.execute(
            text("""
                UPDATE administradores
                SET ativo = TRUE
                WHERE id = :id;
            """),
            {"id": administrador_id}
        )

    return {
        "mensagem": "Administrador reativado com sucesso!",
        "administrador_id": administrador_id
    }


# Rota para cadastrar novos produtos (somente administradores)
@app.post(
    "/admin/produtos",
    response_model=ProdutoOperacaoResposta,
    tags=["Administração de Produtos"],
    summary="Cadastrar produto",
    description="Cadastra um novo produto no cardápio. "
                "É necessário informar nome, descrição, ingredientes, preço e categoria. "
                "Requer autenticação de administrador.",
    responses={
        401: {
            "description": "Administrador não autenticado ou token inválido."
        },
        404: {
            "description": "Categoria informada não encontrada."
        }
    }
)
def cadastrar_produto(
    produto: ProdutoCadastro,
    administrador: dict = Depends(obter_administrador_atual)
):

    # Abre uma transação com o banco de dados
    with engine.begin() as conexao:

        # Verifica se a categoria informada existe
        resultado_categoria = conexao.execute(
            text("""
                SELECT id
                FROM categorias
                WHERE id = :categoria_id;
            """),
            {"categoria_id": produto.categoria_id}
        )

        categoria = resultado_categoria.fetchone()

        if categoria is None:
            raise HTTPException(
                status_code=404,
                detail="Categoria não encontrada."
            )

        # Insere o novo produto no banco de dados
        resultado = conexao.execute(
            text("""
                INSERT INTO produtos (
                    nome,
                    descricao,
                    ingredientes,
                    preco,
                    imagem_url,
                    categoria_id
                )
                VALUES (
                    :nome,
                    :descricao,
                    :ingredientes,
                    :preco,
                    :imagem_url,
                    :categoria_id
                )
                RETURNING id;
            """),
            {
                "nome": produto.nome,
                "descricao": produto.descricao,
                "ingredientes": produto.ingredientes,
                "preco": produto.preco,
                "imagem_url": produto.imagem_url,
                "categoria_id": produto.categoria_id
            }
        )

        produto_id = resultado.scalar_one()

    # Retorna a confirmação do cadastro
    return {
        "mensagem": "Produto cadastrado com sucesso!",
        "produto_id": produto_id,
        "nome": produto.nome,
        "preco": produto.preco,
        "categoria_id": produto.categoria_id
    }

# Rota para editar produtos existentes (somente administradores)
@app.put(
    "/admin/produtos/{produto_id}",
    response_model=ProdutoOperacaoResposta,
    tags=["Administração de Produtos"],
    summary="Editar produto",
    description="Atualiza os dados de um produto existente no cardápio. "
                "É necessário informar o ID do produto e os novos dados, "
                "incluindo nome, descrição, ingredientes, preço e categoria. "
                "Requer autenticação de administrador.",
    responses={
        401: {
            "description": "Administrador não autenticado ou token inválido."
        },
        404: {
            "description": "Produto ou categoria não encontrada."
        }
    }
)
def editar_produto(
    produto_id: int,
    produto: ProdutoCadastro,
    administrador: dict = Depends(obter_administrador_atual)
):

    # Abre uma transação com o banco de dados
    with engine.begin() as conexao:

        # Verifica se o produto existe
        resultado_produto = conexao.execute(
            text("""
                SELECT id
                FROM produtos
                WHERE id = :produto_id;
            """),
            {"produto_id": produto_id}
        )

        produto_existente = resultado_produto.fetchone()

        if produto_existente is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        # Verifica se a categoria informada existe
        resultado_categoria = conexao.execute(
            text("""
                SELECT id
                FROM categorias
                WHERE id = :categoria_id;
            """),
            {"categoria_id": produto.categoria_id}
        )

        categoria = resultado_categoria.fetchone()

        if categoria is None:
            raise HTTPException(
                status_code=404,
                detail="Categoria não encontrada."
            )

        # Atualiza os dados do produto
        conexao.execute(
            text("""
                UPDATE produtos
                SET
                    nome = :nome,
                    descricao = :descricao,
                    ingredientes = :ingredientes,
                    preco = :preco,
                    imagem_url = :imagem_url,
                    categoria_id = :categoria_id
                WHERE id = :produto_id;
            """),
            {
                "produto_id": produto_id,
                "nome": produto.nome,
                "descricao": produto.descricao,
                "ingredientes": produto.ingredientes,
                "preco": produto.preco,
                "imagem_url": produto.imagem_url,
                "categoria_id": produto.categoria_id
            }
        )

    return {
        "mensagem": "Produto atualizado com sucesso!",
        "produto_id": produto_id,
        "nome": produto.nome,
        "preco": produto.preco,
        "categoria_id": produto.categoria_id
    }

# Rota para desativar produtos (somente administradores)
@app.delete(
    "/admin/produtos/{produto_id}",
    response_model=ProdutoDesativacaoResposta,
    tags=["Administração de Produtos"],
    summary="Desativar produto",
    description="Desativa um produto do cardápio utilizando seu ID. "
                "O registro permanece salvo no banco de dados, mas deixa de "
                "aparecer no cardápio dos clientes. "
                "Requer autenticação de administrador.",
    responses={
        400: {
            "description": "O produto já está desativado."
        },
        401: {
            "description": "Administrador não autenticado ou token inválido."
        },
        404: {
            "description": "Produto não encontrado."
        }
    }
)
def desativar_produto(
    produto_id: int,
    administrador: dict = Depends(obter_administrador_atual)
):

    # Abre uma transação com o banco de dados
    with engine.begin() as conexao:

        # Verifica se o produto existe
        resultado = conexao.execute(
            text("""
                SELECT id, ativo
                FROM produtos
                WHERE id = :produto_id;
            """),
            {"produto_id": produto_id}
        )

        produto = resultado.fetchone()

        if produto is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        if not produto.ativo:
            raise HTTPException(
                status_code=400,
                detail="O produto já está desativado."
            )

        # Desativa o produto sem apagar seu registro
        conexao.execute(
            text("""
                UPDATE produtos
                SET ativo = FALSE
                WHERE id = :produto_id;
            """),
            {"produto_id": produto_id}
        )

    return {
        "mensagem": "Produto desativado com sucesso!",
        "produto_id": produto_id
    }

# Rota para listar produtos desativados (somente administradores)
@app.get(
    "/admin/produtos/desativados",
    response_model=List[ProdutoResposta],
    tags=["Administração de Produtos"],
    summary="Listar produtos desativados",
    description="Retorna os produtos que foram desativados do cardápio. "
                "Os registros permanecem salvos no banco de dados e podem "
                "ser reativados posteriormente. "
                "Requer autenticação de administrador."
)
def listar_produtos_desativados(
    administrador: dict = Depends(obter_administrador_atual)
):

    with engine.connect() as conexao:

        resultado = conexao.execute(
            text("""
                SELECT
                    id,
                    nome,
                    descricao,
                    ingredientes,
                    preco,
                    imagem_url,
                    categoria_id
                FROM produtos
                WHERE ativo = FALSE
                ORDER BY nome;
            """)
        )

        produtos = [
            dict(produto._mapping)
            for produto in resultado
        ]

    return produtos

@app.get(
    "/admin/pedidos",
    tags=["Pedidos"],
    response_model=List[PedidoResposta],
    summary="Listar pedidos",
    description="Retorna os pedidos registrados no sistema, incluindo os dados "
                "dos clientes, os itens, as quantidades, os valores e o status. "
                "Permite filtrar os pedidos pelo status. "
                "Requer autenticação de administrador.",
    responses={
        401: {
            "description": "Administrador não autenticado ou token inválido."
        }
    }
)
def listar_pedidos(
    status: Optional[Literal[
        "Recebido",
        "Em preparo",
        "Pronto",
        "Entregue"
    ]] = Query(
        default=None,
        description="Filtra os pedidos pelo status informado."
    ),
    administrador: dict = Depends(obter_administrador_atual)
):
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT
                    p.id AS pedido_id,
                    p.numero,
                    p.nome_cliente,
                    p.mesa,
                    p.observacoes,
                    p.status,
                    p.total,
                    p.criado_em,

                    ip.id AS item_id,
                    ip.produto_id,
                    ip.nome_produto,
                    ip.quantidade,
                    ip.preco_unitario,
                    ip.subtotal,
                    ip.observacoes AS observacoes_item

                FROM pedidos p

                LEFT JOIN itens_pedido ip
                    ON p.id = ip.pedido_id

                WHERE (CAST(:status AS VARCHAR) IS NULL
                    OR p.status = CAST(:status AS VARCHAR))

                ORDER BY p.criado_em DESC, p.id DESC;
            """),
            {"status": status}
        )

        linhas = resultado.mappings().all()

    pedidos = {}

    for linha in linhas:
        pedido_id = linha["pedido_id"]

        if pedido_id not in pedidos:
            pedidos[pedido_id] = {
                "id": pedido_id,
                "numero": linha["numero"],
                "nome_cliente": linha["nome_cliente"],
                "mesa": linha["mesa"],
                "observacoes": linha["observacoes"],
                "status": linha["status"],
                "total": linha["total"],
                "criado_em": linha["criado_em"],
                "itens": []
            }

        if linha["item_id"] is not None:
            pedidos[pedido_id]["itens"].append({
                "id": linha["item_id"],
                "produto_id": linha["produto_id"],
                "nome_produto": linha["nome_produto"],
                "quantidade": linha["quantidade"],
                "preco_unitario": linha["preco_unitario"],
                "subtotal": linha["subtotal"],
                "observacoes": linha["observacoes_item"]
            })

    return list(pedidos.values())

# Rota para reativar produtos (somente administradores)
@app.put(
    "/admin/produtos/{produto_id}/reativar",
    tags=["Administração de Produtos"],
    summary="Reativar produto",
    description="Reativa um produto anteriormente desativado, "
                "permitindo que ele volte a aparecer no cardápio. "
                "Requer autenticação de administrador.",
    responses={
        400: {
            "description": "O produto já está ativo."
        },
        401: {
            "description": "Administrador não autenticado ou token inválido."
        },
        404: {
            "description": "Produto não encontrado."
        }
    }
)
def reativar_produto(
    produto_id: int,
    administrador: dict = Depends(obter_administrador_atual)
):

    with engine.begin() as conexao:

        # Verifica se o produto existe e bloqueia sua linha
        resultado = conexao.execute(
            text("""
                SELECT id, ativo
                FROM produtos
                WHERE id = :produto_id
                FOR UPDATE;
            """),
            {"produto_id": produto_id}
        )

        produto = resultado.fetchone()

        if produto is None:
            raise HTTPException(
                status_code=404,
                detail="Produto não encontrado."
            )

        if produto.ativo:
            raise HTTPException(
                status_code=400,
                detail="O produto já está ativo."
            )

        # Reativa o produto no banco de dados
        conexao.execute(
            text("""
                UPDATE produtos
                SET ativo = TRUE
                WHERE id = :produto_id;
            """),
            {"produto_id": produto_id}
        )

    return {
        "mensagem": "Produto reativado com sucesso!",
        "produto_id": produto_id
    }


@app.put(
    "/admin/pedidos/{pedido_id}/status",
    response_model=StatusPedidoResposta,
    tags=["Pedidos"],
    summary="Atualizar status do pedido",
    description="Atualiza o status de um pedido para Recebido, Em preparo, "
                "Pronto ou Entregue. A alteração também é registrada no "
                "histórico de status, identificando o administrador responsável. "
                "Requer autenticação de administrador.",
    responses={
        400: {
            "description": "Status inválido ou pedido já possui esse status."
        },
        401: {
            "description": "Administrador não autenticado ou token inválido."
        },
        404: {
            "description": "Pedido não encontrado."
        }
    }
)
def atualizar_status_pedido(
    pedido_id: int,
    dados: AtualizacaoStatus,
    administrador: dict = Depends(obter_administrador_atual)
):
    # Lista de status permitidos
    status_validos = [
        "Recebido",
        "Em preparo",
        "Pronto",
        "Entregue"
    ]

    # Verifica se o novo status é válido
    if dados.novo_status not in status_validos:
        raise HTTPException(
            status_code=400,
            detail="Status inválido."
        )

    with engine.begin() as conexao:

        # Busca o pedido e bloqueia sua linha durante a transação
        resultado = conexao.execute(
            text("""
                SELECT id, status
                FROM pedidos
                WHERE id = :pedido_id
                FOR UPDATE;
            """),
            {"pedido_id": pedido_id}
        )

        pedido = resultado.fetchone()

        # Verifica se o pedido existe
        if pedido is None:
            raise HTTPException(
                status_code=404,
                detail="Pedido não encontrado."
            )

        status_anterior = pedido.status

        # Evita registrar uma alteração desnecessária
        if status_anterior == dados.novo_status:
            raise HTTPException(
                status_code=400,
                detail="O pedido já possui esse status."
            )

        # Atualiza o status atual do pedido
        conexao.execute(
            text("""
                UPDATE pedidos
                SET status = :novo_status
                WHERE id = :pedido_id;
            """),
            {
                "novo_status": dados.novo_status,
                "pedido_id": pedido_id
            }
        )

        # Registra a alteração no histórico
        conexao.execute(
            text("""
                INSERT INTO historico_status (
                    pedido_id,
                    administrador_id,
                    status_anterior,
                    novo_status
                )
                VALUES (
                    :pedido_id,
                    :administrador_id,
                    :status_anterior,
                    :novo_status
                );
            """),
            {
                "pedido_id": pedido_id,
                "administrador_id": administrador["id"],
                "status_anterior": status_anterior,
                "novo_status": dados.novo_status
            }
        )

    return {
        "mensagem": "Status do pedido atualizado com sucesso!",
        "pedido_id": pedido_id,
        "status_anterior": status_anterior,
        "novo_status": dados.novo_status
    }



@app.get(
    "/teste-acentos",
    tags=["Testes"],
    summary="Testar caracteres especiais",
    description="Retorna um texto contendo caracteres especiais e acentuação "
                "da língua portuguesa para verificar a codificação das respostas da API."
)
def teste_acentos():
    return {
        "texto": "clássicos, pavês, ocasiões, à base de cookie"
    }

# Rota para consultar os produtos
@app.get(
    "/produtos",
    response_model=List[ProdutoResposta],
    tags=["Cardápio"],
    summary="Listar produtos disponíveis",
    description="Retorna os produtos ativos do cardápio, incluindo nome, "
                "descrição, ingredientes, preço, imagem e categoria. "
                "Os produtos são obtidos diretamente do banco de dados."
)
def listar_produtos():

    # Abre uma conexão com o banco de dados
    with engine.connect() as conexao:

        # Executa a consulta SQL
        resultado = conexao.execute(
            text("""
                SELECT
                    id,
                    nome,
                    descricao,
                    ingredientes,
                    preco,
                    imagem_url,
                    categoria_id
                FROM produtos
                WHERE ativo = TRUE
                ORDER BY nome;
            """)
        )

        # Converte os registros em uma lista de dicionários
        produtos = [
            dict(produto._mapping)
            for produto in resultado
        ]

    # Retorna os produtos em formato JSON
    return produtos

@app.get(
    "/categorias",
    response_model=List[CategoriaResposta],
    tags=["Cardápio"],
    summary="Listar categorias do cardápio",
    description="Retorna as categorias cadastradas no banco de dados, "
                "incluindo o nome e a descrição de cada categoria."
)
def listar_categorias():
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT
                    id,
                    nome,
                    descricao
                FROM categorias
                ORDER BY nome;
            """)
        )

        categorias = [
            dict(categoria._mapping)
            for categoria in resultado
        ]

    return categorias

@app.post(
    "/pedidos",
    response_model=PedidoCriadoResposta,
    tags=["Pedidos"],
    summary="Criar pedido",
    description="Registra um novo pedido no sistema. Recebe o nome do cliente, "
                "a mesa, as observações e os produtos com suas respectivas "
                "quantidades. O sistema calcula os valores e o total do pedido, "
                "gera um número de identificação e registra o status inicial "
                "como Recebido.",
    responses={
        404: {
            "description": "Um dos produtos informados não foi encontrado ou está inativo."
        }
    }
)
def criar_pedido(pedido: Pedido):

    total = Decimal("0.00")
    itens_calculados = []
    numero_pedido = f"PED-{uuid4().hex.upper()}"

    with engine.begin() as conexao:

        for item in pedido.itens:

            resultado = conexao.execute(
                text("""
                    SELECT id, nome, preco
                    FROM produtos
                    WHERE id = :produto_id
                      AND ativo = TRUE;
                """),
                {"produto_id": item.produto_id}
            )

            produto = resultado.fetchone()

            if produto is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produto com ID {item.produto_id} não encontrado ou inativo."
                )

            preco_unitario = Decimal(str(produto.preco))
            subtotal = preco_unitario * item.quantidade

            total += subtotal

            itens_calculados.append({
                "produto_id": produto.id,
                "nome_produto": produto.nome,
                "quantidade": item.quantidade,
                "preco_unitario": preco_unitario,
                "subtotal": subtotal,
                "observacoes": item.observacoes
            })

        resultado_pedido = conexao.execute(
            text("""
                INSERT INTO pedidos (
                    numero,
                    nome_cliente,
                    mesa,
                    observacoes,
                    total
                )
                VALUES (
                    :numero,
                    :nome_cliente,
                    :mesa,
                    :observacoes,
                    :total
                )
                RETURNING id;
            """),
            {
                "numero": numero_pedido,
                "nome_cliente": pedido.nome_cliente,
                "mesa": pedido.mesa,
                "observacoes": pedido.observacoes,
                "total": total
            }
        )

        pedido_id = resultado_pedido.scalar_one()
        for item_calculado in itens_calculados:

            conexao.execute(
                text("""
                    INSERT INTO itens_pedido (
                        pedido_id,
                        produto_id,
                        nome_produto,
                        quantidade,
                        preco_unitario,
                        subtotal,
                        observacoes
                    )
                    VALUES (
                        :pedido_id,
                        :produto_id,
                        :nome_produto,
                        :quantidade,
                        :preco_unitario,
                        :subtotal,
                        :observacoes
                    );
                """),
                {
                    "pedido_id": pedido_id,
                    "produto_id": item_calculado["produto_id"],
                    "nome_produto": item_calculado["nome_produto"],
                    "quantidade": item_calculado["quantidade"],
                    "preco_unitario": item_calculado["preco_unitario"],
                    "subtotal": item_calculado["subtotal"],
                    "observacoes": item_calculado["observacoes"]
                }
            )

        conexao.execute(
            text("""
                INSERT INTO historico_status (
                    pedido_id,
                    status_anterior,
                    novo_status
                )
                VALUES (
                    :pedido_id,
                    NULL,
                    'Recebido'
                );
            """),
            {
                "pedido_id": pedido_id
            }
        )

    return {
        "mensagem": "Pedido realizado com sucesso!",
        "pedido_id": pedido_id,
        "numero_pedido": numero_pedido,
        "nome_cliente": pedido.nome_cliente,
        "status": "Recebido",
        "itens": itens_calculados,
        "total": total
    }

@app.get(
    "/teste-categoria",
    tags=["Testes"],
    summary="Testar consulta de categoria",
    description="Realiza uma consulta de teste ao banco de dados e retorna "
                "o nome e a descrição de uma categoria."
)
def teste_categoria():
    with engine.connect() as conexao:
        resultado = conexao.execute(
            text("""
                SELECT nome, descricao
                FROM categorias
                WHERE id = 6;
            """)
        )

        categoria = resultado.fetchone()

    return dict(categoria._mapping)