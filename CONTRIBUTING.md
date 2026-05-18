# Guia de Contribuicao

Este projeto usa commits pequenos, mensagens descritivas e verificacoes locais antes de integrar alteracoes.

## Fluxo Recomendado

1. Atualize a branch principal.
2. Crie uma branch curta para a tarefa.
3. Faça uma mudanca pequena por commit.
4. Rode os comandos de qualidade.
5. Abra um pull request ou integre a branch somente depois das verificacoes passarem.

## Padrao de Commits

Use mensagens no formato:

```text
tipo: descricao curta no imperativo
```

Tipos comuns:

- `feat`: nova funcionalidade.
- `fix`: correcao de comportamento.
- `docs`: documentacao.
- `test`: testes.
- `refactor`: mudanca interna sem alterar comportamento.
- `ci`: ajustes de integracao continua.
- `chore`: manutencao geral.

Exemplos:

```text
docs: clarify local setup
test: cover empty prediction payload
fix: preserve repeated query params
```

## Verificacoes Locais

Antes de finalizar uma mudanca, rode:

```bash
npm run lint
npm run build
npm run test:all
```

Para validar cobertura:

```bash
npm run coverage:all
```
