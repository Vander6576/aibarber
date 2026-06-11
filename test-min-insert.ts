import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vvlhvkxjanpjxjeefzar.supabase.co";
const supabaseAnonKey = "sb_publishable_GvfKCwqiSh6r22s7BDvenQ_JfQ043_u";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMinInsert() {
  console.log("Simulating minimal insert in bookings (without barber_name)...");
  
  const barberUserId = "4950bedd-e16d-41f2-9545-181d5cdb5ce7";
  const payload = {
    id: "test-booking-min-" + Date.now(),
    user_id: barberUserId,
    client_name: "Cliente de Teste Min",
    client_whatsapp: "21956588596",
    service_id: "serv-1",
    service_name: "Corte de Cabelo",
    service_price: 35.0,
    date: "2026-06-12",
    time: "14:30",
    status: "agendado"
  };

  const { data, error } = await supabase.from('bookings').insert([payload]).select();
  if (error) {
    console.error("Error inserting minimal booking:", error);
  } else {
    console.log("Successfully inserted minimal booking:", JSON.stringify(data, null, 2));
    
    // Deleta para limpar
    await supabase.from('bookings').delete().eq('id', payload.id);
  }
}

checkMinInsert();
