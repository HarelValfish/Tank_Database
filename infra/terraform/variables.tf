variable "aws_region"   { default = "us-east-1" }
variable "cluster_name" { default = "tank-db" }
variable "environment"  { default = "production" }
variable "mongo_uri"    { sensitive = true }
variable "admin_key"    { sensitive = true }
