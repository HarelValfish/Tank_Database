output "vpc_id"             { value = module.vpc.vpc_id }
output "private_subnet_ids" { value = module.vpc.private_subnets }
output "nat_public_ips"     { value = module.vpc.nat_public_ips }
