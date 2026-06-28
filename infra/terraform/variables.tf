variable "aws_region"    { default = "us-east-1" }
variable "cluster_name"  { default = "tank-db" }
variable "environment"   { default = "production" }
variable "domain_name"   { description = "Your domain name, e.g. harelvalfish.dev" }
variable "mongo_uri"     { sensitive = true }