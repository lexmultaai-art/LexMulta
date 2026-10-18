# Multas AI

Aplicação web responsiva para organizar solicitações de recursos administrativos de infrações de trânsito.

## Stack

- React 19 + TypeScript + TanStack Start/Router
- Tailwind CSS 4 e Lucide React
- Esquema inicial de banco para Supabase em `supabase/migrations/`

## Rodar localmente

```bash
npm install
npm run dev
```

Validar antes de publicar:

```bash
npm run lint
npm test
npm run build
```

## O que está implementado na interface

- Fluxo em quatro etapas: infração, condutor, veículo e checkout.
- Pesquisa local no catálogo de infrações fornecido no briefing.
- Carregamento de municípios por UF usando a API pública de localidades do IBGE.
- Motivos padrão e campos condicionais para pedido de revisão por especialista.
- Seleção de veículo, preço demonstrativo por gravidade, plano anual, cupom e parcelamento.
- Tela administrativa em `/admin` para acompanhar pedidos criados na sessão.
- Tema claro/escuro e layout responsivo.

## Antes de usar em produção

Esta versão é um protótipo de interface. O checkout não realiza cobranças, o PIX não é gerado, a minuta por IA/PDF e o envio de e-mail ainda não estão conectados, e a tela administrativa usa dados em memória. A listagem de modelos de veículos é apenas inicial.

Para produção, configure Supabase Auth, aplique a migração SQL, crie políticas RLS e buckets privados para documentos, implemente funções de servidor para gravar solicitações e gerar minutas, e integre um gateway de pagamento com webhooks idempotentes. **Não armazene PAN/CVV do cartão no banco nem envie dados de cartão diretamente ao servidor da aplicação**; use os campos tokenizados do provedor de pagamentos.

Revise também a tabela de gravidade e preços com uma fonte oficial atualizada: o protótipo usa uma regra simplificada por código e não deve ser tratado como fonte jurídica. A lista de municípios vem do IBGE em tempo de execução e requer conexão à internet.

## Segurança e conteúdo jurídico

- Os dados de formulários não devem ser considerados persistidos ou protegidos até configurar autenticação, armazenamento e controles de acesso reais.
- O sistema deve informar que não garante deferimento e que o usuário é responsável por confirmar a veracidade dos dados e observar os prazos do órgão competente.
- Revise Termos de Uso, Política de Privacidade, retenção de documentos e bases legais da LGPD com profissional qualificado antes de coletar dados pessoais reais.
