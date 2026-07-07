# Apresentação Comercial CredMaster

PDF premium para envio a clientes potenciais, com **prints reais** das telas do sistema e explicação de cada módulo.

## Arquivo gerado

- **PDF:** `CredMaster-Apresentacao-Cliente.pdf`
- **HTML:** `apresentacao.html` (versão editável)
- **Screenshots:** `screenshots/` (PNG individuais)

## Como gerar

1. Suba API + Web:

```bash
npm run dev
```

2. Gere o material:

```bash
npm run generate:deck
```

O script cria automaticamente um cliente e empréstimo de demonstração (se ainda não existirem) para capturar telas de detalhe.

## Variáveis opcionais

| Variável | Padrão |
|----------|--------|
| `DECK_BASE_URL` | `http://localhost:3000` |
| `DECK_API_URL` | `http://localhost:3333/api/v1` |
| `DECK_ADMIN_EMAIL` | `admin@credmaster.dev` |
| `DECK_ADMIN_SENHA` | `Admin@123456` |

Para gerar a partir do ambiente em produção:

```bash
DECK_BASE_URL=https://seu-dominio.vercel.app npm run generate:deck
```

## Conteúdo do deck

- Capa e visão geral da plataforma
- Login, cadastro, recuperação de senha e simulador
- Dashboard, clientes, empréstimos, recebimentos, cobrança, relatórios e configurações
- Portal do cliente (slide explicativo)
- Slide de encerramento comercial
