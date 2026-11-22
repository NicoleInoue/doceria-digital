# Doceria Digital

Sistema web para consulta de cardápio, realização de pedidos e gerenciamento administrativo de uma doceria.

## Tecnologias utilizadas

### Frontend
- React
- JavaScript
- Vite
- HTML e CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT para autenticação
- Passlib e bcrypt para hash de senhas

### Banco de dados
- PostgreSQL
- Psycopg

## Estrutura do projeto

```text
doceria-digital/
├── backend/
│   ├── database/
│   │   └── connection.py
│   ├── criar_admin.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── imagens/
│   ├── src/
│   │   └── assets/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── backup/
│   └── doceria_entrega.sql
├── .gitignore
└── README.md
```

## Pré-requisitos

Antes de executar o projeto, é necessário ter instalado:

- Python 3.13 ou versão compatível com as dependências.
- Node.js e npm.
- PostgreSQL.

## Configuração do banco de dados

### 1. Criar o banco

Após instalar e iniciar o PostgreSQL, abra o terminal e conecte-se ao servidor:

```powershell
psql -h localhost -p 5433 -U postgres -d postgres
```

Crie o banco de dados:

```sql
CREATE DATABASE doceria_db;
```

Saia do PostgreSQL:

```sql
\q
```

**Observação:** a porta `5433` corresponde à configuração utilizada durante o desenvolvimento. Caso o PostgreSQL esteja configurado em outra porta, substitua o número nos comandos e no arquivo `.env`.

### 2. Restaurar a estrutura e os dados

Na pasta principal do projeto, execute:

```powershell
psql -h localhost -p 5433 -U postgres -d doceria_db -v ON_ERROR_STOP=1 -f ".\backup\doceria_entrega.sql"
```

Esse procedimento restaura a estrutura das tabelas e os dados disponibilizados para a entrega, incluindo categorias e produtos.

O backup não contém registros de administradores, pedidos, itens de pedidos ou histórico de status. O primeiro administrador deverá ser cadastrado conforme as instruções deste README.

## Configuração das variáveis de ambiente

Dentro da pasta `backend`, existe o arquivo `.env.example`, que apresenta o modelo das variáveis necessárias.

Crie uma cópia desse arquivo com o nome `.env`:

```powershell
Copy-Item ".\.env.example" ".\.env"
```

Abra o arquivo `.env` e configure os dados de conexão com o PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=doceria_db
DB_USER=postgres
DB_PASSWORD=sua_senha

SECRET_KEY=sua_chave_secreta
```

Substitua os valores de exemplo pelos dados do ambiente local.

Para gerar uma chave secreta, pode ser utilizado:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copie o resultado para o campo `SECRET_KEY`.

**Importante:** não compartilhe o arquivo `.env` nem publique suas credenciais. Esse arquivo deve permanecer apenas no ambiente local.

## Instalação e execução do backend

Abra um terminal na pasta principal do projeto.

Entre na pasta do backend:

```powershell
cd backend
```

Crie o ambiente virtual:

```powershell
python -m venv venv
```

Ative o ambiente virtual:

```powershell
.\venv\Scripts\Activate.ps1
```

Instale as dependências:

```powershell
python -m pip install -r requirements.txt
```

### Cadastro do primeiro administrador

Após configurar o banco de dados e o arquivo `.env`, execute:

```powershell
python criar_admin.py
```

O programa solicitará:
- Nome do administrador.
- E-mail.
- Senha.
- Confirmação da senha.

A senha deve possuir pelo menos 8 caracteres. Ela será armazenada no banco de dados em formato de hash utilizando bcrypt.

Esse procedimento deve ser realizado para permitir o primeiro acesso à área administrativa.

### Iniciar a API

Ainda na pasta `backend`, execute:

```powershell
python -m uvicorn main:app --reload
```

O backend ficará disponível em:

http://127.0.0.1:8000

### Documentação da API

A documentação interativa do FastAPI pode ser acessada em:

http://127.0.0.1:8000/docs

## Instalação e execução do frontend

Abra um segundo terminal na pasta principal do projeto.

Entre na pasta do frontend:

```powershell
cd frontend
```

Instale as dependências utilizando o arquivo de versões travadas:

```powershell
npm.cmd ci
```

Inicie o servidor de desenvolvimento:

```powershell
npm.cmd run dev
```

O frontend ficará disponível, normalmente, em:

http://localhost:5173

**Importante:** o backend está configurado para permitir requisições da origem `http://localhost:5173`. Se essa porta estiver ocupada e o Vite iniciar em outra porta, as requisições podem ser bloqueadas pelo CORS. Nesse caso, encerre a outra instância do frontend ou ajuste a origem permitida no backend.

## Funcionalidades

- Consulta do cardápio por categorias.
- Visualização dos produtos e seus detalhes.
- Exibição de imagens ilustrativas dos produtos.
- Adição e gerenciamento de itens no carrinho.
- Finalização de pedidos.
- Geração de número de identificação do pedido.
- Autenticação de administradores.
- Controle de acesso conforme o perfil do administrador.
- Cadastro, edição, desativação e reativação de produtos.
- Consulta e filtragem de pedidos.
- Atualização do status dos pedidos.
- Registro do histórico de alterações de status.
- Atualização periódica das informações dos pedidos.

## Segurança

- Senhas de administradores armazenadas com hash bcrypt.
- Autenticação baseada em tokens JWT.
- Tokens com tempo de validade de 30 minutos.
- Rotas administrativas protegidas por autenticação e controle de permissões.
- Configurações sensíveis mantidas em variáveis de ambiente.

## Observações

- O frontend e o backend devem permanecer em execução em terminais separados durante o uso em ambiente de desenvolvimento.
- O banco de dados precisa ser restaurado antes da execução do sistema.
- O primeiro administrador deve ser cadastrado após a configuração do banco e das variáveis de ambiente.
- O arquivo `.env.example` é apenas um modelo. É necessário criar o arquivo `.env` no ambiente local.
