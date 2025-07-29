import createClient from 'openapi-fetch'

import type { paths } from '@/lib/backend/apiV1/schema'

const baseUrl = process.env.NEXT_PUBLIC_API_URL

const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
})

export default client
