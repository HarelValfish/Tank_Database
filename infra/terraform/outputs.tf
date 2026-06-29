output "ecr_backend_url"  { value = module.ecr.backend_url }
output "ecr_frontend_url" { value = module.ecr.frontend_url }
output "cluster_name"     { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "deploy_role_arn"  { value = module.iam.github_actions_role_arn }
output "nat_gateway_eip"  { value = module.vpc.nat_public_ips }
output "acm_cert_arn"     { value = aws_acm_certificate.main.arn }
