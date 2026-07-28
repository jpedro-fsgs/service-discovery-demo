provider "aws" {
  region = "us-east-1"
}

# 1. Pega a lista de IPs oficiais do CloudFront (Prefix List)
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# 2. Pega a versão mais recente do Ubuntu 24.04 na AWS
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # ID oficial da Canonical (Ubuntu)
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# 3. Cria o Grupo de Segurança para SSH e Saída de Internet
resource "aws_security_group" "base" {
  name        = "sg_base_acesso"
  description = "Permite SSH e saida para internet"
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Grupo de Segurança para o Frontend (Porta 8080)
resource "aws_security_group" "front" {
  name        = "sg_front_cloudfront"
  description = "Permite CloudFront na porta 8080"
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }
}

# 5. Grupo de Segurança para o Consul (Porta 8500)
resource "aws_security_group" "consul" {
  name        = "sg_consul_cloudfront"
  description = "Permite CloudFront na porta 8500"
  ingress {
    from_port       = 8500
    to_port         = 8500
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }
}

# 6. Cria a Máquina EC2 e roda o script de inicialização (User Data)
resource "aws_instance" "servidor" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  
  # Associa os 3 grupos de segurança (driblando o limite de regras)
  vpc_security_group_ids = [
    aws_security_group.base.id, 
    aws_security_group.front.id, 
    aws_security_group.consul.id
  ]

  # SCRIPT QUE RODA SOZINHO QUANDO A MÁQUINA LIGA
  user_data = <<-EOF
              #!/bin/bash
              
              # Add Docker's official GPG key:
              sudo apt update -y
              sudo apt install -y ca-certificates curl
              sudo install -m 0755 -d /etc/apt/keyrings
              sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
              sudo chmod a+r /etc/apt/keyrings/docker.asc

              # Add the repository to Apt sources:
              sudo tee /etc/apt/sources.list.d/docker.sources <<-EOF_DOCKER
              Types: deb
              URIs: https://download.docker.com/linux/ubuntu
              Suites: $(. /etc/os-release && echo "$${UBUNTU_CODENAME:-$VERSION_CODENAME}")
              Components: stable
              Architectures: $(dpkg --print-architecture)
              Signed-By: /etc/apt/keyrings/docker.asc
              EOF_DOCKER

              sudo apt update -y
              
              # CORREÇÃO 1: Adicionado o -y para não travar a instalação
              sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
              usermod -aG docker ubuntu

              # Vai para a pasta do usuario, clona o repo e sobe o app
              cd /home/ubuntu
              git clone https://github.com/jpedro-fsgs/service-discovery-demo.git app
              
              # CORREÇÃO 2: Garante que o usuario "ubuntu" é o dono dos arquivos, e não o "root"
              chown -R ubuntu:ubuntu /home/ubuntu/app
              
              cd app
              docker compose up -d
              EOF

  tags = { Name = "Servidor-Docker-Terraform" }
}

# 7. CloudFront para o Frontend (8080)
resource "aws_cloudfront_distribution" "front_dist" {
  enabled = true
  origin {
    domain_name = aws_instance.servidor.public_dns
    origin_id   = "EC2-Front"
    custom_origin_config {
      http_port              = 8080
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id         = "EC2-Front"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-b392-75d506927902" # AllViewerExceptHostHeader
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# 8. CloudFront para o Consul (8500)
resource "aws_cloudfront_distribution" "consul_dist" {
  enabled = true
  origin {
    domain_name = aws_instance.servidor.public_dns
    origin_id   = "EC2-Consul"
    custom_origin_config {
      http_port              = 8500
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id         = "EC2-Consul"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-b392-75d506927902" # AllViewerExceptHostHeader
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# 9. Exibe os links finais na tela quando terminar
output "link_frontend" {
  value = aws_cloudfront_distribution.front_dist.domain_name
}
output "link_consul" {
  value = aws_cloudfront_distribution.consul_dist.domain_name
}