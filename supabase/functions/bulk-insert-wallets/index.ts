import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting bulk wallet insert...');

    const walletPhrases = [
      "abandon input raise piano canoe short ship green slender solar blossom firm",
      "abandon muffin crisp food issue educate virus blind brief scout tired hybrid",
      "above couch trigger ability exhibit phrase giraffe nephew leader inmate harsh brush",
      "acid ripple raise club dish filter vendor calm bless grass angry catch",
      "again great what labor uniform giraffe during fashion glad keep cruise strong",
      "again sketch grief rib pole half where leaf return mind service purpose",
      "agree figure anger pole between top clutch turkey team property fury stable",
      "amount kick where speed clip junk easy fit fluid silk split garage",
      "anxiety dad tourist short sadness oak envelope under stairs off true vibrant",
      "area shove bounce measure antique sell inch prevent forward refuse reward ribbon",
      "artist release myth battle shift aunt grace scheme post state already luggage",
      "assault lamp fragile pepper uncover charge prize camera stairs parrot prefer admit",
      "atom guide super torch caution artist arena spike cancel flush comic hobby",
      "book knock collect hood wrist lesson manage stomach prize trash toddler detect",
      "boss asset silent way cook armed stock above pistol park achieve picnic",
      "bread used census response donor rotate print medal always yard capital tuition",
      "broccoli cash major before empower draw supreme capable old pupil swear place",
      "churn egg anxiety defense spread order equip chunk neck grunt divorce pledge",
      "clerk nest gaze clump seek lake find tenant accident coral term poem",
      "coral dinner wreck general spend orchard leisure debate issue require cry leaf",
      "coral seed spend armed angry grace want direct useless breeze hope traffic",
      "corn guide execute voice page forget life inflict razor vessel cruel cigar",
      "country useful steel lake wet portion possible liquid theory chuckle someone radar",
      "cover lemon shoe double phrase acid essay canoe squirrel easily width slow",
      "crack disorder tissue lady view lesson upon erode timber interest lawsuit stage",
      "crisp nothing brush vendor romance layer bind fiction remove concert depart animal",
      "current hair story cliff silk isolate coil party tent satisfy image urge",
      "design race common brain find goat video horn bundle anger cheap tail",
      "develop mystery interest party upon hero sponsor female fatigue shy possible energy",
      "dutch brave treat stem marble today age inflict blush coral monitor fence",
      "dwarf federal skirt cushion card feature lock below option trend congress grant",
      "emotion arm brave february polar staff muffin sign genius advice maze movie",
      "express approve siege figure faculty alert act slab neglect animal coast muscle",
      "file catalog public blast vendor draw renew marine asthma amused inmate call",
      "film van crawl crazy round pottery river total oak maze payment tornado",
      "forest result keen magic whip neck foam about prepare recall swallow snack",
      "gaze blade armed equal evolve inflict derive there grief intact verify year",
      "glad direct toilet violin tissue image myth clump supreme maple rescue index",
      "glory conduct answer carry prefer omit silent north gap face brush village",
      "grace ivory chronic pact wonder wealth armed mixture guess vocal only february",
      "grief mention chef swarm yard example scrap all supreme isolate extend prison",
      "hill plunge worry rigid ask step glass hood confirm short upset sight",
      "increase husband company until admit income defy law outside picture achieve journey",
      "infant matter inner bullet relief void swarm robot body process quiz place",
      "keen genius furnace round sleep case nasty faculty excuse slogan over weird",
      "kit random nothing tomato actor goat first law seminar artwork hope pause",
      "lesson tribe try gravity cruise regular dial insect afraid release wife lake",
      "license engine float bottom crumble love below moral cliff donor pool legend",
      "load observe case story hazard popular eye balance ugly beyond anxiety throw",
      "loan village rifle owner help people matrix grant enlist brand shoulder frozen",
      "magnet gorilla meadow same process radar mushroom acoustic sunny reopen figure carry",
      "middle scout decline near puppy mask ready also truly fury capital sign",
      "mirror you case horn lake laugh already organ toe viable width eyebrow",
      "moral cool daring mix assist cargo utility gown course quiz usage version",
      "morning submit call green shop base page ask zone bind because tower",
      "news bridge attract frozen security dynamic private chimney client square immune neglect",
      "pilot syrup beyond diary betray chicken dog gesture breeze smart plastic neutral",
      "polar rival slab state task flavor ten brown few dose permit lake",
      "possible man copy oak below portion noodle grain lift ball divert equal",
      "prize vast voyage remain skin other flee antenna possible stay clay border",
      "purchase ice choose prize man expand bridge design aspect mandate spoon unveil",
      "put duck entire attend impose morning must raccoon grape key stairs scare",
      "quick stay garment donate survey dinosaur title width victory luxury style point",
      "quick teach satoshi spot wait window submit budget twenty bind parrot unaware",
      "rare hurdle differ satoshi guide expose slogan leisure possible black pelican circle",
      "rebel combine appear empower boil two clip finger february summer own wish",
      "rely tell sponsor rebel clump fox lumber desk attract priority document disorder",
      "remain parent notable spell element enact artist indoor wolf shoot blossom opera",
      "rescue minor street seed wagon cancel shell pink outer napkin pond stomach",
      "retreat rent series danger kitchen wolf manage silly catch mansion horse post",
      "reunion toast arrange sudden bunker anger bone lab example champion cream credit",
      "rifle capable child promote visit bag involve prepare second fish nice banner",
      "rival salmon stumble among step wasp negative worth proof illness ridge fit",
      "route into green next meat major mind check merry color actress merge",
      "sad soldier choice display thumb fox satisfy cluster curtain caught print veteran",
      "salmon surprise alley birth ready clinic faint jaguar clinic glance seek divide",
      "scatter praise report camp appear share math laugh pluck tool nasty desk",
      "science inquiry spread cable erosion pink fence cry educate hollow axis gloom",
      "scissors weekend paddle dragon lab great rescue expose fat joy flower antique",
      "security april tobacco frown execute puppy save swallow lazy crucial occur grief",
      "shallow hawk dizzy royal merit broken file nothing sport meat trip loud",
      "ship aerobic index gloom border vehicle wide shove clean card armor quit",
      "snap vicious drop sniff call pill castle finish harbor hover repeat submit",
      "soldier symbol fire clinic enhance play eye gadget mosquito layer protect expire",
      "sound pipe mesh crew orient glass promote office brand broom behave hundred",
      "stomach extend future fish crunch bacon duty police tower assault mercy immune",
      "stumble absorb sugar auto great noodle elbow myself hat inherit raw anger",
      "tape load ketchup inch remember pet announce december east spoil reform excite",
      "thank venture salute seat require enable spread burden dinner loud loud video",
      "thumb dose genuine make sausage inner autumn elbow thing truck worry stock",
      "tonight draw cherry nothing raise source dignity man fine broom parrot visit",
      "trash very pencil diary pioneer garage glove aerobic melody suit regret donor",
      "tunnel great coconut beach please prevent square reduce eye original head hammer",
      "unfair fluid unable ice peasant truth rhythm season apology frown effort subject",
      "uniform cheese peasant notice chair joke giggle crouch argue trade sunset kangaroo",
      "uniform suggest ensure jacket repeat waste swim loan chimney suffer transfer congress",
      "vendor vicious lucky mind august liquid cereal replace one then ugly question",
      "win adapt gaze meadow analyst jelly kite announce habit sword fence wet",
      "winner rhythm aim ozone begin tail century kiss advance produce cinnamon alert",
      "work fence nephew corn chapter enlist pill caught siege produce way oven"
    ];

    // Prepare wallet data for insertion
    const walletsToInsert = walletPhrases.map(phrase => ({
      wallet_phrase: phrase,
      is_used: false,
      used_by_commercial_id: null,
      used_at: null,
      client_balance: 0.00,
      client_tracking_id: null,
      last_balance_check: null,
      monitoring_active: true
    }));

    console.log(`Prepared ${walletsToInsert.length} wallets for insertion`);

    // Insert wallets in batches of 50 to avoid any potential limits
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < walletsToInsert.length; i += batchSize) {
      batches.push(walletsToInsert.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Inserting batch ${i + 1}/${batches.length} with ${batch.length} wallets`);
      
      const { data, error } = await supabase
        .from('wallets')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch ${i + 1}:`, error);
        throw error;
      }

      totalInserted += data?.length || 0;
      console.log(`Successfully inserted batch ${i + 1}, total so far: ${totalInserted}`);
    }

    console.log(`Successfully inserted all ${totalInserted} wallets`);

    return new Response(
      JSON.stringify({ 
        message: `Successfully inserted ${totalInserted} wallets`,
        inserted_count: totalInserted
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in bulk-insert-wallets function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});