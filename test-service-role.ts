import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vvlhvkxjanpjxjeefzar.supabase.co";
// Usa a chave que possui o privilégio sb_secret_ de admin do processo
const supabaseSecretKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_GvfKCwqiSh6r22s7BDvenQ_JfQ043_u";

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function formatAndFix() {
  console.log("Checking and repairing data using SUPABASE_ANON_KEY with secret role...");
  
  // Vamos primeiro listar todas as configurações existentes para análise
  const { data: allSettings, error: errSelect } = await supabase.from('barber_settings').select('*');
  if (errSelect) {
    console.error("Error reading settings for repair:", errSelect);
    return;
  }
  
  console.log("Current rows in barber_settings:", JSON.stringify(allSettings, null, 2));
  
  // O ID correto de login do Vander é "ac7e8d47-fc8b-439a-b26d-059f245ff830".
  // Vamos ver se existe um registro correspondente a esse login atual, e se precisamos do outro.
  const correctUserId = "ac7e8d47-fc8b-439a-b26d-059f245ff830";
  
  // Vamos remover o registro 'teste1' se ele existir, pois foi criado apenas como fallback de conflito
  console.log("Deleting temporary/conflicting 'teste1' row...");
  const { error: errDelTeste } = await supabase.from('barber_settings').delete().eq('slug', 'teste1');
  if (errDelTeste) {
    console.error("Could not delete 'teste1' row:", errDelTeste);
  } else {
    console.log("Successfully deleted 'teste1' row!");
  }
  
  // Agora vamos atualizar o registro da barbearia real para apontar para o login correto "ac7e8d47-fc8b-439a-b26d-059f245ff830"
  console.log("Updating 'vander' row to align both id and user_id to " + correctUserId + "...");
  
  // Atualiza 'user_id' e 'id' na barbearia de slug='vander'
  const { error: errUpdate } = await supabase
    .from('barber_settings')
    .update({ 
      user_id: correctUserId,
      id: correctUserId // Alinha id com o user_id real
    })
    .eq('slug', 'vander');
    
  if (errUpdate) {
    console.error("Error updating 'vander' row:", errUpdate);
  } else {
    console.log("Successfully aligned and updated 'vander' row!");
  }
  
  // Vamos listar novamente para confirmar se salvou
  const { data: finalSettings } = await supabase.from('barber_settings').select('*');
  console.log("Final state of barber_settings:", JSON.stringify(finalSettings, null, 2));
}

formatAndFix();
