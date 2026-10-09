# Caixa Villani

Sistema simples de caixa para eventos, integrado ao Firebase Firestore e compatível com GitHub Pages.

## Funções

- Cadastro, edição, ativação e exclusão de eventos
- Cadastro, edição, ativação e exclusão de produtos
- Frente de caixa com carrinho
- Quantidade de produtos
- Pagamentos por Pix, Dinheiro, Débito e Crédito
- Lançamento direto do total dos produtos, sem digitar valor recebido ou calcular troco
- Histórico de vendas
- Cancelamento de venda sem apagar o histórico
- Relatórios por evento e período
- Totais por forma de pagamento
- Quantidade de itens vendidos
- Ticket médio
- Resumo por produto
- Impressão do relatório para conferência

## 1. Criar o Firestore

No Console do Firebase do projeto `caixavillani`:

1. Abra **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha a região desejada
4. Crie o banco

Não é necessário criar as coleções manualmente. O sistema cria `eventos`, `produtos` e `vendas` conforme os registros forem feitos.

## 2. Publicar as regras

Copie o conteúdo de `firestore.rules` para:

**Firebase Console > Firestore Database > Regras**

Depois clique em **Publicar**.

### Atenção

As regras incluídas neste projeto permitem leitura e gravação sem autenticação para facilitar o primeiro uso.

Se o endereço do sistema for público, qualquer pessoa tecnicamente capaz de acessar o projeto poderá tentar manipular os dados. Para uso definitivo, recomenda-se adicionar Firebase Authentication e restringir as regras.

## 3. GitHub Pages

Coloque estes arquivos na raiz do repositório:

- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `firestore.rules`
- `README.md`

Depois:

1. Abra **Settings**
2. Entre em **Pages**
3. Em **Build and deployment**, selecione **Deploy from a branch**
4. Selecione a branch `main`
5. Selecione `/ (root)`
6. Salve

O GitHub Pages publicará o sistema.

## Estrutura do Firestore

### eventos
- nome
- ativo
- criadoEm
- atualizadoEm

### produtos
- nome
- preco
- ativo
- criadoEm
- atualizadoEm

### vendas
- eventoId
- eventoNome
- itens
- total
- formaPagamento
- status
- criadoEm
- canceladaEm (quando aplicável)

## Observação

Os dados de nome e preço dos produtos são copiados para cada venda. Portanto, alterar posteriormente o nome ou preço de um produto não modifica vendas antigas, preservando a conferência histórica.
