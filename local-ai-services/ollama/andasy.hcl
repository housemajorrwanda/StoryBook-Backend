# andasy.hcl - Ollama service for StoryBook
# Runs Ollama for embedding generation
# Note: Models download on first use (~274MB for nomic-embed-text)

app_name = "storybook-ollama"

app {

  env = {}

  port = 8080

  compute {
    cpu      = 2
    memory   = 4096
    cpu_kind = "shared"
  }

  process {
    name = "storybook-ollama"
  }

}
