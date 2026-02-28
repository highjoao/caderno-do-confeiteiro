

# Configuração de E-mails de Autenticação Personalizados

## Problema
O e-mail de confirmação não está chegando porque o projeto está usando o sistema padrão de e-mails. Para garantir a entrega e personalizar o conteúdo, precisamos configurar um domínio de envio personalizado.

## Plano

### Passo 1: Configurar domínio de e-mail
Para que os e-mails cheguem corretamente, é necessário configurar um domínio de envio (ex: `notify@seudominio.com`). Sem isso, os e-mails podem cair no spam ou não serem entregues.

### Passo 2: Criar templates personalizados
Após o domínio configurado, vou criar os templates com o conteúdo que você definiu:

- **Assunto:** Confirme seu e-mail - Caderno do Confeiteiro
- **Corpo:** Texto personalizado com nome da confeitaria, tom acolhedor, emoji 💕, botão rosa pastel "Confirmar meu e-mail"
- **Assinatura:** "Com carinho, Equipe Caderno do Confeiteiro"
- **Visual:** Tema rosa pastel consistente com o app

Templates para todos os tipos de e-mail auth (confirmação, recuperação de senha, etc.) serão criados com a mesma identidade visual.

### Passo 3: Deploy automático
Os templates serão implantados automaticamente via backend functions.

---

**Primeiro passo necessário:** Você precisa ter um domínio próprio (ex: cadernodoconfeiteiro.com.br) para configurar o envio de e-mails. Você possui um domínio que podemos usar?

