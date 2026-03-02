const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { instance, token, payload, isFallback } = await req.json()

        if (!instance || !token || !payload) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: instance, token, or payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const domain = isFallback ? 'free.uazapi.com' : 'whatsapparteinovacao.uazapi.com'
        const url = `https://${domain}/send/text`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': token,
            },
            body: JSON.stringify(payload),
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
