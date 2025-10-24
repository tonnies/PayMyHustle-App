// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configure this properly for production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
  'Access-Control-Max-Age': '86400',
};

export function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}