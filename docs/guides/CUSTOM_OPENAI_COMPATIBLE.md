---
title: "Custom OpenAI-Compatible Provider Setup"
version: 3.8.16
lastUpdated: 2026-06-08
---

# Custom OpenAI-Compatible Provider Setup

> **TL;DR**: OmniRoute works with any OpenAI-compatible API endpoint. This guide shows how to set up common self-hosted and third-party providers (LM Studio, Ollama, vLLM, llama.cpp, DeepSeek, etc.) in 5 minutes.

**Source:** `src/lib/providers/`, `open-sse/config/providerRegistry.ts`

**Related:**
- [PROVIDER_REFERENCE.md](../reference/PROVIDER_REFERENCE.md) — all 177+ providers
- [PROVIDERS-GUIDE.md](../getting-started/PROVIDERS-GUIDE.md) — provider concepts

---

## When to Use This Guide

Use this guide when:

- You run a **self-hosted LLM** (LM Studio, Ollama, vLLM, llama.cpp, etc.)
- You're using a **smaller OpenAI-compatible provider** not in OmniRoute's default catalog
- You want to **proxy** an existing OpenAI endpoint through OmniRoute (e.g., Azure, custom gateway)

If the provider is already in [PROVIDER_REFERENCE.md](../reference/PROVIDER_REFERENCE.md) (e.g., Together AI, Anyscale, OpenRouter), use that guide instead.

---

## The 5-Minute Setup

For any OpenAI-compatible API:

### Step 1: Identify the API endpoint

The provider must expose a `/chat/completions` endpoint that accepts the OpenAI request format:

```json
POST {baseUrl}/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "model-name",
  "messages": [{"role": "user", "content": "Hello"}],
  "temperature": 0.7
}
```

### Step 2: Add the provider in OmniRoute

**Via dashboard:**

1. Open `http://localhost:20128/dashboard/providers`
2. Click **+ Add Provider**
3. Select **"OpenAI-compatible"** (or **"Anthropic-compatible"**) from the modal dropdown
4. Fill in:
   - **Name**: e.g., "My Local LLM"
   - **Prefix**: e.g., `my-local-llm` (for model routing like `my-local-llm/qwen2.5-7b`)
   - **Base URL**: e.g., `http://localhost:1234/v1`
   - **API Type**: `chat` (for chat completions) or `embeddings`, `images-generations`, etc.
5. Click **Connect**

**Via API:**

```bash
curl -X POST http://localhost:20128/api/provider-nodes \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Local LLM",
    "prefix": "my-local-llm",
    "type": "openai-compatible",
    "apiType": "chat",
    "baseUrl": "http://localhost:1234/v1"
  }'
```

See `createProviderNodeSchema` in `src/shared/validation/schemas.ts` for full payload options.

### Step 3: Test

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-local-llm/qwen2.5-7b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

If you get a response, you're done!

---

## Platform-Specific Guides

### 1. LM Studio (Local)

LM Studio runs LLMs on your machine with a built-in OpenAI-compatible server.

**Step 1: Start the server in LM Studio**

1. Open LM Studio
2. Load a model (e.g., Qwen 2.5 7B Instruct)
3. Click the **Developer** tab
4. Click **Start Server**
5. Note the **Server URL** (default: `http://localhost:1234/v1`)

**Step 2: Add to OmniRoute**

- **Base URL**: `http://localhost:1234/v1`
- **API Key**: `lm-studio` (LM Studio doesn't require a real key, but the field can't be empty)
- **Models**: whatever you loaded (e.g., `qwen2.5-7b-instruct`)

**Step 3: Verify model name**

In LM Studio's Developer tab, the **Model identifier** (e.g., `qwen2.5-7b-instruct`) is what you use in OmniRoute. The display name is for humans only.

**Common issues:**

| Issue | Fix |
|-------|-----|
| `connection refused` | Make sure LM Studio server is started (green indicator) |
| `model not found` | Use the exact model identifier from LM Studio |
| Slow responses | Enable GPU acceleration in LM Studio settings |

