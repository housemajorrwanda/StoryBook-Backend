# andasy.hcl app configuration file generated for storybook-transcription on Wednesday, 28-Jan-26 11:56:23 CAT
#
# See https://github.com/quarksgroup/andasy-cli for information about how to use this file.

app_name = "storybook-transcription"

app {

  env = {}

  port = 8080

  compute {
    cpu      = 2
    memory   = 4096
    cpu_kind = "shared"
  }

  process {
    name = "storybook-transcription"
  }

}
