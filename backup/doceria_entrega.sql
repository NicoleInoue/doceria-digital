--
-- PostgreSQL database dump
--

\restrict ejLqXhZxzuTQwBckT8DbcPKmfSJZd7kXkUZDrcNgW5rcjzCm0zPu8ezDgj6Uhiz

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administradores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.administradores (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    senha_hash text NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    perfil character varying(20) DEFAULT 'administrador'::character varying NOT NULL,
    CONSTRAINT administradores_perfil_check CHECK (((perfil)::text = ANY ((ARRAY['proprietario'::character varying, 'administrador'::character varying])::text[])))
);


ALTER TABLE public.administradores OWNER TO postgres;

--
-- Name: administradores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.administradores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.administradores_id_seq OWNER TO postgres;

--
-- Name: administradores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.administradores_id_seq OWNED BY public.administradores.id;


--
-- Name: backup_produtos_textos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_produtos_textos (
    id integer,
    nome character varying(150),
    descricao text,
    ingredientes text,
    preco numeric(10,2),
    imagem_url text,
    categoria_id integer,
    ativo boolean
);


ALTER TABLE public.backup_produtos_textos OWNER TO postgres;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: historico_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico_status (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    administrador_id integer,
    status_anterior character varying(30),
    novo_status character varying(30) NOT NULL,
    alterado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT novo_status_valido CHECK (((novo_status)::text = ANY ((ARRAY['Recebido'::character varying, 'Em preparo'::character varying, 'Pronto'::character varying, 'Entregue'::character varying])::text[]))),
    CONSTRAINT status_anterior_valido CHECK (((status_anterior IS NULL) OR ((status_anterior)::text = ANY ((ARRAY['Recebido'::character varying, 'Em preparo'::character varying, 'Pronto'::character varying, 'Entregue'::character varying])::text[]))))
);


ALTER TABLE public.historico_status OWNER TO postgres;

--
-- Name: historico_status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historico_status_id_seq OWNER TO postgres;

--
-- Name: historico_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_status_id_seq OWNED BY public.historico_status.id;


--
-- Name: itens_pedido; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.itens_pedido (
    id integer NOT NULL,
    pedido_id integer NOT NULL,
    produto_id integer,
    nome_produto character varying(150) NOT NULL,
    quantidade integer NOT NULL,
    preco_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    observacoes text,
    CONSTRAINT preco_positivo CHECK ((preco_unitario >= (0)::numeric)),
    CONSTRAINT quantidade_positiva CHECK ((quantidade > 0)),
    CONSTRAINT subtotal_positivo CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.itens_pedido OWNER TO postgres;

--
-- Name: itens_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.itens_pedido_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.itens_pedido_id_seq OWNER TO postgres;

--
-- Name: itens_pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.itens_pedido_id_seq OWNED BY public.itens_pedido.id;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    numero character varying(40) NOT NULL,
    nome_cliente character varying(150) NOT NULL,
    mesa character varying(30),
    observacoes text,
    status character varying(30) DEFAULT 'Recebido'::character varying,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT status_valido CHECK (((status)::text = ANY ((ARRAY['Recebido'::character varying, 'Em preparo'::character varying, 'Pronto'::character varying, 'Entregue'::character varying])::text[])))
);


ALTER TABLE public.pedidos OWNER TO postgres;

--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pedidos_id_seq OWNER TO postgres;

--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: produtos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produtos (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    descricao text,
    ingredientes text,
    preco numeric(10,2) NOT NULL,
    imagem_url text,
    categoria_id integer,
    ativo boolean DEFAULT true
);


ALTER TABLE public.produtos OWNER TO postgres;

--
-- Name: produtos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.produtos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.produtos_id_seq OWNER TO postgres;

--
-- Name: produtos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produtos_id_seq OWNED BY public.produtos.id;


--
-- Name: administradores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administradores ALTER COLUMN id SET DEFAULT nextval('public.administradores_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: historico_status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status ALTER COLUMN id SET DEFAULT nextval('public.historico_status_id_seq'::regclass);


--
-- Name: itens_pedido id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itens_pedido ALTER COLUMN id SET DEFAULT nextval('public.itens_pedido_id_seq'::regclass);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Name: produtos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos ALTER COLUMN id SET DEFAULT nextval('public.produtos_id_seq'::regclass);


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nome, descricao) FROM stdin;
1	Bolos de pote	Bolos em camadas com recheios e coberturas especiais.
2	Bombons	Bombons artesanais com diferentes recheios e sabores.
4	Mousses e sobremesas	Sobremesas cremosas e doces especiais.
6	Docinhos tradicionais	Docinhos clássicos preparados artesanalmente.
3	Cookies e tortas de cookie	Cookies tradicionais, recheados e tortas à base de cookie.
5	Tortas e pavês	Tortas e sobremesas em camadas para diferentes ocasiões.
7	Bebidas	Cafés, bebidas quentes e bebidas geladas.
\.


