const SUPABASE_URL = "https://prmcbpqlekqozqdtkpjf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m09pp02FNONdI8PWuadU3A_kxa6zvnC"; // New project publishable key

// Check if supabase is already loaded via CDN
if (typeof supabase === 'undefined') {
    console.error("Supabase library not found. Ensure the CDN script is included in index.html.");
}

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.aureusSupabase = {
    client: _supabase,

    // Auth Helpers
    async signUp(email, password, name) {
        const { data, error } = await _supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });
        if (error) throw error;

        // Create initial profile in public.profiles
        if (data.user) {
            await this.createProfile(data.user.id, name);
        }
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
    },

    // Profile Helpers
    async createProfile(id, name) {
        const { error } = await _supabase
            .from('profiles')
            .upsert({ id, name, updated_at: new Date() });
        if (error) console.error("Error creating profile:", error);
    },

    async getProfile(id) {
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data;
    }
};
