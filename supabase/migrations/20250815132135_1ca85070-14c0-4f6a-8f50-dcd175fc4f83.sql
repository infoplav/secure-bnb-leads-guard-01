-- Create wallets table to store generated wallet phrases
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_phrase TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_commercial_id UUID,
  used_at TIMESTAMP WITH TIME ZONE,
  client_balance NUMERIC DEFAULT 0.00,
  client_tracking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet access
CREATE POLICY "Allow public access to manage wallets" 
ON public.wallets 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add foreign key reference to commercials table
ALTER TABLE public.wallets 
ADD CONSTRAINT fk_wallets_commercial 
FOREIGN KEY (used_by_commercial_id) 
REFERENCES public.commercials(id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 100 generated wallets with random phrases
INSERT INTO public.wallets (wallet_phrase) VALUES
('bright ocean wave crystal mountain forest ancient wisdom flowing energy'),
('golden sunset peaceful meadow dancing butterfly gentle breeze whispered secrets'),
('silver moon cosmic journey starlight adventure mysterious portal hidden treasure'),
('emerald forest magical creature rainbow bridge eternal harmony divine blessing'),
('crimson dawn warrior spirit noble quest infinite courage burning passion'),
('azure sky floating cloud gentle rain summer warmth growing flower'),
('violet storm thunder power lightning strike electric energy wild freedom'),
('amber glow ancient tree sacred grove mystical knowledge timeless truth'),
('ruby fire dragon heart fierce loyalty unbreakable bond eternal flame'),
('sapphire depth ocean wisdom flowing current endless journey peaceful harbor'),
('jade garden blooming lotus pure serenity inner peace enlightened mind'),
('onyx shadow secret path hidden door mysterious key ancient lock'),
('pearl white pristine beauty graceful swan elegant dance ethereal grace'),
('diamond light brilliant shine crystal clear perfect vision radiant truth'),
('copper coin merchant trade valuable exchange prosperous future golden opportunity'),
('iron strength mighty fortress protective shield unwavering defense solid foundation'),
('silk thread delicate weave intricate pattern beautiful tapestry artistic creation'),
('marble statue eternal beauty timeless art classical elegance refined culture'),
('bronze medal honored achievement worthy accomplishment celebrated victory glorious triumph'),
('platinum crown royal authority supreme power majestic rule divine blessing'),
('quartz crystal healing energy spiritual cleansing pure intention sacred ritual'),
('obsidian blade sharp edge cutting through powerful tool precise action'),
('granite mountain solid rock enduring strength immovable foundation lasting stability'),
('limestone cave hidden chamber secret passage underground river flowing waters'),
('sandstone desert endless dunes shifting sands burning sun survival journey'),
('coral reef underwater kingdom colorful life marine paradise tropical beauty'),
('bamboo forest swaying stems flexible strength natural wisdom growing harmony'),
('cedar wood aromatic scent protective barrier natural defense peaceful shelter'),
('maple leaf autumn colors changing seasons natural cycle eternal renewal'),
('willow tree graceful branches flowing movement gentle strength adaptive nature'),
('rose garden blooming petals sweet fragrance romantic love tender emotion'),
('lavender field purple waves calming scent peaceful sleep restful dreams'),
('mint leaf fresh taste cooling effect natural remedy healing properties'),
('sage wisdom ancient knowledge traditional healing spiritual cleansing protective ritual'),
('thyme herb aromatic cooking natural flavor culinary art kitchen magic'),
('basil plant sacred herb royal treatment noble cuisine elevated experience'),
('oregano spice mountain herb wild growth natural seasoning earthy flavor'),
('rosemary remembrance memorial tribute lasting memory eternal dedication loving honor'),
('parsley fresh garnish natural decoration culinary enhancement visual appeal taste'),
('cilantro bold flavor distinctive taste polarizing herb cultural cuisine authentic'),
('dill pickle tangy flavor preserved food traditional recipe family tradition'),
('chive onion delicate flavor mild taste garden fresh culinary delight'),
('tarragon french herb sophisticated flavor gourmet cooking refined palate cultured'),
('fennel seed licorice taste digestive aid natural remedy traditional medicine'),
('cumin spice earthy warm exotic flavor international cuisine cultural exchange'),
('paprika red powder smoky flavor hungarian tradition spicy heat warming'),
('turmeric golden spice healing power anti-inflammatory natural medicine ancient wisdom'),
('ginger root spicy heat digestive aid natural remedy warming comfort'),
('cinnamon bark sweet spice holiday flavor comfort food nostalgic memory'),
('nutmeg seed aromatic spice holiday baking traditional recipe family gathering'),
('cardamom pod exotic spice floral notes luxury ingredient premium quality'),
('clove bud warming spice dental care natural antiseptic traditional remedy'),
('allspice berry jamaican pepper complex flavor island tradition tropical paradise'),
('vanilla bean sweet extract dessert essential luxury ingredient premium baking'),
('chocolate cacao divine indulgence sweet pleasure guilty pleasure happiness moment'),
('coffee bean morning ritual energizing brew social gathering cultural tradition'),
('tea leaf afternoon ceremony peaceful moment meditation practice mindful drinking'),
('honey gold liquid natural sweetener bee product pure nature healing'),
('maple syrup tree sap pancake topping canadian tradition breakfast delight'),
('molasses dark syrup rich flavor traditional sweetener old-fashioned cooking ingredient'),
('agave nectar tequila plant natural sweetener desert survivor adaptive nature'),
('coconut palm tropical fruit island paradise exotic vacation dream destination'),
('pineapple fruit tropical taste sweet tangy flavor sunshine vitamin happiness'),
('mango fruit tropical paradise sweet flesh exotic taste summer freshness'),
('papaya fruit digestive enzyme tropical nutrition healthy eating natural wellness'),
('passion fruit exotic flavor intense taste tropical adventure culinary discovery'),
('dragon fruit vibrant color unique appearance exotic beauty natural art'),
('star fruit celestial shape tropical novelty conversation starter unique experience'),
('kiwi fruit fuzzy skin green flesh tangy sweet flavor vitamin packed'),
('pomegranate seed ruby red antioxidant superfood ancient fruit health benefit'),
('fig fruit ancient cultivation sweet flesh mediterranean tradition biblical reference'),
('date fruit desert oasis natural candy energy source traveler sustenance'),
('apricot fruit orange color delicate flavor summer harvest seasonal delight'),
('peach fruit fuzzy skin sweet juice summer perfection orchard fresh'),
('plum fruit purple skin sweet flesh tree ripened natural candy'),
('cherry fruit red jewel sweet burst summer celebration festive occasion'),
('grape fruit wine making ancient tradition cluster hanging vineyard harvest'),
('berry fruit wild harvest forest foraging natural gathering seasonal abundance'),
('strawberry fruit heart shape sweet romance summer love garden fresh'),
('raspberry fruit delicate structure complex flavor thorny bush forest treasure'),
('blackberry fruit wild growth summer picking childhood memory nature bounty'),
('blueberry fruit antioxidant power brain food healthy choice superfruit nutrition'),
('cranberry fruit tart flavor thanksgiving tradition bog harvest seasonal celebration'),
('elderberry fruit immune support natural remedy traditional medicine folk wisdom'),
('gooseberry fruit tart flavor garden cultivation traditional preserve making art'),
('currant fruit small size intense flavor garden shrub traditional cultivation'),
('raisin dried grape concentrated sweetness preserved fruit ancient food storage'),
('prune dried plum digestive health traditional remedy natural fiber source'),
('apricot dried preserved fruit concentrated nutrition travel food energy source'),
('banana fruit tropical staple potassium source natural energy quick nutrition'),
('apple fruit orchard classic crisp bite traditional cultivation global favorite'),
('pear fruit elegant shape delicate flavor autumn harvest seasonal delight'),
('orange fruit citrus sunshine vitamin natural immune support morning freshness'),
('lemon fruit citrus tang natural cleanser culinary essential kitchen staple'),
('lime fruit tropical citrus cocktail essential mexican cuisine flavor enhancer'),
('grapefruit fruit citrus bitter breakfast tradition diet food healthy choice'),
('tangerine fruit easy peel citrus convenience portable nutrition sweet treat'),
('mandarin fruit chinese citrus celebration fruit lucky symbol prosperity wish'),
('watermelon fruit summer cooling hydration picnic essential refreshing treat hot'),
('cantaloupe fruit orange flesh sweet aroma breakfast fruit healthy start'),
('honeydew fruit green flesh subtle sweetness breakfast addition gentle flavor'),
('casaba melon fruit unique variety exotic choice unusual selection conversation'),
('crenshaw melon fruit specialty variety gourmet choice refined palate sophisticated'),
('persian melon fruit aromatic variety sweet perfume distinctive character unique'),
('winter melon fruit storage vegetable mild flavor asian cuisine traditional'),
('bitter melon fruit medicinal vegetable blood sugar traditional chinese medicine'),
('cucumber fruit cooling vegetable spa treatment hydrating food beauty ingredient'),
('zucchini fruit summer squash garden abundance versatile cooking healthy choice'),
('yellow squash fruit summer vegetable garden staple versatile preparation mild');