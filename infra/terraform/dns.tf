resource "aws_acm_certificate" "main" {
  domain_name               = "harelvalfish.dev"
  subject_alternative_names = ["*.harelvalfish.dev"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
}

output "acm_validation_cname_name" {
  value = tolist(aws_acm_certificate.main.domain_validation_options)[0].resource_record_name
}

output "acm_validation_cname_value" {
  value = tolist(aws_acm_certificate.main.domain_validation_options)[0].resource_record_value
}