### 2. Ollama (Local)

Ollama runs LLMs with a CLI-first interface.

**Step 1: Install and run Ollama**

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1:8b

# Ollama server starts automatically on port 11434
# Verify:
curl http://localhost:11434/v1/models
```

**Step 2: Add to OmniRoute**

- **Base URL**: `http://localhost:11434/v1`
- **API Key**: `ollama` (Ollama doesn't validate keys)
- **Models**: `llama3.1:8b` (use exact model name from `ollama list`)

**Step 3: Test**

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-ollama/llama3.1:8b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Multi-GPU:**

Ollama auto-detects multiple GPUs. To control which models run on which GPU:

```bash
# Set GPU layers environment variable
OLLAMA_NUM_GPU=999 ollama serve
```

**Remote Ollama:**

If Ollama is on another machine:

- **Base URL**: `http://other-host:11434/v1`
- Ensure firewall allows port 11434
- For auth, set `OLLAMA_AUTH` env var and pass the bearer token

### 3. vLLM (Production-grade)

vLLM is a high-throughput inference server, ideal for serving models in production.

**Step 1: Install and start vLLM**

```bash
pip install vllm

# Start the server
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key your-secret-key
```

The OpenAI-compatible server is at `http://localhost:8000/v1`.

**Step 2: Add to OmniRoute**

- **Base URL**: `http://localhost:8000/v1`
- **API Key**: `your-secret-key` (the `--api-key` you set)
- **Models**: `meta-llama/Llama-3.1-8B-Instruct`

**GPU memory configuration:**

```bash
# For multi-GPU, set GPU memory utilization per GPU
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --gpu-memory-utilization 0.9 \
  --tensor-parallel-size 4
```

### 4. llama.cpp (Server Mode)

llama.cpp can run as an OpenAI-compatible server.

**Step 1: Build and start llama.cpp server**

```bash
# Clone and build
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Start the server
./server \
  -m models/llama-3.1-8b-instruct.Q4_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080
```

**Step 2: Add to OmniRoute**

- **Base URL**: `http://localhost:8080/v1`
- **API Key**: any non-empty string (llama.cpp doesn't validate)

### 5. DeepSeek (Cloud, OpenAI-compatible)

DeepSeek offers an OpenAI-compatible API with very competitive pricing.

**Step 1: Get an API key**

Sign up at https://platform.deepseek.com and create an API key.

**Step 2: Add to OmniRoute**

- **Base URL**: `https://api.deepseek.com/v1`
- **API Key**: your DeepSeek key
- **Models**: `deepseek-chat`, `deepseek-reasoner`, `deepseek-coder`

**Available models:**

| Model | Context | Input $/1M | Output $/1M |
|-------|---------|-----------|-------------|
| `deepseek-chat` | 64K | $0.14 | $0.28 |
| `deepseek-reasoner` | 64K | $0.55 | $2.19 |
| `deepseek-coder` | 32K | $0.14 | $0.28 |

### 6. Groq (Ultra-fast inference)

Groq provides extremely fast inference for open-source models.

- **Base URL**: `https://api.groq.com/openai/v1`
- **API Key**: from https://console.groq.com
- **Models**: `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`, etc.

### 7. Together AI

- **Base URL**: `https://api.together.xyz/v1`
- **API Key**: from https://api.together.xyz
- **Models**: 50+ open-source models

### 8. Anyscale Endpoints

- **Base URL**: `https://api.endpoints.anyscale.com/v1`
- **API Key**: from https://anyscale.com
- **Models**: Llama, Mistral, etc.

### 9. OpenRouter (Aggregator)

- **Base URL**: `https://openrouter.ai/api/v1`
- **API Key**: from https://openrouter.ai
- **Models**: 100+ models from many providers

### 10. Custom Reverse Proxy

If you have a custom gateway (e.g., LiteLLM Proxy, Portkey, Cloudflare AI Gateway):

**LiteLLM Proxy:**

```bash
# Start LiteLLM proxy
litellm --config proxy_config.yaml

# Add to OmniRoute
# Base URL: http://localhost:4000
# API Key: your litellm master key
```

---

## Common Configuration Patterns

### Pattern 1: Local + Cloud Fallback

Use a combo that prefers local, falls back to cloud:

```json
{
  "name": "local-first",
  "strategy": "priority",
  "targets": [
    { "provider": "my-local-llm", "model": "qwen2.5-7b", "priority": 1 },
    { "provider": "openai", "model": "gpt-5-mini", "priority": 2 }
  ]
}
```

### Pattern 2: Multi-Model Combo

Use a combo to auto-select between models:

```json
{
  "name": "multi-llm",
  "strategy": "auto",
  "targets": [
    { "provider": "my-ollama", "model": "llama3.1:8b" },
    { "provider": "my-vllm", "model": "meta-llama/Llama-3.1-70B-Instruct" },
    { "provider": "groq", "model": "llama-3.1-70b-versatile" }
  ]
}
```

### Pattern 3: Cost-Optimized Routing

Use `auto/cheap` mode with self-hosted as the cheapest:

```json
{
  "model": "auto/cheap",
  "messages": [...]
}
```

### Pattern 4: Load Balancing Across Self-Hosted Instances

```json
{
  "name": "load-balanced-local",
  "strategy": "round-robin",
  "targets": [
    { "provider": "gpu-server-1", "model": "llama-3.1-70b" },
    { "provider": "gpu-server-2", "model": "llama-3.1-70b" }
  ]
}
```

---

## Authentication Variations

### Bearer Token (most common)

```yaml
Provider: OpenAI-compatible
Headers: Authorization: Bearer YOUR_KEY
```

### Custom Header

Some providers use a different header:

```ts
// In provider config:
{
  "authType": "custom",
  "authHeader": "X-API-Key",
  "authValue": "YOUR_KEY"
}
```

### No Auth (Local servers)

Some local servers don't require auth. Use any non-empty placeholder:

```
API Key: "no-auth"  // or "lm-studio" or "ollama"
```

### Query Parameter Auth

```yaml
Provider: OpenAI-compatible
URL Pattern: {baseUrl}?api_key={key}
```

Set in the **Auth** section of the provider config.

---

## Streaming Compatibility

OmniRoute uses **Server-Sent Events (SSE)** for streaming. Most OpenAI-compatible servers support this automatically.

To verify streaming works:

```bash
curl -N http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-local-llm/qwen2.5-7b",
    "stream": true,
    "messages": [{"role": "user", "content": "Count to 5"}]
  }'
```

You should see SSE chunks like `data: {"choices":[{"delta":{"content":"1"}}]}`.

If streaming fails:

| Provider | Issue | Fix |
|----------|-------|-----|
| LM Studio | SSE works out of the box | No action needed |
| Ollama | Streaming supported | No action needed |
| vLLM | Streaming supported | No action needed |
| llama.cpp server | Streaming may need `--sse` flag | Add `--sse` to server start |
| Custom | Not supported | Disable streaming: `stream: false` |

---

## Tool Calling Compatibility

OmniRoute translates OpenAI-format tool calls to/from provider-specific formats. Most OpenAI-compatible servers support tools.

To verify:

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-local-llm/qwen2.5-7b",
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather",
        "parameters": {
          "type": "object",
          "properties": { "location": {"type": "string"} },
          "required": ["location"]
        }
      }
    }],
    "messages": [{"role": "user", "content": "What is the weather in NYC?"}]
  }'
