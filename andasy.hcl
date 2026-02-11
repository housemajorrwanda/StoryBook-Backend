# andasy.hcl app configuration file generated for storybook on Tuesday, 27-Jan-26 15:28:18 CAT
#
# See https://github.com/quarksgroup/andasy-cli for information about how to use this file.

app_name = "storybook"

app {

  env = {
    PORT = "3000"
  }

  port = 3000

  compute {
    cpu      = 2
    memory   = 1024
    cpu_kind = "shared"
  }

  process {
    name = "storybook"
  }

}
