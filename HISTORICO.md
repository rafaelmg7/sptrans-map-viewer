# Historico do Projeto

Este repositório registra a versao atual do SPTrans Map Viewer e sua manutencao incremental.

## Contexto

O projeto foi reorganizado para manter um historico de versionamento claro a partir desta copia de trabalho. As mudancas devem ser registradas em commits pequenos, com mensagens descritivas e verificacoes executadas localmente antes de integracao.

## Praticas Adotadas

- Commits pequenos e focados em uma unica intencao.
- Mensagens com prefixos como `docs`, `fix`, `test`, `refactor`, `ci` e `chore`.
- Separacao entre mudancas de comportamento e testes.
- Documentacao de configuracao local por arquivos `.env.example`.
- Validacao com lint, build, testes e cobertura.

## Comandos de Verificacao

```bash
npm run lint
npm run build
npm run test:all
npm run coverage:all
```
