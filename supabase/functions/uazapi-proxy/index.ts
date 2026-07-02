const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ENDPOINTS: Record<string, 'GET' | 'POST'> = {
    '/send/text': 'POST',
    '/instance/connect': 'POST',
    '/instance/status': 'GET',
    '/instance/disconnect': 'POST',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { instance, token, payload, endpoint, isFallback } = await req.json()

        if (!instance || !token) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: instance or token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const targetEndpoint = endpoint || '/send/text'
        const method = ALLOWED_ENDPOINTS[targetEndpoint]

        if (!method) {
            return new Response(
                JSON.stringify({ error: `Endpoint not allowed: ${targetEndpoint}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (targetEndpoint === '/send/text' && !payload) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const domain = isFallback ? 'free.uazapi.com' : 'whatsapparteinovacao.uazapi.com'
        const url = `https://${domain}${targetEndpoint}`

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'token': token,
            },
            body: method === 'GET' ? undefined : JSON.stringify(payload || {}),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: data?.error || response.statusText, status: response.status }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
            )
        }

        return new Response(
            JSON.stringify(data || { success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
