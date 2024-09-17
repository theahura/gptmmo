# Localstack

## Adding New Services to Localstack

We use terraform configs to manage our localstack setup. Specifically, we use
the [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
to set up mock versions of our AWS infra for local testing and development.

Adding a new service to localstack is almost exactly equivalent to adding a
service in our actual AWS infra -- create a new terraform file with the
relevant AWS resource, and run `terraform apply`.

There are a few edge cases to be aware of, however:
- if you are adding a truly new service to localstack, make sure that the
  providers endpoints located in providers.tf has your service name pointed to
  the localstack url. If you are getting a credential error during the apply
  step, you probably did not do this part correctly.
- make sure that the AWS provider version we use for localstack has the
  resources you want to add. You can see the current version in providers.tf.
- make sure that localstack [supports](https://localstack.cloud/features/) the
  service you are trying to add on its free tier.

Once you have the service installed, you can verify it's existance and interact
with it using the AWS CLI. The CLI should work almost exactly equivalently as
if you were interacting with the actual AWS infra. One change is required:
most AWS CLI commands expose an `--endpoint-url` argument. Be sure to set that
arg to the localstack url (localhost:4566) to have the AWS CLI hit the local
backend.
