# CredMaster

Plataforma de gestão de crédito para instituição financeira regulamentada.
Monorepo com **API** (NestJS + Prisma + PostgreSQL/Neon) e **Web** (Next.js + Tailwind),
contemplando Portal do Cliente e Painel Administrativo.

> Projetado com foco em **correção monetária** (sem `float`), **auditabilidade**
> (livro-razão append-only + audit log), **conformidade** (CET, limites legais,
> consentimento LGPD) e **operação confiável** (job diário idempotente).

---

## Sumário

- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar](#como-rodar)
- [Decisões de modelagem financeira](#decisões-de-modelagem-financeira)
- [Segurança & Conformidade](#segurança--conformidade)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Endpoints principais](#endpoints-principais)
- [Testes](#testes)

---

## Arquitetura

**Monólito modular** (e não microserviços), por uma razão deliberada: o domínio de
crédito exige **consistência transacional forte** (dinheiro, saldo, parcelas e razão
mudam juntos). Os limites de domínio existem como **módulos** isolados e podem ser
extraídos para serviços no futuro, se a escala exigir.

```
                      INTERNET
                          │
        ┌─────────────────┴──────────────────┐
   Portal do Cliente                 Painel Administrativo
     (Next.js)                            (Next.js)
        └─────────────────┬──────────────────┘
                          │ HTTPS (JWT)
                    API (NestJS)
   ┌─────────┬─────────┬───────────┬──────────┬───────────┐
  Auth     Clientes  Emprestimos  Pagamentos  Cobrança   Relatórios
   │         │          │            │           │           │
   └────── Ledger (livro-razão) · Notificações · Auditoria · Parâmetros ──┘
                          │
                  PostgreSQL (Neon)
                          │
              Job diário (cron) idempotente
```

## Stack

| Camada     | Tecnologia                                                        |
| ---------- | ----------------------------------------------------------------- |
| API        | NestJS 10, TypeScript, Prisma 5, decimal.js, Passport/JWT, argon2 |
| Banco      | PostgreSQL (Neon serverless)                                      |
| Agendamento| @nestjs/schedule (cron)                                           |
| Docs       | Swagger/OpenAPI em `/api/docs`                                    |
| Web        | Next.js 14 (App Router), React 18, Tailwind CSS                   |
| Qualidade  | Jest (unit), ESLint, Prettier, GitHub Actions CI                  |

## Pré-requisitos

- **Node.js >= 20** e npm 10+
- Acesso ao banco Neon (já configurado em `apps/api/.env`)

## Como rodar

> O banco Neon já está configurado em `apps/api/.env` (arquivo **não** versionado).
> Para outro ambiente, copie `apps/api/.env.example` para `apps/api/.env`.

```bash
# 1) Instalar dependências (na raiz)
npm install

# 2) Gerar o Prisma Client
npm run api:generate

# 3) Criar o schema no banco (primeira migration)
#    Cria as tabelas no Neon a partir do schema.prisma
npm --workspace @credmaster/api run prisma:migrate -- --name init

# 4) Popular dados iniciais (admin + parâmetros + produtos)
npm run api:seed

# 5) Subir API (porta 3333) e Web (porta 3000) juntos
npm run dev
#   ou separadamente:
#   npm run api:dev
#   npm run web:dev
```

Acesse:

- Web: <http://localhost:3000>
- API/Swagger: <http://localhost:3333/api/docs>

**Login admin padrão** (criado pelo seed): `admin@credmaster.dev` / `Admin@123456`
(troque em produção via variáveis `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA`).

### Fluxo de demonstração

1. Entre como **admin** → aprove um cliente (ou crie um) em **Clientes**.
2. **Novo empréstimo** → escolha o cliente, simule (veja cronograma + CET) e crie.
3. Abra o empréstimo → **Liberar crédito** (gera o desembolso no razão).
4. **Registrar pagamento** numa parcela; veja saldo e status mudarem.
5. Em **Cobrança**, dispare a rotina (idempotente) para calcular mora/multa de atrasos.
6. Entre como **cliente** (auto-cadastro em `/register`) para ver o Portal.

## Decisões de modelagem financeira

- **Dinheiro em `Decimal`** (`Decimal(18,2)`), taxas em `Decimal(12,8)`. Nunca `float`.
- **Amortização**: suporta **PRICE** (parcelas fixas), **SAC** (amortização constante)
  e **BULLET** (juros periódicos + principal no fim — o exemplo original). A soma das
  amortizações é exatamente o principal e o saldo final é exatamente zero (resíduo de
  centavos ajustado na última parcela).
- **CET (Custo Efetivo Total)**: calculado por TIR (Newton-Raphson + bisseção),
  ao mês e ao ano — exigência regulatória.
- **Mora**: multa de incidência **única** sobre o valor em aberto + **juros de mora
  pro-rata die**. Limites legais (multa 2%, mora 1% a.m.) são validados e configuráveis.
- **Livro-razão (`ledger_entries`) é append-only** e é a **fonte da verdade do saldo
  devedor total** (principal + juros contratados + encargos − pagamentos). O saldo
  zera exatamente quando o contrato é quitado.
- **Pagamentos são imutáveis**: correções via **estorno** (novo lançamento), nunca
  edição/exclusão.
- **Job diário idempotente**: protegido por `JobExecution` (única por data) +
  `idempotencyKey` nos lançamentos do razão e nas notificações. Rodar 2× no mesmo dia
  **não** duplica encargos nem avisos.

## Segurança & Conformidade

- Senhas com **argon2id** (nunca em texto puro). Autenticação separada do cadastro.
- **JWT** com access + refresh, **rotação** de refresh tokens e revogação.
- **RBAC**: papéis `ADMIN`, `ANALISTA`, `CLIENTE` via guards globais.
- **Rate limiting**, **Helmet**, CORS restrito, bloqueio por tentativas de login.
- **Auditoria** completa (`audit_logs`) das ações sensíveis.
- **LGPD**: consentimento versionado (`consentimentos_lgpd`), dados pessoais isolados.
- **CET** e **limites legais** embutidos no fluxo de concessão.

## Estrutura de pastas

```
credmaster/
├─ apps/
│  ├─ api/                       # NestJS
│  │  ├─ prisma/schema.prisma    # modelo de dados
│  │  ├─ prisma/seed.ts
│  │  └─ src/
│  │     ├─ domain/finance/      # núcleo financeiro PURO (+ testes)
│  │     │   amortization.ts · cet.ts · mora.ts · money.ts · dates.ts
│  │     ├─ common/              # prisma, guards, filtros, decorators
│  │     ├─ config/              # configuração + validação de env
│  │     └─ modules/             # auth, clientes, emprestimos, pagamentos,
│  │                             # ledger, cobranca, notificacoes, relatorios,
│  │                             # dashboard, audit, parametros, users, health
│  └─ web/                       # Next.js (portal + admin)
│     └─ src/app/{login,register,portal,admin}
├─ docker-compose.yml            # Postgres local (opcional)
└─ .github/workflows/ci.yml
```

## Endpoints principais

| Método | Rota                                      | Papel            |
| ------ | ----------------------------------------- | ---------------- |
| POST   | `/api/v1/auth/register`                   | público          |
| POST   | `/api/v1/auth/login`                      | público          |
| GET    | `/api/v1/dashboard`                       | ADMIN/ANALISTA   |
| GET/POST| `/api/v1/clientes` · `/:id/aprovar`      | ADMIN/ANALISTA   |
| POST   | `/api/v1/emprestimos/simular`             | ADMIN/ANALISTA   |
| POST   | `/api/v1/emprestimos`                     | ADMIN/ANALISTA   |
| POST   | `/api/v1/emprestimos/:id/liberar`         | ADMIN            |
| POST   | `/api/v1/emprestimos/:id/pagamentos`      | ADMIN/ANALISTA   |
| POST   | `/api/v1/pagamentos/:id/estornar`         | ADMIN            |
| POST   | `/api/v1/cobranca/executar`               | ADMIN            |
| GET    | `/api/v1/emprestimos/meus`                | CLIENTE          |
| GET    | `/api/v1/notificacoes`                    | CLIENTE          |

Documentação interativa completa em **`/api/docs`** (Swagger).

## Testes

```bash
npm run api:test          # testes unitários (núcleo financeiro)
npm --workspace @credmaster/api run test:cov
```

Os testes cobrem amortização (PRICE/SAC/BULLET), CET e cálculo de mora/multa —
as partes onde a correção monetária é crítica.
