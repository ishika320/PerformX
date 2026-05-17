import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function makeStub(){
	const chain = {
		select(){ return chain },
		eq(){ return chain },
		order(){ return chain },
		limit(){ return chain },
		single: async ()=>({ data: null, error: null }),
		insert: async ()=>({ data: [], error: null }),
		update: async ()=>({ data: [], error: null }),
		delete: async ()=>({ data: [], error: null })
	}
	return {
		auth: {
			getUser: async ()=>({ data: { user: null } }),
			onAuthStateChange: ()=>({ data: { subscription: { unsubscribe: ()=>{} } } }),
			signInWithPassword: async ()=>({ error: { message: 'Supabase not configured' } }),
			signUp: async ()=>({ data: { user: null }, error: { message: 'Supabase not configured' } }),
			signOut: async ()=>({ error: null })
		},
		from: (_table)=> chain
	}
}

let supabase
if(!supabaseUrl || supabaseUrl === 'https://example.supabase.co'){
	console.warn('Supabase client not configured — using stub. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env')
	supabase = makeStub()
} else {
	supabase = createClient(supabaseUrl, supabaseKey)
}
export { supabase }