--
-- Data for Name: produtos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.produtos (id, nome, descricao, ingredientes, preco, imagem_url, categoria_id, ativo) FROM stdin;
1	Bolo de pote de cenoura com brigadeiro	Bolo de cenoura macio acompanhado de uma deliciosa camada de brigadeiro.	Ingredientes: cenoura, farinha de trigo, ovos, açúcar, óleo, fermento em pó, leite condensado, creme de leite, chocolate em pó 50%, 70% ou 100% cacau e chocolate.	25.90	/imagens/bolo-pote-cenoura-brigadeiro.jpg	1	t
2	Bolo de pote de ninho com morango	Bolo em camadas com creme de leite em pó e morangos.	Ingredientes: farinha de trigo, ovos, leite, açúcar, fermento em pó, leite em pó, leite condensado, creme de leite e morangos.	33.90	/imagens/bolo-pote-ninho-morango.jpg	1	t
3	Bolo de pote de brigadeiro	Bolo macio com camadas generosas de brigadeiro.	Ingredientes: farinha de trigo, ovos, chocolate em pó, açúcar, fermento em pó, leite, chocolate, leite condensado e creme de leite	30.99	/imagens/bolo-pote-brigadeiro.jpg	1	t
5	Bombom de mousse de morango	Bombom com recheio cremoso de mousse de morango.	Ingredientes: chocolate, tang de morango, leite condensado e creme de leite.	4.50	/imagens/bombom-mousse-morango.jpg	2	t
24	Beijinho	Doce tradicional de coco, com sabor delicado e textura macia.	Ingredientes: leite condensado, coco ralado.	10.90	/imagens/beijinho.jpg	6	t
7	Bombom de mousse de limão	Bombom recheado com mousse de limão, combinando cremosidade e sabor cítrico.	Ingredientes: chocolate, suco de limão e/ou tang de limão, leite condensado e creme de leite.	4.50	/imagens/bombom-mousse-limao.jpg	2	t
4	Bombom de morango	Bombom recheado com morango e envolvido em uma deliciosa camada de chocolate.	Ingredientes: morango, chocolate, leite condensado, leite em pó e creme de leite.	18.99	/imagens/bombom-morango.jpg	2	t
8	Bombom de brigadeiro branco	Bombom com recheio cremoso de brigadeiro branco.	Ingredientes: chocolate, leite condensado, creme de leite e leite em pó.	14.50	/imagens/bombom-brigadeiro-branco.jpg	2	t
9	Bombom de brigadeiro	Bombom recheado com brigadeiro tradicional de chocolate.	Ingredientes: chocolate, leite condensado, creme de leite, chocolate em pó 50%, 70% ou 100% cacau e chocolate.	14.50	/imagens/brigadeiro.jpg	2	t
10	Bombom de Nutella	Bombom com recheio cremoso de brigadeiro branco com Nutella.	Ingredientes: chocolate, leite condensado, creme de leite, leite em pó e creme de avelã Nutella.	15.99	/imagens/bombom-nutella.jpg	2	t
11	Bombom de uva	Bombom que combina uvas frescas com recheio cremoso de brigadeiro branco e cobertura de chocolate.	Ingredientes: uvas, chocolate, leite condensado, leite em pó e creme de leite.	14.99	/imagens/bombom-uva.jpg	2	t
12	Cookie Normal	Cookie tradicional, com textura macia por dentro e levemente crocante por fora.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos e chocolate.	9.00	/imagens/cookie-normal.jpg	3	t
13	Cookie recheado de Nutella	Cookie artesanal com recheio cremoso de Nutella.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos, chocolate e Nutella.	16.99	/imagens/cookie-nutella.jpg	3	t
15	Torta de cookie com recheio de doce de leite	Torta de cookie com um delicioso recheio de doce de leite.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos, chocolate e doce de leite.	26.90	/imagens/torta-cookie-doce-leite.jpg	3	t
17	Mousse de limão coberto de chocolate	Mousse cremoso de limão com uma cobertura especial de chocolate.	Ingredientes: limão, leite condensado, creme de leite e chocolate.	16.50	/imagens/mousse-limao-chocolate.jpg	4	t
20	Torta de limão	Torta com base crocante e recheio cremoso de limão.	Ingredientes: limão, leite condensado, creme de leite, manteiga e bolacha maisena.	20.90	/imagens/torta-limao.jpg	5	t
6	Bombom de mousse de maracujá	Bombom com recheio suave e cremoso de mousse de maracujá .	Ingredientes: chocolate, tang de maracujá , leite condensado e creme de leite.	4.50	/imagens/bombom-mousse-maracuja.jpg	2	t
14	Torta de cookie com recheio de brigadeiro	Torta à base de cookie com recheio de brigadeiro cremoso.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos e chocolate e brigadeiro (leite condensado, creme de leite, chocolate em pó 50%, 70% ou 100% cacau e chocolate).	26.90	/imagens/torta-cookie-brigadeiro.jpg	3	t
16	Torta de cookie recheada com Nutella	Torta de cookie com recheio generoso de creme de avelã Nutella.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos, chocolate e Nutella.	28.90	/imagens/torta-cookie-nutella.jpg	3	t
18	Bombom de uva na travessa 1L	Sobremesa na travessa de 1 litro, combinando uvas e cremes com cobertura de chocolate.	Ingredientes: uvas, leite condensado, leite em pó, creme de leite e chocolate.	75.00	/imagens/bombom-uva-travessa.jpg	4	t
19	Gelado de Abacaxi	Sobremesa gelada de abacaxi, refrescante e cremosa.	Ingredientes: abacaxi, leite condensado, creme de leite, chocolate branco, açúcar cristal.	40.00	/imagens/gelado-abacaxi.jpg	4	t
22	Brigadeiro	Doce tradicional de chocolate, preparado com uma textura cremosa.	Ingredientes: leite condensado, creme de leite, chocolate em pó 50%, 70% ou 100% cacau e chocolate e granulado.	12.90	/imagens/brigadeiro-extra.jpg	6	t
23	Brigadeiro Branco	Doce tradicional com sabor suave de chocolate branco.	Ingredientes: leite condensado, leite em pó e creme de leite.	12.90	/imagens/brigadeiro-branco-extra.jpg	6	t
21	Pavê	Sobremesa em camadas, com creme e biscoitos.	Ingredientes: bolacha maizena, leite, leite condensado, creme de leite, leite em pó e chocolate.	20.90	/imagens/pave.jpg	5	t
32	Chá (sachê ou infusão)	Bebida quente preparada por infusão.	Ingredientes variáveis conforme o chá escolhido	8.50	/imagens/cha.jpg	7	t
33	Água mineral sem gás	Água mineral servida gelada, sem gás.	Água mineral	4.00	/imagens/agua.jpg	7	t
34	Água mineral com gás	Água mineral servida gelada, com gás.	Água mineral	7.00	/imagens/agua.jpg	7	t
35	Refrigerante lata	Refrigerante servido em lata, gelado.	Conforme o refrigerante escolhido	7.50	/imagens/refrigerantes-lata.jpg	7	t
37	Água de coco	Bebida refrescante de água de coco.	Água de coco	9.50	/imagens/agua-coco.jpg	7	t
26	Cookie recheado com Brigadeiro	Cookie artesanal com recheio cremoso de Brigadeiro.	Ingredientes: farinha de trigo, manteiga sem sal, açúcar mascavo, açúcar cristal, fermento químico em pó, ovos, chocolate em gotas e Brigadeiro.	16.99	\\imagens\\cookie_brigadeiro.jpg	3	t
25	Produto de teste	Produto de teste com descrição atualizada.	Chocolate, leite condensado e creme de leite	12.00	\N	1	f
27	Café expresso	Café preparado sob pressão, com sabor intenso e aroma marcante.	Café	7.00	/imagens/cafe-expresso.jpg	7	t
28	Café coado	Café tradicional preparado por filtragem.	Café e água	6.00	/imagens/cafe-coado.jpg	7	t
29	Café com leite	Café combinado com leite, formando uma bebida cremosa.	Café e leite	9.00	/imagens/cafe-com-leite.jpg	7	t
38	Soda italiana	Bebida gaseificada preparada com água e xarope saborizado.	Água gaseificada e xarope saborizado (maçã verde, laranja, groselha, guaraná)	15.00	/imagens/soda-italiana.jpg	7	t
31	Chocolate quente cremoso	Bebida quente de chocolate com textura cremosa.	Leite e chocolate	15.00	/imagens/chocolate-quente.jpg	7	t
30	Cappuccino	Bebida cremosa preparada à base de café e leite.	Café, leite e espuma de leite	12.60	/imagens/capuccino.jpg	7	t
36	Suco natural (300 ml)	Suco natural preparado com frutas.	Frutas e água, conforme o sabor (abacaxi, abacaxi com hortelã, morango, uva, caju, maracujá, acerola, laranja)	11.50	/imagens/suco-natural.jpg	7	t
\.


--
-- Name: administradores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.administradores_id_seq', 5, true);


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 7, true);


--
-- Name: historico_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historico_status_id_seq', 30, true);


--
-- Name: itens_pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.itens_pedido_id_seq', 19, true);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 9, true);


--
-- Name: produtos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.produtos_id_seq', 38, true);


--
-- Name: administradores administradores_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_email_key UNIQUE (email);


--
-- Name: administradores administradores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: historico_status historico_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status
    ADD CONSTRAINT historico_status_pkey PRIMARY KEY (id);


--
-- Name: itens_pedido itens_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itens_pedido
    ADD CONSTRAINT itens_pedido_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_numero_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_numero_key UNIQUE (numero);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);


--
-- Name: historico_status historico_status_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status
    ADD CONSTRAINT historico_status_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: historico_status historico_status_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_status
    ADD CONSTRAINT historico_status_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: itens_pedido itens_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itens_pedido
    ADD CONSTRAINT itens_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: itens_pedido itens_pedido_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itens_pedido
    ADD CONSTRAINT itens_pedido_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);


--
-- Name: produtos produtos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ejLqXhZxzuTQwBckT8DbcPKmfSJZd7kXkUZDrcNgW5rcjzCm0zPu8ezDgj6Uhiz

