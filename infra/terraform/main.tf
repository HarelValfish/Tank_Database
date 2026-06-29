provider "aws" {
  region = var.aws_region
}

# ─── VPC ─────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  aws_region            = var.aws_region
  cluster_name          = var.cluster_name
  nat_eip_allocation_id = aws_eip.nat.id
}

# ─── ECR ─────────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"
}

# ─── EKS ─────────────────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

# ─── IAM (GitHub Actions OIDC deploy role) ───────────────────────────
module "iam" {
  source = "./modules/iam"
}

# ─── AWS Load Balancer Controller IRSA ───────────────────────────────
module "aws_load_balancer_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name                              = "aws-load-balancer-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

# ─── Bootstrap: kubeconfig + LBC + k8s manifests + DNS ──────────────
resource "null_resource" "bootstrap" {
  depends_on = [module.eks, module.aws_load_balancer_controller_irsa]

  triggers = {
    cluster_endpoint = module.eks.cluster_endpoint
    zone_id          = aws_route53_zone.main.zone_id
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e

      echo "→ Updating kubeconfig..."
      aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}

      echo "→ Installing AWS Load Balancer Controller..."
      helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
      helm repo update
      helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        --namespace kube-system \
        --set clusterName=${var.cluster_name} \
        --set replicaCount=1 \
        --set "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn=${module.aws_load_balancer_controller_irsa.iam_role_arn}" \
        --wait --timeout 6m

      echo "→ Applying k8s manifests..."
      kubectl apply -f ${path.root}/../../k8s/namespace.yaml

      kubectl create secret generic backend-secrets \
        --namespace tank-db \
        --from-literal=MONGO_URI="${var.mongo_uri}" \
        --from-literal=CLIENT_ORIGIN="https://harelvalfish.dev" \
        --from-literal=ADMIN_KEY="${var.admin_key}" \
        --dry-run=client -o yaml | kubectl apply -f -

      kubectl apply -f ${path.root}/../../k8s/backend/
      kubectl apply -f ${path.root}/../../k8s/frontend/
      kubectl apply -f ${path.root}/../../k8s/ingress.yaml

      echo "→ Waiting for ALB to be provisioned (up to 5 min)..."
      ALB=""
      for i in $(seq 1 30); do
        ALB=$(kubectl get ingress tank-db -n tank-db -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
        if [ -n "$ALB" ]; then
          echo "✔ ALB: $ALB"
          break
        fi
        sleep 10
      done

      if [ -n "$ALB" ]; then
        echo "→ Updating Route53 A record..."
        ALB_ZONE=$(aws elbv2 describe-load-balancers \
          --query "LoadBalancers[?DNSName=='$ALB'].CanonicalHostedZoneId" \
          --output text)
        aws route53 change-resource-record-sets \
          --hosted-zone-id ${aws_route53_zone.main.zone_id} \
          --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"harelvalfish.dev\",\"Type\":\"A\",\"AliasTarget\":{\"HostedZoneId\":\"$ALB_ZONE\",\"DNSName\":\"$ALB\",\"EvaluateTargetHealth\":true}}}]}"
        echo "✔ DNS updated — site will be live at https://harelvalfish.dev within ~60s."
      fi
    EOT
  }
}
