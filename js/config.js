// Conexión pública compartida por la tienda y la administración.
const SUPABASE_URL = "https://qhhqiwhcbbnncnaonahc.supabase.co";

const SUPABASE_KEY = "sb_publishable_iasGk-jqhvZFQLiRTPacqw_zNXpKtbO";

const supabaseCliente = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
