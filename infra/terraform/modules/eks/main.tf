module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids   # nodes in private subnets

  # Enable OIDC provider — required for IAM Roles for Service Accounts (IRSA)
  enable_irsa = true

  # Cluster access — give your IAM user/role admin access
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]   # restrict to your IP in prod

  eks_managed_node_groups = {
    main = {
      instance_types = ["t3.small"]
      min_size       = 2
      max_size       = 6
      desired_size   = 2

      # Nodes need access to ECR, SSM, and CloudWatch
      iam_role_additional_policies = {
        AmazonECRReadOnly              = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        AmazonSSMManagedInstanceCore   = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
        CloudWatchAgentServerPolicy    = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
      }
    }
  }
}