```

Tools are supported by:
- ✅ OpenAI, Anthropic, Google (native)
- ✅ Most modern open-source models (Qwen 2.5+, Llama 3.1+, Mistral, etc.)
- ❌ Some smaller models (check model card)

---

## Vision Model Support

For vision-capable models (LLaVA, Qwen-VL, GPT-4V, Claude 3.5 Sonnet):

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-local-vlm/llava-1.6",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "What is in this image?" },
        { "type": "image_url", "image_url": { "url": "https://..." } }
      ]
    }]
  }'
```

Make sure the model is **declared as vision-capable** in OmniRoute's provider config (otherwise the dashboard may filter it).

---

## Troubleshooting

### "Provider not connecting"

1. Test the provider directly:
   ```bash
   curl {baseUrl}/chat/completions \
     -H "Authorization: Bearer {key}" \
     -H "Content-Type: application/json" \
     -d '{"model":"test","messages":[{"role":"user","content":"hi"}]}'
   ```

2. Check OmniRoute logs:
   ```bash
   # Look for provider errors
   grep "PROVIDER" ~/.omniroute/logs/*.log
   ```

3. Verify CORS / firewall:
   ```bash
   # From OmniRoute host:
   telnet provider-host provider-port
   ```

### "Model not found"

- Use the **exact** model identifier from the provider
- Some providers have aliases (e.g., OpenAI's `gpt-5` vs `gpt-5-2025-01-01`)
- Check provider's `/v1/models` endpoint for the correct name

### "Authentication failed"

- Check API key is correct (no extra spaces, full string)
- Some local servers don't validate keys but still require a non-empty value
- For Bearer auth, prefix with `Bearer ` in the test request

### "Slow first response"

Local models often have **slow first response** (cold start, model loading). Subsequent requests are fast. This is normal.

To pre-load models:
- LM Studio: Server tab → "Keep model loaded"
- Ollama: models stay loaded after first use
- vLLM: models stay loaded until idle timeout

### "Out of memory"

If the model crashes with OOM:

| GPU VRAM | Recommended models |
|----------|-------------------|
| 8 GB | 7B models (Q4/Q5 quantization) |
| 12 GB | 13B models (Q4) |
| 16 GB | 13B-14B models (Q4) |
| 24 GB | 30B-34B models (Q4) |
| 48 GB+ | 70B+ models |

Use quantized models (GGUF Q4_K_M, GPTQ, AWQ) for limited VRAM.

### "Connection refused" intermittently

Local servers can drop connections on idle. Configure keep-alive:

```bash
# vLLM
vllm serve ... --keep-alive-secs 300

# Ollama
OLLAMA_KEEP_ALIVE=5m ollama serve
```

---

## Security Considerations

### Local Servers

- **Bind to localhost only** (`127.0.0.1`) unless you trust the network
- Use a **firewall** to block external access
- If exposing, use a **reverse proxy with auth** (nginx, Caddy, Traefik)

### Remote Custom Providers

- Use **TLS** (`https://`) for all remote providers
- Store API keys in OmniRoute's **encrypted storage** (default)
- **Rotate** keys regularly
- Use **management scopes** to limit who can view/modify provider config

### Multi-Tenancy

If multiple users share an OmniRoute instance, use **per-API-key provider restrictions**:

```bash
# API key A can only use cloud providers
POST /api/keys
{ "name": "user-a", "allowedProviders": ["openai", "anthropic"] }

# API key B can only use local
POST /api/keys
{ "name": "user-b", "allowedProviders": ["my-local-llm"] }
```

---

## See Also

- [PROVIDER_REFERENCE.md](../reference/PROVIDER_REFERENCE.md) — all 177+ providers
- [PROVIDERS-GUIDE.md](../getting-started/PROVIDERS-GUIDE.md) — provider concepts
- [AUTO-COMBO.md](../routing/AUTO-COMBO.md) — routing strategies
- [COMPRESSION_GUIDE.md](../compression/COMPRESSION_GUIDE.md) — save tokens on local models
- [DEPLOYMENT_GUIDE.md](../ops/VM_DEPLOYMENT_GUIDE.md) — production deployment
- Source: `src/lib/providers/`, `open-sse/config/providerRegistry.ts`
