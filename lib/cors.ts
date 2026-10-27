export const PAGES_ORIGIN='https://matheusrodrigo519.github.io';
export function cors(req:Request,response:Response){if(req.headers.get('origin')===PAGES_ORIGIN){response.headers.set('Access-Control-Allow-Origin',PAGES_ORIGIN);response.headers.set('Vary','Origin');response.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');response.headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');}return response;}
export function preflight(req:Request){return cors(req,new Response(null,{status:req.headers.get('origin')===PAGES_ORIGIN?204:403}));}
