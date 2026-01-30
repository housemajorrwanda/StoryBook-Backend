# andasy.hcl - Embedding service for StoryBook
# Requires OLLAMA_URL secret to be set pointing to an Ollama instance

app_name = "storybook-embedding"

app {

  env = {}

  port = 3000

  compute {
    cpu      = 1
    memory   = 512
    cpu_kind = "shared"
  }

  process {
    name = "storybook-embedding"
  }

}
