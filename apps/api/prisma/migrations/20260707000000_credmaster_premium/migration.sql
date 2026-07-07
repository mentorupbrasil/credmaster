-- CredMaster: campos para empréstimo simples + cliente completo

-- Novos valores de enum ClienteStatus
ALTER TYPE "ClienteStatus" ADD VALUE IF NOT EXISTS 'ATIVO';
ALTER TYPE "ClienteStatus" ADD VALUE IF NOT EXISTS 'INADIMPLENTE';
ALTER TYPE "ClienteStatus" ADD VALUE IF NOT EXISTS 'QUITADO';

-- Novo valor de enum EmprestimoStatus
ALTER TYPE "EmprestimoStatus" ADD VALUE IF NOT EXISTS 'VENCENDO_HOJE';

ALTER TABLE "clientes"
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT;

ALTER TABLE "emprestimos"
  ADD COLUMN IF NOT EXISTS "taxaJurosPercent" DECIMAL(8, 4),
  ADD COLUMN IF NOT EXISTS "multaDiariaFixa" DECIMAL(18, 2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "prazoDias" INTEGER,
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT;

INSERT INTO "parametros_sistema" ("id", "chave", "valor", "descricao", "updatedAt", "createdAt")
VALUES
  (gen_random_uuid(), 'app.taxa_juros_padrao', '20', 'Taxa de juros padrão (%)', NOW(), NOW()),
  (gen_random_uuid(), 'app.valor_atraso_diario', '10', 'Encargo fixo por dia de atraso (R$)', NOW(), NOW()),
  (gen_random_uuid(), 'app.nome_sistema', 'CredMaster', 'Nome exibido no painel', NOW(), NOW())
ON CONFLICT ("chave") DO NOTHING;
