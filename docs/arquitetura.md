# Documentação Técnica de Arquitetura — Service Discovery

## 1. Fundamentação Teórica

Em arquiteturas de microsserviços e sistemas distribuídos, a localização de rede (endereço IP e porta) das instâncias de serviços pode mudar dinamicamente devido a autoscaling, falhas de containers, implantação contínua ou reinicializações.

O **Service Discovery** resolve o problema de acoplamento rígido de endereços (hardcoded IPs), fornecendo um registro centralizado (*Service Registry*) onde as instâncias se anunciam ao iniciar e são descobertas dinamicamente pelos clientes.

---

## 2. Tipos de Service Discovery

- **Client-Side Discovery:** O cliente consulta diretamente o Service Registry para obter o IP/Porta de uma instância saudável e realiza a chamada HTTP diretamente. (Utilizado nesta aplicação através do Frontend Proxy Server).
- **Server-Side Discovery:** O cliente faz a requisição a um Load Balancer/Router central, que consulta o Registry e encaminha o tráfego.

---

## 3. HashiCorp Consul como Middleware

O Consul atua como nosso middleware de Service Discovery fornecendo:
1. **Service Registration via HTTP API:** `PUT /v1/agent/service/register` com payload contendo Name, Address, Port e Health Check.
2. **Health Checking:** O Consul executa requisições periódicas (`GET /health` a cada 10s) em cada serviço registrado. Se o serviço responder HTTP 200, ele permanece com o status `passing`. Se falhar por mais de 30s, é desregistrado automaticamente (`DeregisterCriticalServiceAfter`).
3. **Service Discovery:** `GET /v1/health/service/:name?passing=true` retorna apenas instâncias com status de saúde verificado.

---

## 4. Validação Stateless de JWT

Para garantir resiliência e alta performance:
- O **Auth Service** assina os tokens JWT utilizando uma chave secreta compartilhada (`JWT_SECRET`).
- O **Posts Service** valida a assinatura e expiração dos tokens **localmente** utilizando a mesma chave secreta, sem a necessidade de realizar chamadas de rede de volta ao Auth Service.
- Isso permite a **Graceful Degradation**: se o Auth Service cair, a emissão de novos tokens é interrompida, mas a operação de posts para usuários autenticados continua 100% funcional.

---

## 5. Redis como Armazenamento de Feed

O Redis foi escolhido para armazenar o feed em memória utilizando a estrutura de dados **List**:
- `LPUSH emoji:feed <json>` insere novos emojis no topo da lista com complexidade $O(1)$.
- `LTRIM emoji:feed 0 49` garante que a lista retenha no máximo 50 itens sem consumir memória excessiva.
- `LRANGE emoji:feed 0 49` lê os 50 posts mais recentes em ordem cronológica inversa com alta velocidade.

---

## 6. Comparativo com AWS Cloud Map

No ambiente AWS Cloud:
- O **AWS Cloud Map** substitui o HashiCorp Consul como registro de serviços.
- Integra-se nativamente com Amazon ECS / EKS e AWS Route 53 Auto Naming.
- Permite descoberta de serviços via DNS privado (`service.local`) ou via chamada de API (`DiscoverInstances`).
