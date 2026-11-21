
# Importa ferramentas para trabalhar com arquivos e variáveis de ambiente
import os
from pathlib import Path

# Importa ferramentas do SQLAlchemy
from sqlalchemy import create_engine, URL

# Importa a função para carregar as configurações do arquivo .env
from dotenv import load_dotenv


# Localiza o arquivo .env que está na pasta backend
caminho_env = Path(__file__).resolve().parent.parent / ".env"

# Carrega as variáveis de ambiente
load_dotenv(caminho_env)


# Obtém as informações de conexão
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


# Monta o endereço de conexão com o PostgreSQL
DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME
)


# Cria o mecanismo de conexão com o banco
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)
