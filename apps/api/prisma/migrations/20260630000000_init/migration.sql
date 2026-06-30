-- CredMaster :: migration inicial
-- Gerada manualmente para refletir prisma/schema.prisma

-- ========================= ENUMS =========================
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALISTA', 'CLIENTE');
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');
CREATE TYPE "ClienteStatus" AS ENUM ('PENDENTE', 'EM_ANALISE', 'APROVADO', 'REPROVADO', 'BLOQUEADO', 'INATIVO');
CREATE TYPE "TipoAmortizacao" AS ENUM ('PRICE', 'SAC', 'BULLET');
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'QUINZENAL', 'SEMANAL', 'ANUAL');
CREATE TYPE "EmprestimoStatus" AS ENUM ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'ATIVO', 'EM_ATRASO', 'LIQUIDADO', 'INADIMPLENTE', 'CANCELADO');
CREATE TYPE "ParcelaTipo" AS ENUM ('JUROS', 'AMORTIZACAO', 'PRINCIPAL', 'MISTA');
CREATE TYPE "ParcelaStatus" AS ENUM ('PENDENTE', 'PARCIAL', 'PAGA', 'VENCIDA', 'CANCELADA');
CREATE TYPE "PagamentoForma" AS ENUM ('PIX', 'BOLETO', 'TED', 'DOC', 'DINHEIRO', 'CARTAO', 'OUTRO');
CREATE TYPE "PagamentoStatus" AS ENUM ('CONFIRMADO', 'ESTORNADO');
CREATE TYPE "LedgerTipo" AS ENUM ('DESEMBOLSO', 'JUROS_CONTRATUAL', 'JUROS_MORA', 'MULTA', 'PAGAMENTO', 'ESTORNO', 'AJUSTE', 'BAIXA');
CREATE TYPE "LedgerDirecao" AS ENUM ('DEBITO', 'CREDITO');
CREATE TYPE "NotificacaoCanal" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP');
CREATE TYPE "NotificacaoTipo" AS ENUM ('CADASTRO_APROVADO', 'CADASTRO_REPROVADO', 'EMPRESTIMO_CRIADO', 'VENCIMENTO_PROXIMO', 'VENCIMENTO_HOJE', 'ATRASO', 'PAGAMENTO_CONFIRMADO', 'EMPRESTIMO_LIQUIDADO');
CREATE TYPE "NotificacaoStatus" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHA');
CREATE TYPE "ConsentimentoTipo" AS ENUM ('TERMOS_DE_USO', 'POLITICA_PRIVACIDADE', 'TRATAMENTO_DADOS', 'CONSULTA_BUREAU');
CREATE TYPE "JobStatus" AS ENUM ('EXECUTANDO', 'CONCLUIDO', 'FALHA');
CREATE TYPE "VerificationTipo" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- ========================= TABLES =========================
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENTE',
    "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "clienteId" UUID,
    "ultimoLoginEm" TIMESTAMP(3),
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" UUID,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tipo" "VerificationTipo" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rendaMensal" DECIMAL(18,2),
    "status" "ClienteStatus" NOT NULL DEFAULT 'PENDENTE',
    "aprovadoPor" UUID,
    "aprovadoEm" TIMESTAMP(3),
    "motivoReprovacao" TEXT,
    "anonimizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enderecos" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "cep" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documentos_cliente" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documentos_cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consentimentos_lgpd" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" "ConsentimentoTipo" NOT NULL,
    "versao" TEXT NOT NULL,
    "aceito" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consentimentos_lgpd_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "produtos_credito" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoAmortizacao" "TipoAmortizacao" NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "taxaJurosMes" DECIMAL(12,8) NOT NULL,
    "multaAtrasoPercent" DECIMAL(12,8) NOT NULL,
    "jurosMoraMesPercent" DECIMAL(12,8) NOT NULL,
    "prazoMinMeses" INTEGER NOT NULL DEFAULT 1,
    "prazoMaxMeses" INTEGER NOT NULL DEFAULT 60,
    "valorMin" DECIMAL(18,2) NOT NULL,
    "valorMax" DECIMAL(18,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "produtos_credito_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "emprestimos" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "produtoId" UUID,
    "numeroContrato" TEXT NOT NULL,
    "valorPrincipal" DECIMAL(18,2) NOT NULL,
    "taxaJurosMes" DECIMAL(12,8) NOT NULL,
    "multaAtrasoPercent" DECIMAL(12,8) NOT NULL,
    "jurosMoraMesPercent" DECIMAL(12,8) NOT NULL,
    "tipoAmortizacao" "TipoAmortizacao" NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "prazoMeses" INTEGER NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "cetMes" DECIMAL(12,8),
    "cetAno" DECIMAL(12,8),
    "iof" DECIMAL(18,2),
    "totalJuros" DECIMAL(18,2),
    "totalAPagar" DECIMAL(18,2),
    "saldoDevedor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataContratacao" TIMESTAMP(3) NOT NULL,
    "dataLiberacao" TIMESTAMP(3),
    "dataFinal" TIMESTAMP(3) NOT NULL,
    "dataLiquidacao" TIMESTAMP(3),
    "status" "EmprestimoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "aprovadoPor" UUID,
    "aprovadoEm" TIMESTAMP(3),
    "canceladoPor" UUID,
    "canceladoEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parcelas" (
    "id" UUID NOT NULL,
    "emprestimoId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" "ParcelaTipo" NOT NULL,
    "vencimento" DATE NOT NULL,
    "valorPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorParcela" DECIMAL(18,2) NOT NULL,
    "saldoDevedorApos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "multa" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "jurosMora" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "diasAtraso" INTEGER NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataPagamento" TIMESTAMP(3),
    "status" "ParcelaStatus" NOT NULL DEFAULT 'PENDENTE',
    "moraCalculadaAte" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "emprestimoId" UUID NOT NULL,
    "parcelaId" UUID,
    "valor" DECIMAL(18,2) NOT NULL,
    "forma" "PagamentoForma" NOT NULL,
    "status" "PagamentoStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "comprovante" TEXT,
    "observacao" TEXT,
    "estornadoPor" UUID,
    "estornadoEm" TIMESTAMP(3),
    "motivoEstorno" TEXT,
    "pagamentoOrigemId" UUID,
    "registradoPor" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "emprestimoId" UUID NOT NULL,
    "parcelaId" UUID,
    "tipo" "LedgerTipo" NOT NULL,
    "direcao" "LedgerDirecao" NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "saldoApos" DECIMAL(18,2) NOT NULL,
    "competencia" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "criadoPor" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "canal" "NotificacaoCanal" NOT NULL,
    "tipo" "NotificacaoTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "NotificacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "enviadaEm" TIMESTAMP(3),
    "erro" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "antes" JSONB,
    "depois" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parametros_sistema" (
    "id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "atualizadoPor" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parametros_sistema_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_executions" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'EXECUTANDO',
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "stats" JSONB,
    "erro" TEXT,
    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- ========================= INDEXES =========================
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_clienteId_key" ON "users"("clienteId");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

CREATE UNIQUE INDEX "verification_tokens_tokenHash_key" ON "verification_tokens"("tokenHash");
CREATE INDEX "verification_tokens_userId_tipo_idx" ON "verification_tokens"("userId", "tipo");

CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");
CREATE INDEX "clientes_status_idx" ON "clientes"("status");
CREATE INDEX "clientes_cpf_idx" ON "clientes"("cpf");

CREATE INDEX "enderecos_clienteId_idx" ON "enderecos"("clienteId");

CREATE INDEX "documentos_cliente_clienteId_idx" ON "documentos_cliente"("clienteId");

CREATE INDEX "consentimentos_lgpd_clienteId_tipo_idx" ON "consentimentos_lgpd"("clienteId", "tipo");

CREATE UNIQUE INDEX "produtos_credito_nome_key" ON "produtos_credito"("nome");

CREATE UNIQUE INDEX "emprestimos_numeroContrato_key" ON "emprestimos"("numeroContrato");
CREATE INDEX "emprestimos_clienteId_idx" ON "emprestimos"("clienteId");
CREATE INDEX "emprestimos_status_idx" ON "emprestimos"("status");
CREATE INDEX "emprestimos_dataFinal_idx" ON "emprestimos"("dataFinal");

CREATE UNIQUE INDEX "parcelas_emprestimoId_numero_key" ON "parcelas"("emprestimoId", "numero");
CREATE INDEX "parcelas_vencimento_idx" ON "parcelas"("vencimento");
CREATE INDEX "parcelas_status_idx" ON "parcelas"("status");

CREATE INDEX "pagamentos_emprestimoId_idx" ON "pagamentos"("emprestimoId");
CREATE INDEX "pagamentos_parcelaId_idx" ON "pagamentos"("parcelaId");
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");
CREATE INDEX "pagamentos_dataPagamento_idx" ON "pagamentos"("dataPagamento");

CREATE UNIQUE INDEX "ledger_entries_idempotencyKey_key" ON "ledger_entries"("idempotencyKey");
CREATE INDEX "ledger_entries_emprestimoId_createdAt_idx" ON "ledger_entries"("emprestimoId", "createdAt");
CREATE INDEX "ledger_entries_tipo_idx" ON "ledger_entries"("tipo");

CREATE UNIQUE INDEX "notificacoes_idempotencyKey_key" ON "notificacoes"("idempotencyKey");
CREATE INDEX "notificacoes_clienteId_idx" ON "notificacoes"("clienteId");
CREATE INDEX "notificacoes_status_idx" ON "notificacoes"("status");

CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

CREATE UNIQUE INDEX "parametros_sistema_chave_key" ON "parametros_sistema"("chave");

CREATE UNIQUE INDEX "job_executions_nome_chave_key" ON "job_executions"("nome", "chave");
CREATE INDEX "job_executions_status_idx" ON "job_executions"("status");

-- ========================= FOREIGN KEYS =========================
ALTER TABLE "users" ADD CONSTRAINT "users_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos_cliente" ADD CONSTRAINT "documentos_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consentimentos_lgpd" ADD CONSTRAINT "consentimentos_lgpd_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos_credito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
