from getpass import getpass
from passlib.context import CryptContext
from sqlalchemy import text
from database.connection import engine

contexto_senha = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

print("=== Cadastro do primeiro administrador ===")

nome = input("Nome: ").strip()
email = input("E-mail: ").strip().lower()

senha = getpass("Senha: ")
confirmacao_senha = getpass("Confirme a senha: ")

if not nome or not email:
    print("Nome e e-mail são obrigatórios.")
    exit()

if senha != confirmacao_senha:
    print("As senhas não coincidem.")
    exit()

if len(senha) < 8:
    print("A senha deve possuir pelo menos 8 caracteres.")
    exit()

senha_hash = contexto_senha.hash(senha)

try:
    with engine.begin() as conexao:

        conexao.execute(
            text("""
                INSERT INTO administradores (nome, email, senha_hash)
                VALUES (:nome, :email, :senha_hash);
            """),
            {
                "nome": nome,
                "email": email,
                "senha_hash": senha_hash
            }
        )

    print("Administrador cadastrado com sucesso!")

except Exception as erro:
    print("Erro ao cadastrar administrador:", erro)

