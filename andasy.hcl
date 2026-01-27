# andasy.hcl app configuration file generated for storybook on Tuesday, 27-Jan-26 15:28:18 CAT
#
# See https://github.com/quarksgroup/andasy-cli for information about how to use this file.

app_name = "storybook"

app {

  env = {}

  port = 3009

  compute {
    cpu      = 1
    memory   = 512
    cpu_kind = "shared"
  }

  process {
    name = "storybook"
  }

}
